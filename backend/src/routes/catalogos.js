// CRUD reutilizable para las tablas "categoria" y "proveedor"
const express = require('express');
const db = require('../db');
const { verificarToken, soloAdmin, idValido, ErrorHttp } = require('../auth');

function crearRouter({ tabla, campos, lecturaPublica, enUso, orden }) {
  const router = express.Router();
  const permisosLectura = lecturaPublica ? [] : [verificarToken, soloAdmin];

  // Toma solo los campos permitidos; el primero (nombre) es obligatorio
  function leer(body) {
    const valores = campos.map(([campo, max]) => {
      const v = typeof body[campo] === 'string' ? body[campo].trim() : '';
      if (v.length > max) throw new ErrorHttp(400, `El campo ${campo} admite hasta ${max} caracteres`);
      if (campo === 'imagen' && v && !/^(https:\/\/\S+|\/imagenes\/[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*\.(png|jpe?g|webp|gif|avif|svg))$/.test(v)) throw new ErrorHttp(400, 'La imagen debe ser un link https:// o un archivo de la carpeta /imagenes/ (ej: /imagenes/productos/charizard.png)');
      return v || null;
    });
    if (!valores[0]) throw new ErrorHttp(400, `El campo ${campos[0][0]} es obligatorio`);
    return valores;
  }
  const nombres = campos.map(([c]) => c);

  router.get('/', ...permisosLectura, async (req, res) => {
    const { rows } = await db.query(`SELECT * FROM ${tabla} ORDER BY ${orden}`);
    res.json(rows);
  });

  router.post('/', verificarToken, soloAdmin, async (req, res) => {
    const valores = leer(req.body);
    const { rows } = await db.query(
      `INSERT INTO ${tabla} (${nombres.join(', ')}) VALUES (${nombres.map((_, i) => '$' + (i + 1)).join(', ')}) RETURNING *`,
      valores
    );
    res.status(201).json(rows[0]);
  });

  router.put('/:id', verificarToken, soloAdmin, async (req, res) => {
    const valores = leer(req.body);
    const { rows } = await db.query(
      `UPDATE ${tabla} SET ${nombres.map((c, i) => `${c} = $${i + 1}`).join(', ')} WHERE id = $${nombres.length + 1} RETURNING *`,
      [...valores, idValido(req.params.id)]
    );
    if (!rows[0]) throw new ErrorHttp(404, 'No encontrado');
    res.json(rows[0]);
  });

  router.delete('/:id', verificarToken, soloAdmin, async (req, res) => {
    try {
      const { rowCount } = await db.query(`DELETE FROM ${tabla} WHERE id = $1`, [idValido(req.params.id)]);
      if (!rowCount) throw new ErrorHttp(404, 'No encontrado');
      res.json({ mensaje: 'Eliminado' });
    } catch (e) {
      if (e.code === '23503') throw new ErrorHttp(409, enUso);
      throw e;
    }
  });

  return router;
}

module.exports = {
  categorias: crearRouter({
    tabla: 'categoria', campos: [['nombre', 80], ['imagen', 500]], lecturaPublica: true, orden: 'id',
    enUso: 'No se puede eliminar: la categoría tiene productos',
  }),
  proveedores: crearRouter({
    tabla: 'proveedor', campos: [['nombre', 100], ['contacto', 150]], lecturaPublica: false, orden: 'nombre',
    enUso: 'No se puede eliminar el proveedor',
  }),
};
