const express = require('express');
const db = require('../db');
const { verificarToken, soloAdmin } = require('../middleware/auth');

const router = express.Router();

// Algoritmo de Luhn: detecta números de tarjeta mal escritos
function luhn(digitos) {
  let suma = 0;
  [...digitos].reverse().forEach((c, i) => {
    let n = Number(c);
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
    suma += n;
  });
  return suma % 10 === 0;
}

// "MM/AA": la tarjeta vale hasta el último día de ese mes
function vencimientoOk(exp, hoy = new Date()) {
  const m = String(exp || '').match(/^(\d{2})\/(\d{2})$/);
  if (!m) return false;
  const mes = Number(m[1]);
  const anio = 2000 + Number(m[2]);
  if (mes < 1 || mes > 12) return false;
  return anio > hoy.getFullYear() || (anio === hoy.getFullYear() && mes >= hoy.getMonth() + 1);
}

function validarTarjeta(t = {}) {
  if (!/^[\d\s-]+$/.test(String(t.numero || ''))) return 'El número de tarjeta solo puede tener dígitos';
  const digitos = String(t.numero || '').replace(/\D/g, '');
  if (digitos.length < 13 || digitos.length > 19 || !luhn(digitos)) return 'El número de tarjeta no es válido';
  if (!t.nombre || String(t.nombre).trim().length < 3) return 'El nombre del titular es obligatorio';
  if (!vencimientoOk(t.vencimiento)) return 'La tarjeta está vencida o la fecha no es válida';
  if (!/^\d{3,4}$/.test(String(t.cvc || ''))) return 'El código de seguridad no es válido';
  return null;
}

const rechazada = (t) => String(t.numero).replace(/\D/g, '').endsWith('0002');

// Cambios de estado permitidos para el admin
const TRANSICIONES = {
  pendiente: ['pagado', 'cancelado'],
  pagado: ['enviado', 'cancelado'],
  enviado: [],
  cancelado: [],
};

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

  // Si el mismo producto viene repetido, se suman las cantidades
  const cantidades = new Map();
  for (const it of items) cantidades.set(it.producto_id, (cantidades.get(it.producto_id) || 0) + it.cantidad);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Los precios y el stock se leen de la base (nunca se confía en el precio del cliente)
    let total = 0;
    const lineas = [];
    for (const [productoId, cantidad] of cantidades) {
      const [rows] = await conn.query(
        'SELECT id, nombre, precio, stock FROM producto WHERE id = ? FOR UPDATE',
        [productoId]
      );
      const p = rows[0];
      if (!p) { await conn.rollback(); return res.status(404).json({ error: 'Un producto del carrito ya no existe' }); }
      if (p.stock < cantidad) {
        await conn.rollback();
        return res.status(409).json({ error: `Stock insuficiente para "${p.nombre}" (quedan ${p.stock})` });
      }
      total += Number(p.precio) * cantidad;
      lineas.push({ p, cantidad });
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

// GET /pedidos  -> todos los pedidos con el cliente (solo admin). Filtro opcional: ?estado=pagado
router.get('/', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { estado } = req.query;
    if (estado && !TRANSICIONES[estado]) return res.status(400).json({ error: 'El estado no es válido' });
    let sql = `SELECT pe.id, pe.fecha, pe.estado, pe.total, u.nombre AS cliente, u.email
               FROM pedido pe JOIN usuario u ON u.id = pe.usuario_id`;
    const params = [];
    if (estado) { sql += ' WHERE pe.estado = ?'; params.push(estado); }
    sql += ' ORDER BY pe.fecha DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /pedidos/:id  -> detalle de un pedido (su dueño o un admin)
router.get('/:id', verificarToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, usuario_id, fecha, estado, total FROM pedido WHERE id = ?', [req.params.id]);
    const pedido = rows[0];
    // Si no es suyo se responde 404, para no revelar que el pedido existe
    if (!pedido || (req.usuario.rol !== 'admin' && pedido.usuario_id !== req.usuario.id)) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    const [items] = await db.query(
      `SELECT d.producto_id, p.nombre, d.cantidad, d.precio_unitario
       FROM detalle_pedido d JOIN producto p ON p.id = d.producto_id
       WHERE d.pedido_id = ?`,
      [pedido.id]
    );
    res.json({ ...pedido, items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PATCH /pedidos/:id/estado  -> el admin cambia el estado. Si se cancela, se devuelve el stock.
router.patch('/:id/estado', verificarToken, soloAdmin, async (req, res) => {
  const { estado } = req.body;
  if (!TRANSICIONES[estado]) return res.status(400).json({ error: 'El estado no es válido' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT id, estado FROM pedido WHERE id = ? FOR UPDATE', [req.params.id]);
    const pedido = rows[0];
    if (!pedido) { await conn.rollback(); return res.status(404).json({ error: 'Pedido no encontrado' }); }
    if (!TRANSICIONES[pedido.estado].includes(estado)) {
      await conn.rollback();
      return res.status(409).json({ error: `Un pedido "${pedido.estado}" no puede pasar a "${estado}"` });
    }

    if (estado === 'cancelado') {
      await conn.query(
        `UPDATE producto p JOIN detalle_pedido d ON d.producto_id = p.id
         SET p.stock = p.stock + d.cantidad WHERE d.pedido_id = ?`,
        [pedido.id]
      );
    }
    await conn.query('UPDATE pedido SET estado = ? WHERE id = ?', [estado, pedido.id]);
    await conn.commit();
    res.json({ id: pedido.id, estado });
  } catch (e) {
    await conn.rollback().catch(() => {});
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  } finally {
    conn.release();
  }
});

module.exports = router;
module.exports.validarTarjeta = validarTarjeta;
