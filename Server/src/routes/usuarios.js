const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// POST /usuarios/registro
router.post('/registro', async (req, res) => {
  try {
    const { nombre, apellido, email, password } = req.body;

    if (!nombre || !apellido || !email || !password) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const [existente] = await pool.query('SELECT id FROM usuario WHERE email = ?', [email]);
    if (existente.length > 0) {
      return res.status(409).json({ error: 'Ese email ya esta registrado' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const [resultado] = await pool.query(
      'INSERT INTO usuario (nombre, apellido, email, password_hash) VALUES (?, ?, ?, ?)',
      [nombre, apellido, email, password_hash]
    );

    res.status(201).json({ id: resultado.insertId, nombre, apellido, email });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar el usuario' });
  }
});

// POST /usuarios/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const [rows] = await pool.query('SELECT * FROM usuario WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const usuario = rows[0];
    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al iniciar sesion' });
  }
});

module.exports = router;
