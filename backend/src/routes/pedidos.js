const express = require('express');
const db = require('../db');
const { verificarToken, soloAdmin, idValido, ErrorHttp } = require('../auth');

const router = express.Router();
router.use(verificarToken); // todas las rutas de pedidos requieren sesión

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

function validarTarjeta(t) {
  if (!t || typeof t !== 'object') return 'Faltan los datos de la tarjeta';
  if (!/^[\d\s-]{13,23}$/.test(String(t.numero || ''))) return 'El número de tarjeta solo puede tener dígitos';
  const digitos = String(t.numero).replace(/\D/g, '');
  if (digitos.length < 13 || digitos.length > 19 || !luhn(digitos)) return 'El número de tarjeta no es válido';
  if (typeof t.nombre !== 'string' || t.nombre.trim().length < 3 || t.nombre.length > 60) return 'El nombre del titular no es válido';
  if (!vencimientoOk(t.vencimiento)) return 'La tarjeta está vencida o la fecha no es válida';
  if (!/^\d{3,4}$/.test(String(t.cvc || ''))) return 'El código de seguridad no es válido';
  return null;
}

// Cambios de estado permitidos para el admin
const TRANSICIONES = {
  pendiente: ['pagado', 'cancelado'],
  pagado: ['enviado', 'cancelado'],
  enviado: [],
  cancelado: [],
};

// POST /api/pedidos -> compra con pago simulado. Body: { items: [{ producto_id, cantidad }], tarjeta: {...} }
router.post('/', async (req, res) => {
  const { items, tarjeta } = req.body;
  if (!Array.isArray(items) || items.length === 0) throw new ErrorHttp(400, 'El carrito está vacío');
  if (items.length > 50) throw new ErrorHttp(400, 'El carrito tiene demasiados productos');

  // Junta cantidades si el mismo producto viene repetido
  const cantidades = new Map();
  for (const it of items) {
    if (!Number.isInteger(it?.producto_id) || !Number.isInteger(it?.cantidad) || it.cantidad < 1 || it.cantidad > 99) {
      throw new ErrorHttp(400, 'Los productos del carrito no son válidos');
    }
    cantidades.set(it.producto_id, (cantidades.get(it.producto_id) || 0) + it.cantidad);
  }
  const errorTarjeta = validarTarjeta(tarjeta);
  if (errorTarjeta) throw new ErrorHttp(400, errorTarjeta);
  const ultimos4 = String(tarjeta.numero).replace(/\D/g, '').slice(-4); // el número completo nunca se guarda

  const pedido = await db.transaccion(async (tx) => {
    // Precios y stock se leen de la base y se bloquean las filas (FOR UPDATE) para que
    // dos compras al mismo tiempo no dejen el stock negativo. Se bloquea en orden de id.
    const { rows: productos } = await tx.query(
      'SELECT id, nombre, precio, stock FROM producto WHERE id = ANY($1::int[]) AND activo ORDER BY id FOR UPDATE',
      [[...cantidades.keys()]]
    );
    if (productos.length !== cantidades.size) throw new ErrorHttp(404, 'Un producto del carrito ya no está disponible');

    let total = 0;
    for (const p of productos) {
      const cantidad = cantidades.get(p.id);
      if (p.stock < cantidad) throw new ErrorHttp(409, `Stock insuficiente para "${p.nombre}" (quedan ${p.stock})`);
      total += p.precio * cantidad;
    }

    // Simulación de la pasarela: las tarjetas terminadas en 0002 se rechazan
    if (ultimos4 === '0002') throw new ErrorHttp(402, 'El banco rechazó la tarjeta. Probá con otra.');

    const { rows } = await tx.query(
      `INSERT INTO pedido (usuario_id, estado, total, tarjeta_ultimos4) VALUES ($1, 'pagado', $2, $3) RETURNING id, fecha`,
      [req.usuario.id, Math.round(total * 100) / 100, ultimos4]
    );
    for (const p of productos) {
      const cantidad = cantidades.get(p.id);
      await tx.query(
        'INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario) VALUES ($1, $2, $3, $4)',
        [rows[0].id, p.id, cantidad, p.precio]
      );
      await tx.query('UPDATE producto SET stock = stock - $1 WHERE id = $2', [cantidad, p.id]);
    }
    return { id: rows[0].id, fecha: rows[0].fecha, total: Math.round(total * 100) / 100 };
  });

  res.status(201).json({
    ...pedido,
    estado: 'pagado',
    comprobante: 'PAY-' + String(pedido.id).padStart(6, '0'),
    tarjeta_ultimos4: ultimos4,
  });
});

