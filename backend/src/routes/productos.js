const express = require('express');
const db = require('../db');
const { verificarToken, soloAdmin, idValido } = require('../middleware/auth');

const router = express.Router();

const SELECT_PRODUCTO = `
  SELECT p.id, p.nombre, p.descripcion, p.precio, p.stock, p.coleccion, p.rareza, p.imagen, p.destacado,
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
  if (precio > 99999999) return 'El precio es demasiado alto';
  if (stock > 1000000) return 'El stock es demasiado alto';
  if (String(b.nombre).trim().length > 120) return 'El nombre no puede superar los 120 caracteres';
  if (b.coleccion && String(b.coleccion).length > 80) return 'La colección no puede superar los 80 caracteres';
  if (b.rareza && String(b.rareza).length > 50) return 'La rareza no puede superar los 50 caracteres';
  if (b.descripcion && String(b.descripcion).length > 2000) return 'La descripción es demasiado larga';
  // Solo URLs http(s): evita "javascript:" y otros esquemas peligrosos en la imagen
  if (b.imagen && !/^https?:\/\/\S{1,480}$/i.test(String(b.imagen))) return 'La imagen debe ser una URL http(s) válida';
  if (!Number.isInteger(Number(b.categoria_id)) || Number(b.categoria_id) < 1) return 'La categoría es obligatoria';
  return null;
}

// Solo se devuelven los campos conocidos (nunca se refleja el body entero)
function camposPublicos(b) {
  const { nombre, descripcion, precio, stock, coleccion, rareza, imagen, categoria_id, proveedor_id } = b;
  return { nombre, descripcion, precio, stock, coleccion, rareza, imagen, categoria_id, proveedor_id };
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
    const where = ['p.activo']; // lo desactivado no se muestra en la tienda
    const params = [];
    const lista = (v) => String(v).split(',').slice(0, 50);
    if (categoria) {
      const ids = lista(categoria).map(Number).filter((n) => Number.isInteger(n) && n > 0);
      if (ids.length) { where.push('p.categoria_id IN (?)'); params.push(ids); }
    }
    if (req.query.destacados === '1') where.push('p.destacado');
    if (coleccion) { where.push('p.coleccion IN (?)'); params.push(lista(coleccion)); }
    if (rareza) { where.push('p.rareza IN (?)'); params.push(lista(rareza)); }
    if (q) {
      // Se escapan % y _ para que el usuario no arme patrones; ILIKE no distingue mayúsculas
      const texto = String(q).slice(0, 80).replace(/[\\%_]/g, '\\$&');
      where.push('p.nombre ILIKE ?');
      params.push(`%${texto}%`);
    }

    // Paginación: ?limite=24&pagina=2 (máximo 100 por página). El total viaja en X-Total-Count.
    const limite = Math.min(Math.max(parseInt(req.query.limite, 10) || 100, 1), 100);
    const pagina = Math.max(parseInt(req.query.pagina, 10) || 1, 1);
    const condicion = ' WHERE ' + where.join(' AND ');

    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM producto p' + condicion, params);
    // solo se usan valores permitidos para ORDER BY, y limite/offset ya son números
    const sql = SELECT_PRODUCTO + condicion + ' ORDER BY ' + (ORDENES[orden] || 'p.id DESC')
      + ` LIMIT ${limite} OFFSET ${(pagina - 1) * limite}`;
    const [rows] = await db.query(sql, params);
    res.set('X-Total-Count', String(total));
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /productos/filtros -> opciones disponibles de colección y rareza
router.get('/filtros', async (req, res) => {
  try {
    const [colecciones] = await db.query('SELECT DISTINCT coleccion FROM producto WHERE activo AND coleccion IS NOT NULL ORDER BY coleccion');
    const [rarezas] = await db.query('SELECT DISTINCT rareza FROM producto WHERE activo AND rareza IS NOT NULL ORDER BY rareza');
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
router.get('/:id', idValido, async (req, res) => {
  try {
    const [rows] = await db.query(SELECT_PRODUCTO + ' WHERE p.id = ? AND p.activo', [req.params.id]);
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
    res.status(201).json({ id: r.insertId, ...camposPublicos(req.body) });
  } catch (e) {
    errorBD(e, res);
  }
});

// PUT /productos/:id (solo admin)
router.put('/:id', verificarToken, soloAdmin, idValido, async (req, res) => {
  const error = validarProducto(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const [r] = await db.query(
      `UPDATE producto SET nombre=?, descripcion=?, precio=?, stock=?, coleccion=?, rareza=?, imagen=?,
       categoria_id=?, proveedor_id=? WHERE id = ?`,
      [...datosProducto(req.body), req.params.id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ id: Number(req.params.id), ...camposPublicos(req.body) });
  } catch (e) {
    errorBD(e, res);
  }
});

// DELETE /productos/:id (solo admin)
router.delete('/:id', verificarToken, soloAdmin, idValido, async (req, res) => {
  try {
    const [r] = await db.query('DELETE FROM producto WHERE id = ?', [req.params.id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ mensaje: 'Producto eliminado' });
  } catch (e) {
    errorBD(e, res);
  }
});

module.exports = router;
