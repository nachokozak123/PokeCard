const express = require('express');
const db = require('../db');
const { verificarToken, soloAdmin } = require('../auth');
const { SELECT_PRODUCTO } = require('./productos');

const router = express.Router();
router.use(verificarToken, soloAdmin); // todo este archivo es solo para administradores
const STOCK_BAJO = 5;
const ZONA = 'America/Argentina/Buenos_Aires'; // la base guarda en UTC; los días se cuentan en hora argentina

// GET /api/admin/dashboard -> métricas del panel
router.get('/dashboard', async (req, res) => {
  const [productos, clientes, pedidos, stockBajo, porCategoria, ultimosPedidos, ventasPorDia] = await Promise.all([
    db.query('SELECT COUNT(*) AS total, COALESCE(SUM(precio * stock), 0) AS valor FROM producto WHERE activo'),
    db.query("SELECT COUNT(*) AS total FROM usuario WHERE rol = 'cliente'"),
    db.query(`SELECT COUNT(*) AS total,
                     COALESCE(SUM(total) FILTER (WHERE estado <> 'cancelado'), 0) AS ventas,
                     COUNT(*) FILTER (WHERE estado = 'pagado') AS por_enviar
              FROM pedido`),
    db.query('SELECT id, nombre, stock FROM producto WHERE activo AND stock <= $1 ORDER BY stock, nombre LIMIT 10', [STOCK_BAJO]),
    db.query(`SELECT c.nombre AS categoria, COUNT(p.id) AS cantidad
              FROM categoria c LEFT JOIN producto p ON p.categoria_id = c.id AND p.activo
              GROUP BY c.id ORDER BY cantidad DESC, c.nombre`),
    db.query(`SELECT pe.id, pe.fecha, pe.estado, pe.total, u.nombre AS cliente
              FROM pedido pe JOIN usuario u ON u.id = pe.usuario_id ORDER BY pe.fecha DESC LIMIT 5`),
    db.query(`SELECT to_char(d, 'DD/MM') AS dia,
                     COALESCE(SUM(pe.total) FILTER (WHERE pe.estado <> 'cancelado'), 0) AS total
              FROM (SELECT (now() AT TIME ZONE $1)::date AS hoy) h
              CROSS JOIN LATERAL generate_series(h.hoy - 6, h.hoy, interval '1 day') d
              LEFT JOIN pedido pe ON (pe.fecha AT TIME ZONE $1)::date = d::date
              GROUP BY d ORDER BY d`, [ZONA]),
  ]);

  res.json({
    totalProductos: productos.rows[0].total,
    valorInventario: productos.rows[0].valor,
    totalClientes: clientes.rows[0].total,
    totalPedidos: pedidos.rows[0].total,
    pedidosPorEnviar: pedidos.rows[0].por_enviar,
    ventasTotales: pedidos.rows[0].ventas,
    umbralStockBajo: STOCK_BAJO,
    stockBajo: stockBajo.rows,
    productosPorCategoria: porCategoria.rows,
    ultimosPedidos: ultimosPedidos.rows,
    ventasUltimos7Dias: ventasPorDia.rows,
  });
});

// GET /api/admin/productos -> todos los productos, también los archivados
router.get('/productos', async (req, res) => {
  const { rows } = await db.query(`${SELECT_PRODUCTO} ORDER BY p.activo DESC, p.nombre`);
  res.json(rows);
});

module.exports = router;
