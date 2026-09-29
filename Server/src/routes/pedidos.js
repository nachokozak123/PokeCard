const express = require('express');
const router = express.Router();
const pool = require('../db');

// POST /pedidos - genera un pedido a partir del carrito del usuario logueado.
// Valida stock, crea el pedido y su detalle, descuenta stock y vacia el carrito,
// todo dentro de una transaccion para que no quede a medias si algo falla.
router.post('/', async (req, res) => {
  const conexion = await pool.getConnection();

  try {
    const usuarioId = req.usuario.id;

    const [items] = await conexion.query(
      `SELECT ci.cantidad, p.id AS producto_id, p.precio, p.stock, p.nombre
       FROM carrito_item ci
       JOIN producto p ON p.id = ci.producto_id
       WHERE ci.usuario_id = ?`,
      [usuarioId]
    );

    if (items.length === 0) {
      conexion.release();
      return res.status(400).json({ error: 'El carrito esta vacio' });
    }

    const sinStock = items.find((item) => item.cantidad > item.stock);
    if (sinStock) {
      conexion.release();
      return res.status(409).json({ error: `No hay stock suficiente de "${sinStock.nombre}"` });
    }

    const total = items.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

    await conexion.beginTransaction();

    const [pedidoResultado] = await conexion.query(
      'INSERT INTO pedido (usuario_id, estado, total) VALUES (?, ?, ?)',
      [usuarioId, 'pendiente', total]
    );
    const pedidoId = pedidoResultado.insertId;

    for (const item of items) {
      const subtotal = item.precio * item.cantidad;

      await conexion.query(
        'INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
        [pedidoId, item.producto_id, item.cantidad, item.precio, subtotal]
      );

      await conexion.query('UPDATE producto SET stock = stock - ? WHERE id = ?', [item.cantidad, item.producto_id]);
    }

    await conexion.query('DELETE FROM carrito_item WHERE usuario_id = ?', [usuarioId]);

    await conexion.commit();
    conexion.release();

    res.status(201).json({ id: pedidoId, total, estado: 'pendiente' });
  } catch (error) {
    await conexion.rollback();
    conexion.release();
    console.error(error);
    res.status(500).json({ error: 'Error al generar el pedido' });
  }
});

// GET /pedidos - historial de pedidos del usuario logueado
router.get('/', async (req, res) => {
  try {
    const [pedidos] = await pool.query(
      'SELECT id, fecha, estado, total FROM pedido WHERE usuario_id = ? ORDER BY fecha DESC',
      [req.usuario.id]
    );
    res.json(pedidos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los pedidos' });
  }
});

// GET /pedidos/:id - detalle de un pedido puntual, con sus items
router.get('/:id', async (req, res) => {
  try {
    const [pedidos] = await pool.query(
      'SELECT id, fecha, estado, total FROM pedido WHERE id = ? AND usuario_id = ?',
      [req.params.id, req.usuario.id]
    );

    if (pedidos.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const [detalle] = await pool.query(
      `SELECT dp.cantidad, dp.precio_unitario, dp.subtotal, p.nombre
       FROM detalle_pedido dp
       JOIN producto p ON p.id = dp.producto_id
       WHERE dp.pedido_id = ?`,
      [req.params.id]
    );

    res.json({ ...pedidos[0], items: detalle });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el pedido' });
  }
});

module.exports = router;