// GET /api/pedidos/mios -> pedidos del usuario con sus productos
router.get('/mios', async (req, res) => {
  const { rows } = await db.query(
    `SELECT pe.id, pe.fecha, pe.estado, pe.total, pe.tarjeta_ultimos4,
            COALESCE(json_agg(json_build_object('nombre', p.nombre, 'cantidad', d.cantidad,
                     'precio_unitario', d.precio_unitario) ORDER BY d.id), '[]') AS items
     FROM pedido pe
     JOIN detalle_pedido d ON d.pedido_id = pe.id
     JOIN producto p ON p.id = d.producto_id
     WHERE pe.usuario_id = $1
     GROUP BY pe.id ORDER BY pe.fecha DESC`,
    [req.usuario.id]
  );
  res.json(rows);
});

// GET /api/pedidos?estado=pagado -> todos los pedidos (admin)
router.get('/', soloAdmin, async (req, res) => {
  const { estado } = req.query;
  if (estado && !TRANSICIONES[estado]) throw new ErrorHttp(400, 'El estado no es válido');
  const { rows } = await db.query(
    `SELECT pe.id, pe.fecha, pe.estado, pe.total, u.nombre AS cliente, u.email
     FROM pedido pe JOIN usuario u ON u.id = pe.usuario_id
     WHERE ($1::estado_pedido IS NULL OR pe.estado = $1)
     ORDER BY pe.fecha DESC`,
    [estado || null]
  );
  res.json(rows);
});

// GET /api/pedidos/:id -> detalle (su dueño o un admin)
router.get('/:id', async (req, res) => {
  const { rows } = await db.query(
    'SELECT id, usuario_id, fecha, estado, total, tarjeta_ultimos4 FROM pedido WHERE id = $1',
    [idValido(req.params.id)]
  );
  const pedido = rows[0];
  // Si no es suyo se responde 404, para no revelar que el pedido existe
  if (!pedido || (req.usuario.rol !== 'admin' && pedido.usuario_id !== req.usuario.id)) {
    throw new ErrorHttp(404, 'Pedido no encontrado');
  }
  const { rows: items } = await db.query(
    `SELECT d.producto_id, p.nombre, d.cantidad, d.precio_unitario
     FROM detalle_pedido d JOIN producto p ON p.id = d.producto_id
     WHERE d.pedido_id = $1 ORDER BY d.id`,
    [pedido.id]
  );
  res.json({ ...pedido, items });
});

// PATCH /api/pedidos/:id/estado -> el admin cambia el estado. Si se cancela, vuelve el stock.
router.patch('/:id/estado', soloAdmin, async (req, res) => {
  const { estado } = req.body;
  if (!TRANSICIONES[estado]) throw new ErrorHttp(400, 'El estado no es válido');
  const id = idValido(req.params.id);

  await db.transaccion(async (tx) => {
    const { rows } = await tx.query('SELECT estado FROM pedido WHERE id = $1 FOR UPDATE', [id]);
    if (!rows[0]) throw new ErrorHttp(404, 'Pedido no encontrado');
    if (!TRANSICIONES[rows[0].estado].includes(estado)) {
      throw new ErrorHttp(409, `Un pedido "${rows[0].estado}" no puede pasar a "${estado}"`);
    }
    if (estado === 'cancelado') {
      await tx.query(
        `UPDATE producto p SET stock = p.stock + d.cantidad
         FROM detalle_pedido d WHERE d.producto_id = p.id AND d.pedido_id = $1`,
        [id]
      );
    }
    await tx.query('UPDATE pedido SET estado = $1 WHERE id = $2', [estado, id]);
  });
  res.json({ id, estado });
});

module.exports = router;
