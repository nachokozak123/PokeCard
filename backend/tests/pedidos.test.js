// Tests del pedido con pago simulado
const conn = { query: jest.fn(), beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn() };
jest.mock('../src/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const db = require('../src/db');
const app = require('../src/app');

const token = jwt.sign({ id: 2, nombre: 'Cliente', rol: 'cliente' }, process.env.JWT_SECRET);
const tokenAdmin = jwt.sign({ id: 1, nombre: 'Admin', rol: 'admin' }, process.env.JWT_SECRET);
const tarjeta = { numero: '4111 1111 1111 1111', nombre: 'Ash Ketchum', vencimiento: '12/99', cvc: '123' };
const items = [{ producto_id: 1, cantidad: 2 }];
const envio = { nombre: 'Ash Ketchum', direccion: 'Calle Falsa 123', ciudad: 'Pueblo Paleta', provincia: 'Kanto', cp: '1000', telefono: '1155550000' };

beforeEach(() => {
  Object.values(conn).forEach((f) => f.mockReset());
  db.query.mockReset();
  conn.rollback.mockResolvedValue();
  db.getConnection.mockReset().mockResolvedValue(conn);
});

describe('POST /pedidos', () => {
  const post = (body) => request(app).post('/pedidos').set('Authorization', `Bearer ${token}`).send(body);

  test('sin token devuelve 401', async () => {
    const res = await request(app).post('/pedidos').send({ items, tarjeta, envio });
    expect(res.status).toBe(401);
  });

  test('carrito vacío devuelve 400', async () => {
    const res = await post({ items: [], tarjeta, envio });
    expect(res.status).toBe(400);
  });

  test('cantidades absurdas o tipos raros devuelven 400', async () => {
    expect((await post({ items: [{ producto_id: 1, cantidad: 100000 }], tarjeta, envio })).status).toBe(400);
    expect((await post({ items: [{ producto_id: '1; DROP', cantidad: 1 }], tarjeta, envio })).status).toBe(400);
    expect((await post({ items: [null], tarjeta, envio })).status).toBe(400);
  });

  test('sin datos de envío devuelve 400 y no toca la base', async () => {
    const res = await post({ items, tarjeta });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/envío/);
    expect(db.query).not.toHaveBeenCalled();
  });

  test('código postal o teléfono inválidos devuelven 400', async () => {
    expect((await post({ items, tarjeta, envio: { ...envio, cp: '<script>' } })).status).toBe(400);
    expect((await post({ items, tarjeta, envio: { ...envio, telefono: 'abc' } })).status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });

  test('tarjeta inválida devuelve 400 y no toca la base', async () => {
    const res = await post({ items, envio, tarjeta: { ...tarjeta, numero: '1234 5678 9012 3456' } });
    expect(res.status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });

  test('tarjeta vencida devuelve 400 y no toca la base', async () => {
    const res = await post({ items, envio, tarjeta: { ...tarjeta, vencimiento: '01/20' } });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/vencida/);
    expect(db.query).not.toHaveBeenCalled();
  });

  test('tarjeta terminada en 0002 es rechazada (402) sin tocar la base', async () => {
    const res = await post({ items, envio, tarjeta: { ...tarjeta, numero: '4000 0000 0000 0002' } });
    expect(res.status).toBe(402);
    expect(db.query).not.toHaveBeenCalled();
  });

  test('stock insuficiente (lo detecta la base) devuelve 409 con el nombre y el stock', async () => {
    db.query.mockRejectedValueOnce(new Error('STOCK_INSUFICIENTE:Carta: rara:1'));
    const res = await post({ items, tarjeta, envio });
    expect(res.status).toBe(409);
    expect(res.body.error).toContain('"Carta: rara"');
    expect(res.body.error).toContain('quedan 1');
  });

  test('producto inexistente devuelve 404', async () => {
    db.query.mockRejectedValueOnce(new Error('PRODUCTO_INEXISTENTE'));
    const res = await post({ items, tarjeta, envio });
    expect(res.status).toBe(404);
  });

  test('un error inesperado de la base devuelve 500 sin filtrar detalles', async () => {
    db.query.mockRejectedValueOnce(new Error('connection to 10.0.0.5 refused'));
    const res = await post({ items, tarjeta, envio });
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('10.0.0.5');
  });

  test('pago aprobado llama a crear_pedido con el usuario del TOKEN y no devuelve el número completo', async () => {
    db.query.mockResolvedValueOnce([[{ pedido_id: 7, total: '3000.00', comprobante: 'PAY-000007' }]]);
    const res = await post({ items, tarjeta, envio, usuario_id: 999, total: 1 }); // intentos de manipular
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 7, total: 3000, comprobante: 'PAY-000007', tarjeta_last4: '1111' });
    expect(JSON.stringify(res.body)).not.toContain('4111');

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toMatch(/crear_pedido/);
    expect(params[0]).toBe(2);                         // id del token, no el del body
    expect(JSON.parse(params[1])).toEqual(items);
    expect(JSON.parse(params[2]).direccion).toBe('Calle Falsa 123');
    expect(params[3]).toBe('1111');                    // solo los últimos 4
    expect(JSON.stringify(params)).not.toContain('4111 1111');
  });
});

