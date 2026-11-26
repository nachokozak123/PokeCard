const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { verificarToken, soloAdmin, limitar } = require('../middleware/auth');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALT_ROUNDS = 12;
// bcrypt solo mira los primeros 72 bytes: se limita para que nadie crea tener más seguridad de la real
const PASSWORD_MAX = 72;
// Hash falso para gastar el mismo tiempo cuando el email no existe (evita saber qué cuentas existen por el tiempo de respuesta)
const HASH_FALSO = bcrypt.hashSync('contrasena-falsa-para-igualar-tiempos', SALT_ROUNDS);

const limiteLogin = limitar({ minutos: 15, max: 20, mensaje: 'Demasiados intentos. Probá de nuevo en 15 minutos.' });
const limiteRegistro = limitar({ minutos: 60, max: 10, mensaje: 'Demasiados registros desde esta conexión. Probá más tarde.' });

// Mínimo 8 caracteres, con al menos una letra y un número
function errorPassword(p) {
  if (p.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
  if (p.length > PASSWORD_MAX) return `La contraseña no puede superar los ${PASSWORD_MAX} caracteres`;
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return 'La contraseña debe incluir letras y números';
  return null;
}

// Freno contra fuerza bruta: 5 intentos fallidos por email cada 15 minutos
const MAX_INTENTOS = 5;
const VENTANA_MS = 15 * 60 * 1000;
// La clave incluye la IP: así un atacante no puede bloquear la cuenta de otra persona desde otra conexión
const intentosFallidos = new Map(); // "ip|email" -> { cantidad, desde }
setInterval(() => { // limpia entradas viejas para que el Map no crezca sin límite
  const ahora = Date.now();
  for (const [k, v] of intentosFallidos) if (ahora - v.desde > VENTANA_MS) intentosFallidos.delete(k);
}, 10 * 60 * 1000).unref();

function bloqueado(email) {
  const r = intentosFallidos.get(email);
  if (!r) return false;
  if (Date.now() - r.desde > VENTANA_MS) { intentosFallidos.delete(email); return false; }
  return r.cantidad >= MAX_INTENTOS;
}

function sumarFallo(email) {
  const r = intentosFallidos.get(email);
  if (!r || Date.now() - r.desde > VENTANA_MS) intentosFallidos.set(email, { cantidad: 1, desde: Date.now() });
  else r.cantidad++;
}

// POST /usuarios/registro  -> crea un usuario siempre con rol "cliente"
router.post('/registro', limiteRegistro, async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios' });
    }
    if (typeof nombre !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Los datos enviados no son válidos' });
    }
    if (nombre.trim().length > 100 || email.length > 150) {
      return res.status(400).json({ error: 'El nombre o el email son demasiado largos' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'El email no es válido' });
    }
    const errPass = errorPassword(password);
    if (errPass) return res.status(400).json({ error: errPass });

    const emailNorm = email.trim().toLowerCase();
    const [existe] = await db.query('SELECT id FROM usuario WHERE lower(email) = ?', [emailNorm]);
    if (existe.length > 0) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });
    }

    // La contraseña nunca se guarda en texto plano: se guarda su hash (bcrypt)
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const [r] = await db.query(
      'INSERT INTO usuario (nombre, email, contrasena_hash, rol) VALUES (?, ?, ?, ?)',
      [nombre.trim(), emailNorm, hash, 'cliente'] // el rol NO se toma del body
    );
    res.status(201).json({ id: r.insertId, nombre: nombre.trim(), email: emailNorm, rol: 'cliente' });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /usuarios/login  -> devuelve un token JWT
router.post('/login', limiteLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }
    if (typeof email !== 'string' || typeof password !== 'string' || password.length > 200) {
      return res.status(400).json({ error: 'Los datos enviados no son válidos' });
    }
    const emailNorm = email.trim().toLowerCase();
    const clave = `${req.ip}|${emailNorm}`;
    if (bloqueado(clave)) {
      return res.status(429).json({ error: 'Demasiados intentos fallidos. Probá de nuevo en 15 minutos.' });
    }
    const [rows] = await db.query(
      'SELECT id, nombre, email, contrasena_hash, rol, activo FROM usuario WHERE lower(email) = ?',
      [emailNorm]
    );
    const u = rows[0];
    // Se compara siempre (aunque el email no exista) para que el tiempo de respuesta no delate cuentas
    const passOk = await bcrypt.compare(password, u ? u.contrasena_hash : HASH_FALSO);
    // Mismo mensaje si no existe el email, si la contraseña es incorrecta o si la cuenta está desactivada
    if (!u || !passOk || u.activo === false) {
      sumarFallo(clave);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    intentosFallidos.delete(clave);
    const token = jwt.sign({ id: u.id, nombre: u.nombre, rol: u.rol }, process.env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: process.env.JWT_EXPIRES || '2h',
    });
    res.json({ token, usuario: { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /usuarios  -> listado (solo admin). Nunca devuelve el hash.
router.get('/', verificarToken, soloAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nombre, email, rol, creado_en FROM usuario ORDER BY creado_en DESC'
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
