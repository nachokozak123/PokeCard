const express = require('express');
const db = require('../db');
const { verificarToken, soloAdmin, idValido, limitar } = require('../middleware/auth');

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

// Datos de envío: se guardan en el pedido para tener la dirección tal como estaba al comprar
function validarEnvio(e) {
  if (!e || typeof e !== 'object') return 'Los datos de envío son obligatorios';
  const texto = (v, min, max) => typeof v === 'string' && v.trim().length >= min && v.trim().length <= max;
  if (!texto(e.nombre, 3, 100)) return 'Ingresá el nombre de quien recibe el pedido';
  if (!texto(e.direccion, 5, 200)) return 'Ingresá la dirección de entrega (calle y número)';
  if (!texto(e.ciudad, 2, 100)) return 'Ingresá la ciudad';
  if (!texto(e.provincia, 2, 100)) return 'Ingresá la provincia';
  if (!/^[A-Za-z0-9 -]{4,10}$/.test(String(e.cp || ''))) return 'El código postal no es válido';
  if (!/^[\d+() -]{6,30}$/.test(String(e.telefono || ''))) return 'El teléfono no es válido';
  return null;
}

const limiteCompra = limitar({ minutos: 15, max: 20, mensaje: 'Demasiados intentos de pago. Probá de nuevo en unos minutos.' });

const rechazada = (t) => String(t.numero).replace(/\D/g, '').endsWith('0002');

// Cambios de estado permitidos para el admin
const TRANSICIONES = {
  pendiente: ['pagado', 'cancelado'],
  pagado: ['enviado', 'cancelado'],
  enviado: [],
  cancelado: [],
};

// POST /pedidos  -> cliente autenticado.
// Body: { items: [{ producto_id, cantidad }], tarjeta: {...}, envio: {...} }
router.post('/', verificarToken, limiteCompra, async (req, res) => {
  const { items, tarjeta, envio } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'El carrito está vacío' });
  }
  if (items.length > 50) return res.status(400).json({ error: 'El carrito tiene demasiados productos' });
  for (const it of items) {
    if (!it || !Number.isInteger(it.producto_id) || !Number.isInteger(it.cantidad) || it.cantidad < 1 || it.cantidad > 100) {
      return res.status(400).json({ error: 'Los productos del carrito no son válidos' });
    }
  }
  const errorEnvio = validarEnvio(envio);
  if (errorEnvio) return res.status(400).json({ error: errorEnvio });
  const errorTarjeta = validarTarjeta(tarjeta);
  if (errorTarjeta) return res.status(400).json({ error: errorTarjeta });

  // Simulación de la pasarela de pago (antes de tocar la base: si el banco rechaza, no se bloquea nada)
  if (rechazada(tarjeta)) {
    return res.status(402).json({ error: 'El banco rechazó la tarjeta. Probá con otra.' });
  }

  const last4 = String(tarjeta.numero).replace(/\D/g, '').slice(-4);
  const datosEnvio = Object.fromEntries(
    ['nombre', 'direccion', 'ciudad', 'provincia', 'cp', 'telefono'].map((k) => [k, String(envio[k]).trim()])
  );

  try {
    // crear_pedido() (ver database/supabase/schema.sql) hace todo en UNA transacción:
    // bloquea los productos, toma precio y stock de la base (nunca del cliente), valida y descuenta.
    const [rows] = await db.query(
      'SELECT * FROM crear_pedido(?, ?::jsonb, ?::jsonb, ?)',
      [req.usuario.id, JSON.stringify(items), JSON.stringify(datosEnvio), last4]
    );
    const p = rows[0];
    res.status(201).json({
      id: p.pedido_id,
      estado: 'pagado',
      total: Number(p.total),
      comprobante: p.comprobante,
      tarjeta_last4: last4,
    });
  } catch (e) {
    const msg = String(e.message || '');
    if (msg.includes('PRODUCTO_INEXISTENTE')) return res.status(404).json({ error: 'Un producto del carrito ya no existe' });
    if (msg.includes('STOCK_INSUFICIENTE')) {
      const detalle = msg.slice(msg.indexOf('STOCK_INSUFICIENTE:') + 'STOCK_INSUFICIENTE:'.length);
      const corte = detalle.lastIndexOf(':'); // el nombre del producto podría tener ":"
      const nombre = detalle.slice(0, corte);
      const stock = detalle.slice(corte + 1);
      return res.status(409).json({ error: `Stock insuficiente para "${nombre}" (quedan ${stock})` });
    }
    if (msg.includes('CARRITO_VACIO') || msg.includes('ITEMS_INVALIDOS')) {
      return res.status(400).json({ error: 'Los productos del carrito no son válidos' });
    }
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
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
router.get('/:id', verificarToken, idValido, async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT id, usuario_id, fecha, estado, total, comprobante, tarjeta_last4,
              envio_nombre, envio_direccion, envio_ciudad, envio_provincia, envio_cp, envio_telefono
       FROM pedido WHERE id = ?`, [req.params.id]);
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
    const { usuario_id, ...publico } = pedido; // no hace falta exponer el id interno del usuario
    res.json({ ...publico, items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PATCH /pedidos/:id/estado  -> el admin cambia el estado. Si se cancela, se devuelve el stock.
router.patch('/:id/estado', verificarToken, soloAdmin, idValido, async (req, res) => {
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
      // cancelar_pedido() devuelve el stock y marca el pedido como cancelado
      await conn.query('SELECT cancelar_pedido(?)', [pedido.id]);
    } else {
      await conn.query('UPDATE pedido SET estado = ? WHERE id = ?', [estado, pedido.id]);
    }
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
