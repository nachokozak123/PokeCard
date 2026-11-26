const express = require('express');
const db = require('../db');
const { verificarToken, soloAdmin, idValido, ErrorHttp } = require('../auth');

const router = express.Router();

const SELECT_PRODUCTO = `
  SELECT p.id, p.nombre, p.descripcion, p.precio, p.stock, p.coleccion, p.rareza, p.imagen, p.activo,
         p.categoria_id, p.proveedor_id, c.nombre AS categoria, pr.nombre AS proveedor
  FROM producto p
  JOIN categoria c ON c.id = p.categoria_id
  LEFT JOIN proveedor pr ON pr.id = p.proveedor_id`;

// Solo estos órdenes están permitidos (nunca se arma SQL con texto del usuario)
const ORDENES = {
  precio_asc: 'p.precio ASC',
  precio_desc: 'p.precio DESC',
  nombre: 'p.nombre ASC',
  nuevos: 'p.id DESC',
};

const lista = (v) => (v ? String(v).split(',').map((x) => x.trim()).filter(Boolean).slice(0, 30) : []);
const opcional = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

// Valida y normaliza los datos de un producto enviados por el admin
function leerProducto(b) {
  const nombre = typeof b.nombre === 'string' ? b.nombre.trim() : '';
  if (!nombre || nombre.length > 120) throw new ErrorHttp(400, 'El nombre es obligatorio (hasta 120 caracteres)');
  const precio = Number(b.precio);
  if (b.precio === '' || !Number.isFinite(precio) || precio < 0 || precio > 99999999) {
    throw new ErrorHttp(400, 'El precio debe ser un número mayor o igual a 0');
  }
  const stock = Number(b.stock);
  if (b.stock === '' || !Number.isInteger(stock) || stock < 0) {
    throw new ErrorHttp(400, 'El stock debe ser un número entero mayor o igual a 0');
  }
  const categoriaId = Number(b.categoria_id);
  if (!Number.isInteger(categoriaId) || categoriaId < 1) throw new ErrorHttp(400, 'La categoría es obligatoria');
  const proveedorId = b.proveedor_id ? Number(b.proveedor_id) : null;
  const imagen = opcional(b.imagen, 500);
  if (imagen && !/^https:\/\/\S+$/.test(imagen)) throw new ErrorHttp(400, 'La imagen debe ser una URL que empiece con https://');

  return [
    nombre, opcional(b.descripcion, 2000), Math.round(precio * 100) / 100, stock,
    opcional(b.coleccion, 80), opcional(b.rareza, 50), imagen,
    b.activo === false ? false : true, categoriaId, proveedorId,
  ];
}

// GET /api/productos?categoria=1,2&coleccion=Base Set&rareza=Rara Holo&orden=precio_asc&q=fuego&limite=8
router.get('/', async (req, res) => {
  const { categoria, coleccion, rareza, orden, q, limite } = req.query;
  const where = ['p.activo'];
  const params = [];
  const agregar = (condicion, valor) => { params.push(valor); where.push(condicion.replace('?', '$' + params.length)); };

  const categorias = lista(categoria).map(Number).filter(Number.isInteger);
  if (categorias.length) agregar('p.categoria_id = ANY(?::int[])', categorias);
  if (lista(coleccion).length) agregar('p.coleccion = ANY(?::text[])', lista(coleccion));
  if (lista(rareza).length) agregar('p.rareza = ANY(?::text[])', lista(rareza));
  if (typeof q === 'string' && q.trim()) {
    // Se escapan los comodines de LIKE para que "%" o "_" se busquen como texto
    agregar("p.nombre ILIKE ? ESCAPE '\\'", '%' + q.trim().slice(0, 60).replace(/[\\%_]/g, '\\$&') + '%');
  }

  const tope = Math.min(Math.max(parseInt(limite, 10) || 200, 1), 200);
  const { rows } = await db.query(
    `${SELECT_PRODUCTO} WHERE ${where.join(' AND ')} ORDER BY ${ORDENES[orden] || ORDENES.precio_asc} LIMIT ${tope}`,
    params
  );
  res.json(rows);
});

// GET /api/productos/filtros -> colecciones y rarezas disponibles
router.get('/filtros', async (req, res) => {
  const col = await db.query('SELECT DISTINCT coleccion FROM producto WHERE activo AND coleccion IS NOT NULL ORDER BY 1');
  const rar = await db.query('SELECT DISTINCT rareza FROM producto WHERE activo AND rareza IS NOT NULL ORDER BY 1');
  res.json({ colecciones: col.rows.map((r) => r.coleccion), rarezas: rar.rows.map((r) => r.rareza) });
});

// GET /api/productos/:id
router.get('/:id', async (req, res) => {
  const { rows } = await db.query(`${SELECT_PRODUCTO} WHERE p.id = $1 AND p.activo`, [idValido(req.params.id)]);
  if (!rows[0]) throw new ErrorHttp(404, 'Producto no encontrado');
  res.json(rows[0]);
});

// POST /api/productos (admin)
router.post('/', verificarToken, soloAdmin, async (req, res) => {
  const { rows } = await db.query(
    `INSERT INTO producto (nombre, descripcion, precio, stock, coleccion, rareza, imagen, activo, categoria_id, proveedor_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    leerProducto(req.body)
  );
  res.status(201).json({ id: rows[0].id, mensaje: 'Producto creado' });
});

// PUT /api/productos/:id (admin)
router.put('/:id', verificarToken, soloAdmin, async (req, res) => {
  const { rowCount } = await db.query(
    `UPDATE producto SET nombre=$1, descripcion=$2, precio=$3, stock=$4, coleccion=$5, rareza=$6, imagen=$7,
            activo=$8, categoria_id=$9, proveedor_id=$10
     WHERE id = $11`,
    [...leerProducto(req.body), idValido(req.params.id)]
  );
  if (!rowCount) throw new ErrorHttp(404, 'Producto no encontrado');
  res.json({ mensaje: 'Producto actualizado' });
});

// DELETE /api/productos/:id (admin)
// Si el producto ya se vendió no se puede borrar (se perdería el historial): se archiva.
router.delete('/:id', verificarToken, soloAdmin, async (req, res) => {
  const id = idValido(req.params.id);
  const vendido = await db.query('SELECT 1 FROM detalle_pedido WHERE producto_id = $1 LIMIT 1', [id]);
  if (vendido.rowCount) {
    const { rowCount } = await db.query('UPDATE producto SET activo = false WHERE id = $1', [id]);
    if (!rowCount) throw new ErrorHttp(404, 'Producto no encontrado');
    return res.json({ archivado: true, mensaje: 'El producto tiene ventas: se archivó y ya no se muestra en la tienda' });
  }
  const { rowCount } = await db.query('DELETE FROM producto WHERE id = $1', [id]);
  if (!rowCount) throw new ErrorHttp(404, 'Producto no encontrado');
  res.json({ archivado: false, mensaje: 'Producto eliminado' });
});

module.exports = router;
module.exports.SELECT_PRODUCTO = SELECT_PRODUCTO;
