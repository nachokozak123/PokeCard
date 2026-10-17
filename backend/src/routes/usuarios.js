const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { verificarToken, soloAdmin } = require('../middleware/auth');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALT_ROUNDS = 10;

// POST /usuarios/registro  -> crea un usuario siempre con rol "cliente"
router.post('/registro', async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios' });
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
    const [rows] = await db.query(
      'SELECT id, nombre, email, contrasena_hash, rol FROM usuario WHERE email = ?',
      [email.trim().toLowerCase()]
    );
    const u = rows[0];
    // Mismo mensaje si no existe el email o si la contraseña es incorrecta
    if (!u || !(await bcrypt.compare(password, u.contrasena_hash))) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
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
