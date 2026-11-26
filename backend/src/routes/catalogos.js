// CRUD simple reutilizable para las tablas "categoria" y "proveedor"
const express = require('express');
const db = require('../db');
const { verificarToken, soloAdmin, idValido } = require('../middleware/auth');

// Nombre repetido (ej. dos categorías iguales) -> 409 en lugar de 500
function errorGuardar(e, res) {
  if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe un registro con ese nombre' });
  console.error(e);
  return res.status(500).json({ error: 'Error del servidor' });
}

function crearRouter({ tabla, campos, lecturaPublica }) {
  const router = express.Router();
  const permisosLectura = lecturaPublica ? [] : [verificarToken, soloAdmin];
  const obligatorio = campos[0]; // el primer campo (nombre) es obligatorio

  // Cada campo debe ser texto y no demasiado largo (evita tipos raros que rompen la consulta)
  const errorCampos = (body) => {
    if (typeof body[obligatorio] !== 'string' || !body[obligatorio].trim()) return `El campo ${obligatorio} es obligatorio`;
    for (const c of campos) {
      if (body[c] != null && (typeof body[c] !== 'string' || body[c].length > 150)) return `El campo ${c} no es válido`;
    }
    return null;
  };
  const valores = (body) => campos.map((c) => (typeof body[c] === 'string' && body[c].trim() ? body[c].trim() : null));
  const publico = (body) => Object.fromEntries(campos.map((c) => [c, body[c]]));

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
    const err = errorCampos(req.body);
    if (err) return res.status(400).json({ error: err });
    try {
      const [r] = await db.query(
        `INSERT INTO ${tabla} (${campos.join(', ')}) VALUES (${campos.map(() => '?').join(', ')})`,
        valores(req.body)
      );
      res.status(201).json({ id: r.insertId, ...publico(req.body) });
    } catch (e) {
      errorGuardar(e, res);
    }
  });

  router.put('/:id', verificarToken, soloAdmin, idValido, async (req, res) => {
    const err = errorCampos(req.body);
    if (err) return res.status(400).json({ error: err });
    try {
      const [r] = await db.query(
        `UPDATE ${tabla} SET ${campos.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
        [...valores(req.body), req.params.id]
      );
      if (r.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
      res.json({ id: Number(req.params.id), ...publico(req.body) });
    } catch (e) {
      errorGuardar(e, res);
    }
  });

  router.delete('/:id', verificarToken, soloAdmin, idValido, async (req, res) => {
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