describe('Gestión de pedidos', () => {
  test('un cliente no puede ver todos los pedidos (403)', async () => {
    const res = await request(app).get('/pedidos').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('el admin ve todos los pedidos con el cliente', async () => {
    db.query.mockResolvedValueOnce([[{ id: 1, estado: 'pagado', total: 3000, cliente: 'Ash', email: 'ash@mail.com' }]]);
    const res = await request(app).get('/pedidos').set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(200);
    expect(res.body[0].cliente).toBe('Ash');
  });

  test('un id que no es número devuelve 404 sin consultar la base', async () => {
    const res = await request(app).get('/pedidos/abc').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(db.query).not.toHaveBeenCalled();
  });

  test('el detalle no expone el id interno del usuario', async () => {
    db.query
      .mockResolvedValueOnce([[{ id: 5, usuario_id: 2, estado: 'pagado', total: 3000 }]])
      .mockResolvedValueOnce([[]]);
    const res = await request(app).get('/pedidos/5').set('Authorization', `Bearer ${token}`);
    expect(res.body.usuario_id).toBeUndefined();
  });

  test('un cliente no puede ver el pedido de otro (404)', async () => {
    db.query.mockResolvedValueOnce([[{ id: 5, usuario_id: 99, estado: 'pagado', total: 100 }]]);
    const res = await request(app).get('/pedidos/5').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test('el dueño ve el detalle de su pedido', async () => {
    db.query
      .mockResolvedValueOnce([[{ id: 5, usuario_id: 2, estado: 'pagado', total: 3000 }]])
      .mockResolvedValueOnce([[{ producto_id: 1, nombre: 'Carta', cantidad: 2, precio_unitario: 1500 }]]);
    const res = await request(app).get('/pedidos/5').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });

  test('un cliente no puede cambiar estados (403)', async () => {
    const res = await request(app).patch('/pedidos/5/estado').set('Authorization', `Bearer ${token}`).send({ estado: 'enviado' });
    expect(res.status).toBe(403);
  });

  test('un estado inexistente devuelve 400', async () => {
    const res = await request(app).patch('/pedidos/5/estado').set('Authorization', `Bearer ${tokenAdmin}`).send({ estado: 'perdido' });
    expect(res.status).toBe(400);
  });

  test('un pedido enviado no se puede cancelar (409)', async () => {
    conn.query.mockResolvedValueOnce([[{ id: 5, estado: 'enviado' }]]);
    const res = await request(app).patch('/pedidos/5/estado').set('Authorization', `Bearer ${tokenAdmin}`).send({ estado: 'cancelado' });
    expect(res.status).toBe(409);
    expect(conn.commit).not.toHaveBeenCalled();
  });

  test('cancelar un pedido pagado devuelve el stock', async () => {
    conn.query.mockResolvedValueOnce([[{ id: 5, estado: 'pagado' }]]).mockResolvedValue([{}]);
    const res = await request(app).patch('/pedidos/5/estado').set('Authorization', `Bearer ${tokenAdmin}`).send({ estado: 'cancelado' });
    expect(res.status).toBe(200);
    expect(conn.query.mock.calls[1][0]).toMatch(/cancelar_pedido/); // la función de la base devuelve el stock
    expect(conn.commit).toHaveBeenCalled();
  });
});
