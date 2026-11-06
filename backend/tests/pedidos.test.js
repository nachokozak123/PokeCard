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

beforeEach(() => {
  Object.values(conn).forEach((f) => f.mockReset());
  db.query.mockReset();
  conn.rollback.mockResolvedValue();
  db.getConnection.mockReset().mockResolvedValue(conn);
});

describe('POST /pedidos', () => {
  test('sin token devuelve 401', async () => {
    const res = await request(app).post('/pedidos').send({ items, tarjeta });
    expect(res.status).toBe(401);
  });

  test('carrito vacío devuelve 400', async () => {
    const res = await request(app).post('/pedidos').set('Authorization', `Bearer ${token}`).send({ items: [], tarjeta });
    expect(res.status).toBe(400);
  });

  test('tarjeta inválida devuelve 400 y no toca la base', async () => {
    const res = await request(app).post('/pedidos').set('Authorization', `Bearer ${token}`)
      .send({ items, tarjeta: { ...tarjeta, numero: '1234 5678 9012 3456' } });
    expect(res.status).toBe(400);
    expect(db.getConnection).not.toHaveBeenCalled();
  });

  test('stock insuficiente devuelve 409 y revierte', async () => {
    conn.query.mockResolvedValueOnce([[{ id: 1, nombre: 'Carta', precio: 1000, stock: 1 }]]);
    const res = await request(app).post('/pedidos').set('Authorization', `Bearer ${token}`).send({ items, tarjeta });
    expect(res.status).toBe(409);
    expect(conn.rollback).toHaveBeenCalled();
  });

  test('tarjeta terminada en 0002 es rechazada (402) y no crea pedido', async () => {
    conn.query.mockResolvedValueOnce([[{ id: 1, nombre: 'Carta', precio: 1000, stock: 5 }]]);
    const res = await request(app).post('/pedidos').set('Authorization', `Bearer ${token}`)
      .send({ items, tarjeta: { ...tarjeta, numero: '4000 0000 0000 0002' } });
    expect(res.status).toBe(402);
    expect(conn.commit).not.toHaveBeenCalled();
  });

  test('pago aprobado crea el pedido, calcula el total y no devuelve el número completo', async () => {
    conn.query
      .mockResolvedValueOnce([[{ id: 1, nombre: 'Carta', precio: 1500, stock: 5 }]])
      .mockResolvedValueOnce([{ insertId: 7 }])
      .mockResolvedValue([{}]);
    const res = await request(app).post('/pedidos').set('Authorization', `Bearer ${token}`).send({ items, tarjeta });
    expect(res.status).toBe(201);
    expect(res.body.total).toBe(3000);
    expect(res.body.tarjeta_last4).toBe('1111');
    expect(JSON.stringify(res.body)).not.toContain('4111');
    expect(conn.commit).toHaveBeenCalled();
  });

  test('tarjeta vencida devuelve 400 y no toca la base', async () => {
    const res = await request(app).post('/pedidos').set('Authorization', `Bearer ${token}`)
      .send({ items, tarjeta: { ...tarjeta, vencimiento: '01/20' } });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/vencida/);
    expect(db.getConnection).not.toHaveBeenCalled();
  });

  test('si el producto viene repetido en el carrito, se suman las cantidades', async () => {
    conn.query.mockResolvedValueOnce([[{ id: 1, nombre: 'Carta', precio: 1000, stock: 3 }]]);
    const res = await request(app).post('/pedidos').set('Authorization', `Bearer ${token}`)
      .send({ items: [{ producto_id: 1, cantidad: 2 }, { producto_id: 1, cantidad: 2 }], tarjeta });
    expect(res.status).toBe(409); // pide 4 y hay 3
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
    expect(conn.query.mock.calls[1][0]).toMatch(/stock = p.stock \+ d.cantidad/);
    expect(conn.commit).toHaveBeenCalled();
  });
});
