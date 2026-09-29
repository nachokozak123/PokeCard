const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /productos - lista de productos, con filtros opcionales por
// categoria, rareza y precio maximo (?categoria_id=1&rareza=Rara&precio_max=5000)
router.get('/', async (req, res) => {
  try {
    const { categoria_id, rareza, precio_max } = req.query;
    let sql = 'SELECT * FROM producto WHERE 1=1';
    const params = [];

    if (categoria_id) {
      sql += ' AND categoria_id = ?';
      params.push(categoria_id);
    }
    if (rareza) {
      sql += ' AND rareza = ?';
      params.push(rareza);
    }
    if (precio_max) {
      sql += ' AND precio <= ?';
      params.push(precio_max);
    }

    const [productos] = await pool.query(sql, params);
    res.json(productos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los productos' });
  }
});

// GET /productos/:id - detalle de un producto puntual
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM producto WHERE id = ?', [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el producto' });
  }
});

module.exports = router;
