const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { iniciarSesion, cerrarSesion, verificarToken, soloAdmin, tieneSesion, ErrorHttp } = require('../auth');

const router = express.Router();
const RONDAS_BCRYPT = 12;
const MAX_INTENTOS = 5;          // intentos fallidos antes de bloquear la cuenta
const MINUTOS_BLOQUEO = 15;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Hash falso: si el email no existe igual se compara, así la respuesta tarda lo mismo
// y no se puede averiguar qué emails están registrados midiendo el tiempo.
const HASH_FALSO = bcrypt.hashSync('pokecard-hash-falso', RONDAS_BCRYPT);

const texto = (v) => (typeof v === 'string' ? v.trim() : '');
const publico = (u) => ({ id: u.id, nombre: u.nombre, email: u.email, rol: u.rol });

function validarRegistro({ nombre, email, password }) {
  if (nombre.length < 2 || nombre.length > 100) return 'El nombre debe tener entre 2 y 100 caracteres';
  if (!EMAIL_RE.test(email) || email.length > 150) return 'El email no es válido';
  if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
    return 'La contraseña debe tener entre 8 y 72 caracteres';
  }
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return 'La contraseña debe tener letras y números';
  return null;
}

// POST /api/usuarios/registro -> crea la cuenta (siempre como cliente) e inicia sesión
router.post('/registro', async (req, res) => {
  const datos = { nombre: texto(req.body.nombre), email: texto(req.body.email).toLowerCase(), password: req.body.password };
  const error = validarRegistro(datos);
  if (error) throw new ErrorHttp(400, error);

  const hash = await bcrypt.hash(datos.password, RONDAS_BCRYPT); // nunca se guarda la contraseña
  const { rows } = await db.query(
    `INSERT INTO usuario (nombre, email, contrasena_hash) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING RETURNING id, nombre, email, rol`,
    [datos.nombre, datos.email, hash] // el rol NO se toma del cuerpo: siempre es 'cliente'
  );
  if (!rows[0]) throw new ErrorHttp(409, 'Ya existe una cuenta con ese email');
  iniciarSesion(res, rows[0]);
  res.status(201).json(publico(rows[0]));
});

// POST /api/usuarios/login
router.post('/login', async (req, res) => {
  const email = texto(req.body.email).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!email || !password) throw new ErrorHttp(400, 'Email y contraseña son obligatorios');

  const { rows } = await db.query(
    'SELECT id, nombre, email, rol, contrasena_hash, bloqueado_hasta FROM usuario WHERE email = $1',
    [email]
  );
  const u = rows[0];
  if (u?.bloqueado_hasta && u.bloqueado_hasta > new Date()) {
    throw new ErrorHttp(429, `Cuenta bloqueada por demasiados intentos. Probá en ${MINUTOS_BLOQUEO} minutos.`);
  }

  const correcta = await bcrypt.compare(password.slice(0, 72), u ? u.contrasena_hash : HASH_FALSO);
  if (!u || !correcta) {
    if (u) {
      // Suma un intento; al llegar al máximo bloquea la cuenta (queda guardado en la base)
      await db.query(
        `UPDATE usuario SET
           intentos_fallidos = CASE WHEN intentos_fallidos + 1 >= $2 THEN 0 ELSE intentos_fallidos + 1 END,
           bloqueado_hasta   = CASE WHEN intentos_fallidos + 1 >= $2 THEN now() + make_interval(mins => $3) END
         WHERE id = $1`,
        [u.id, MAX_INTENTOS, MINUTOS_BLOQUEO]
      );
    }
    throw new ErrorHttp(401, 'Email o contraseña incorrectos'); // mismo mensaje en los dos casos
  }

  await db.query('UPDATE usuario SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = $1', [u.id]);
  iniciarSesion(res, u);
  res.json(publico(u));
});

// POST /api/usuarios/logout
router.post('/logout', (req, res) => {
  cerrarSesion(res);
  res.json({ mensaje: 'Sesión cerrada' });
});

// GET /api/usuarios/yo -> usuario de la sesión actual, o null si no hay sesión
// (el frontend lo consulta al cargar la página para saber si ya estaba logueado)
router.get('/yo', async (req, res) => {
  if (!tieneSesion(req)) return res.json(null);
  await verificarToken(req, res, () => res.json(req.usuario));
});

// GET /api/usuarios -> listado para el admin (nunca devuelve el hash)
router.get('/', verificarToken, soloAdmin, async (req, res) => {
  const { rows } = await db.query('SELECT id, nombre, email, rol, creado_en FROM usuario ORDER BY creado_en DESC');
  res.json(rows);
});

module.exports = router;
