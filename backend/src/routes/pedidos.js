const express = require('express');
const db = require('../db');
const { verificarToken } = require('../middleware/auth');

const router = express.Router();


function vencimientoOk(exp) {
  const m = String(exp || '').match(/^(\d{2})\/(\d{2})$/);
  if (!m) return false;
  const mes = Number(m[1]);
  return mes >= 1 && mes <= 12;
}


function validarTarjeta(t = {}) {
  if (!/^[\d\s-]+$/.test(String(t.numero || ''))) return 'El número de tarjeta solo puede tener dígitos';
  const digitos = String(t.numero || '').replace(/\D/g, '');
  if (digitos.length < 13 || digitos.length > 19) return 'El número de tarjeta no es válido';
  if (!t.nombre || t.nombre.trim().length < 3) return 'El nombre del titular es obligatorio';
  if (!vencimientoOk(t.vencimiento)) return 'La tarjeta está vencida o la fecha no es válida';
  if (!/^\d{3,4}$/.test(String(t.cvc || ''))) return 'El código de seguridad no es válido';
  return null;
}

const rechazada = (t) => String(t.numero).replace(/\D/g, '').endsWith('0002');

// POST /pedidos  -> cliente autenticado. Body: { items: [{ producto_id, cantidad }], tarjeta: {...} }
router.post('/', verificarToken, async (req, res) => {
  const { items, tarjeta } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'El carrito está vacío' });
  }
  for (const it of items) {
    if (!Number.isInteger(it.producto_id) || !Number.isInteger(it.cantidad) || it.cantidad < 1) {
      return res.status(400).json({ error: 'Los productos del carrito no son válidos' });
    }
  }
  const errorTarjeta = validarTarjeta(tarjeta);
  if (errorTarjeta) return res.status(400).json({ error: errorTarjeta });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Los precios y el stock se leen de la base (nunca se confía en el precio del cliente)
    let total = 0;
    const lineas = [];
    for (const it of items) {
      const [rows] = await conn.query(
        'SELECT id, nombre, precio, stock FROM producto WHERE id = ? FOR UPDATE',
        [it.producto_id]
      );
      const p = rows[0];
      if (!p) { await conn.rollback(); return res.status(404).json({ error: 'Un producto del carrito ya no existe' }); }
      if (p.stock < it.cantidad) {
        await conn.rollback();
        return res.status(409).json({ error: `Stock insuficiente para "${p.nombre}" (quedan ${p.stock})` });
      }
      total += Number(p.precio) * it.cantidad;
      lineas.push({ p, cantidad: it.cantidad });
    }

    // Simulación de la pasarela de pago
    if (rechazada(tarjeta)) {
      await conn.rollback();
      return res.status(402).json({ error: 'El banco rechazó la tarjeta. Probá con otra.' });
    }

    const [r] = await conn.query(
      'INSERT INTO pedido (usuario_id, estado, total) VALUES (?, ?, ?)',
      [req.usuario.id, 'pagado', total]
    );
    for (const { p, cantidad } of lineas) {
      await conn.query(
        'INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
        [r.insertId, p.id, cantidad, p.precio]
      );
      await conn.query('UPDATE producto SET stock = stock - ? WHERE id = ?', [cantidad, p.id]);
    }
    await conn.commit();

    res.status(201).json({
      id: r.insertId,
      estado: 'pagado',
      total,
      comprobante: 'PAY-' + String(r.insertId).padStart(6, '0'),
      tarjeta_last4: String(tarjeta.numero).replace(/\D/g, '').slice(-4),
    });
  } catch (e) {
    await conn.rollback().catch(() => {});
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  } finally {
    conn.release();
  }
});

// GET /pedidos/mios  -> pedidos del usuario autenticado
router.get('/mios', verificarToken, async (req, res) => {
  try {
    const [pedidos] = await db.query(
      'SELECT id, fecha, estado, total FROM pedido WHERE usuario_id = ? ORDER BY fecha DESC',
      [req.usuario.id]
    );
    res.json(pedidos);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
