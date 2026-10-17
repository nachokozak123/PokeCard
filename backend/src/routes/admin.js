const express = require('express');
const db = require('../db');
const { verificarToken, soloAdmin } = require('../middleware/auth');

const router = express.Router();
const STOCK_BAJO = 5;

// GET /admin/dashboard -> métricas para el panel administrativo (solo admin)
router.get('/dashboard', verificarToken, soloAdmin, async (req, res) => {
  try {
    const [[productos]] = await db.query(
      'SELECT COUNT(*) AS total, COALESCE(SUM(precio * stock), 0) AS valor_inventario FROM producto'
    );
    const [[usuarios]] = await db.query("SELECT COUNT(*) AS total FROM usuario WHERE rol = 'cliente'");
    const [[pedidos]] = await db.query(
      `SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN estado <> 'cancelado' THEN total END), 0) AS ventas
       FROM pedido`
    );
    const [stockBajo] = await db.query(
      'SELECT id, nombre, stock FROM producto WHERE stock <= ? ORDER BY stock ASC LIMIT 10',
      [STOCK_BAJO]
    );
    const [porCategoria] = await db.query(
      `SELECT c.nombre AS categoria, COUNT(p.id) AS cantidad
       FROM categoria c LEFT JOIN producto p ON p.categoria_id = c.id
       GROUP BY c.id, c.nombre ORDER BY cantidad DESC`
    );
    const [ultimosUsuarios] = await db.query(
      'SELECT id, nombre, email, rol, creado_en FROM usuario ORDER BY creado_en DESC LIMIT 5'
    );

    res.json({
      totalProductos: productos.total,
      valorInventario: Number(productos.valor_inventario),
      totalClientes: usuarios.total,
      totalPedidos: pedidos.total,
      ventasTotales: Number(pedidos.ventas),
      umbralStockBajo: STOCK_BAJO,
      stockBajo,
      productosPorCategoria: porCategoria,
      ultimosUsuarios,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
