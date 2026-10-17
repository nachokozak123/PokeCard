const express = require('express');
const db = require('../db');
const { verificarToken, soloAdmin } = require('../middleware/auth');

const router = express.Router();

const SELECT_PRODUCTO = `
  SELECT p.id, p.nombre, p.descripcion, p.precio, p.stock, p.coleccion, p.rareza, p.imagen,
         p.categoria_id, p.proveedor_id, c.nombre AS categoria, pr.nombre AS proveedor
  FROM producto p
  LEFT JOIN categoria c ON c.id = p.categoria_id
  LEFT JOIN proveedor pr ON pr.id = p.proveedor_id`;

const ORDENES = {
  precio_asc: 'p.precio ASC',
  precio_desc: 'p.precio DESC',
  nombre: 'p.nombre ASC',
};

// Valida el cuerpo de un producto. Devuelve un mensaje de error o null si está OK.
function validarProducto(b) {
  if (!b.nombre || !String(b.nombre).trim()) return 'El nombre es obligatorio';
  const precio = Number(b.precio);
  if (b.precio === undefined || b.precio === '' || Number.isNaN(precio) || precio < 0) {
    return 'El precio debe ser un número mayor o igual a 0';
  }
  const stock = Number(b.stock);
  if (b.stock === undefined || b.stock === '' || !Number.isInteger(stock) || stock < 0) {
    return 'El stock debe ser un número entero mayor o igual a 0';
  }
  if (!b.categoria_id) return 'La categoría es obligatoria';
  return null;
}

function datosProducto(b) {
  return [
    String(b.nombre).trim(), b.descripcion || null, Number(b.precio), Number(b.stock),
    b.coleccion || null, b.rareza || null, b.imagen || null,
    b.categoria_id, b.proveedor_id || null,
  ];
}

function errorBD(e, res) {
  if (e.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ error: 'La categoría o el proveedor no existe' });
  }
  if (e.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ error: 'No se puede eliminar: el producto tiene pedidos asociados' });
  }
  console.error(e);
  return res.status(500).json({ error: 'Error del servidor' });
}

// GET /productos?categoria=1,2&coleccion=Base Set&rareza=Rara Holo&orden=precio_asc&q=fuego
router.get('/', async (req, res) => {
  try {
    const { categoria, coleccion, rareza, orden, q } = req.query;
    const where = [];
    const params = [];
    if (categoria) {
      where.push('p.categoria_id IN (?)');
      params.push(String(categoria).split(',').map(Number).filter(Boolean));
    }
    if (coleccion) { where.push('p.coleccion IN (?)'); params.push(String(coleccion).split(',')); }
    if (rareza) { where.push('p.rareza IN (?)'); params.push(String(rareza).split(',')); }
    if (q) { where.push('p.nombre LIKE ?'); params.push(`%${q}%`); }

    let sql = SELECT_PRODUCTO;
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY ' + (ORDENES[orden] || 'p.id DESC'); // solo valores permitidos
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /productos/filtros -> opciones disponibles de colección y rareza
router.get('/filtros', async (req, res) => {
  try {
    const [colecciones] = await db.query('SELECT DISTINCT coleccion FROM producto WHERE coleccion IS NOT NULL ORDER BY coleccion');
    const [rarezas] = await db.query('SELECT DISTINCT rareza FROM producto WHERE rareza IS NOT NULL ORDER BY rareza');
    res.json({
      colecciones: colecciones.map((r) => r.coleccion),
      rarezas: rarezas.map((r) => r.rareza),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /productos/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(SELECT_PRODUCTO + ' WHERE p.id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /productos (solo admin)
router.post('/', verificarToken, soloAdmin, async (req, res) => {
  const error = validarProducto(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const [r] = await db.query(
      `INSERT INTO producto (nombre, descripcion, precio, stock, coleccion, rareza, imagen, categoria_id, proveedor_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      datosProducto(req.body)
    );
    res.status(201).json({ id: r.insertId, ...req.body });
  } catch (e) {
    errorBD(e, res);
  }
});

// PUT /productos/:id (solo admin)
router.put('/:id', verificarToken, soloAdmin, async (req, res) => {
  const error = validarProducto(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const [r] = await db.query(
      `UPDATE producto SET nombre=?, descripcion=?, precio=?, stock=?, coleccion=?, rareza=?, imagen=?,
       categoria_id=?, proveedor_id=? WHERE id = ?`,
      [...datosProducto(req.body), req.params.id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ id: Number(req.params.id), ...req.body });
  } catch (e) {
    errorBD(e, res);
  }
});

// DELETE /productos/:id (solo admin)
router.delete('/:id', verificarToken, soloAdmin, async (req, res) => {
  try {
    const [r] = await db.query('DELETE FROM producto WHERE id = ?', [req.params.id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ mensaje: 'Producto eliminado' });
  } catch (e) {
    errorBD(e, res);
  }
});

module.exports = router;
