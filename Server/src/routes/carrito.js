const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /carrito - items del carrito del usuario logueado, con datos del producto
router.get('/', async (req, res) => {
  try {
    const [items] = await pool.query(
      `SELECT ci.id, ci.cantidad, p.id AS producto_id, p.nombre, p.precio, p.imagen_url, p.stock
       FROM carrito_item ci
       JOIN producto p ON p.id = ci.producto_id
       WHERE ci.usuario_id = ?`,
      [req.usuario.id]
    );
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el carrito' });
  }
});

// POST /carrito - agrega un producto, o suma la cantidad si ya estaba
router.post('/', async (req, res) => {
  try {
    const { producto_id, cantidad } = req.body;

    if (!producto_id || !cantidad || cantidad <= 0) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const [productos] = await pool.query('SELECT id FROM producto WHERE id = ?', [producto_id]);
    if (productos.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    await pool.query(
      `INSERT INTO carrito_item (usuario_id, producto_id, cantidad)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE cantidad = cantidad + VALUES(cantidad)`,
      [req.usuario.id, producto_id, cantidad]
    );

    res.status(201).json({ mensaje: 'Producto agregado al carrito' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al agregar al carrito' });
  }
});

// PUT /carrito/:id - actualiza la cantidad de un item del carrito
router.put('/:id', async (req, res) => {
  try {
    const { cantidad } = req.body;

    if (!cantidad || cantidad <= 0) {
      return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
    }

    const [resultado] = await pool.query(
      'UPDATE carrito_item SET cantidad = ? WHERE id = ? AND usuario_id = ?',
      [cantidad, req.params.id, req.usuario.id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: 'Item de carrito no encontrado' });
    }

    res.json({ mensaje: 'Cantidad actualizada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el carrito' });
  }
});

// DELETE /carrito/:id - saca un producto del carrito
router.delete('/:id', async (req, res) => {
  try {
    const [resultado] = await pool.query(
      'DELETE FROM carrito_item WHERE id = ? AND usuario_id = ?',
      [req.params.id, req.usuario.id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: 'Item de carrito no encontrado' });
    }

    res.json({ mensaje: 'Producto eliminado del carrito' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar del carrito' });
  }
});

module.exports = router;
