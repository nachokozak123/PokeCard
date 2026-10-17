// CRUD simple reutilizable para las tablas "categoria" y "proveedor"
const express = require('express');
const db = require('../db');
const { verificarToken, soloAdmin } = require('../middleware/auth');

function crearRouter({ tabla, campos, lecturaPublica }) {
  const router = express.Router();
  const permisosLectura = lecturaPublica ? [] : [verificarToken, soloAdmin];
  const obligatorio = campos[0]; // el primer campo (nombre) es obligatorio

  router.get('/', ...permisosLectura, async (req, res) => {
    try {
      const [rows] = await db.query(`SELECT * FROM ${tabla} ORDER BY nombre`);
      res.json(rows);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error del servidor' });
    }
  });

  router.post('/', verificarToken, soloAdmin, async (req, res) => {
    if (!req.body[obligatorio]) return res.status(400).json({ error: `El campo ${obligatorio} es obligatorio` });
    try {
      const [r] = await db.query(
        `INSERT INTO ${tabla} (${campos.join(', ')}) VALUES (${campos.map(() => '?').join(', ')})`,
        campos.map((c) => req.body[c] || null)
      );
      res.status(201).json({ id: r.insertId, ...req.body });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error del servidor' });
    }
  });

  router.put('/:id', verificarToken, soloAdmin, async (req, res) => {
    if (!req.body[obligatorio]) return res.status(400).json({ error: `El campo ${obligatorio} es obligatorio` });
    try {
      const [r] = await db.query(
        `UPDATE ${tabla} SET ${campos.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
        [...campos.map((c) => req.body[c] || null), req.params.id]
      );
      if (r.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
      res.json({ id: Number(req.params.id), ...req.body });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error del servidor' });
    }
  });

  router.delete('/:id', verificarToken, soloAdmin, async (req, res) => {
    try {
      const [r] = await db.query(`DELETE FROM ${tabla} WHERE id = ?`, [req.params.id]);
      if (r.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
      res.json({ mensaje: 'Eliminado' });
    } catch (e) {
      if (e.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(409).json({ error: 'No se puede eliminar: tiene productos asociados' });
      }
      console.error(e);
      res.status(500).json({ error: 'Error del servidor' });
    }
  });

  return router;
}

module.exports = {
  categorias: crearRouter({ tabla: 'categoria', campos: ['nombre'], lecturaPublica: true }),
  proveedores: crearRouter({ tabla: 'proveedor', campos: ['nombre', 'contacto'], lecturaPublica: false }),
};
