const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { verificarToken, soloAdmin } = require('../middleware/auth');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALT_ROUNDS = 10;

// Freno contra fuerza bruta: 5 intentos fallidos por email cada 15 minutos
const MAX_INTENTOS = 5;
const VENTANA_MS = 15 * 60 * 1000;
const intentosFallidos = new Map(); // email -> { cantidad, desde }

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
router.post('/registro', async (req, res) => {
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
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const emailNorm = email.trim().toLowerCase();
    const [existe] = await db.query('SELECT id FROM usuario WHERE email = ?', [emailNorm]);
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
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /usuarios/login  -> devuelve un token JWT
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }
    const emailNorm = String(email).trim().toLowerCase();
    if (bloqueado(emailNorm)) {
      return res.status(429).json({ error: 'Demasiados intentos fallidos. Probá de nuevo en 15 minutos.' });
    }
    const [rows] = await db.query(
      'SELECT id, nombre, email, contrasena_hash, rol FROM usuario WHERE email = ?',
      [emailNorm]
    );
    const u = rows[0];
    // Mismo mensaje si no existe el email o si la contraseña es incorrecta
    if (!u || !(await bcrypt.compare(String(password), u.contrasena_hash))) {
      sumarFallo(emailNorm);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    intentosFallidos.delete(emailNorm);
    const token = jwt.sign({ id: u.id, nombre: u.nombre, rol: u.rol }, process.env.JWT_SECRET, {
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
