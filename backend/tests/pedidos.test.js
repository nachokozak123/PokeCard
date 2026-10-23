// Tests del pedido con pago simulado
const conn = { query: jest.fn(), beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn() };
jest.mock('../src/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const db = require('../src/db');
const app = require('../src/app');

const token = jwt.sign({ id: 2, nombre: 'Cliente', rol: 'cliente' }, process.env.JWT_SECRET);
const tarjeta = { numero: '4111 1111 1111 1111', nombre: 'Ash Ketchum', vencimiento: '12/99', cvc: '123' };
const items = [{ producto_id: 1, cantidad: 2 }];

beforeEach(() => {
  Object.values(conn).forEach((f) => f.mockReset());
  conn.rollback.mockResolvedValue();
  db.getConnection.mockResolvedValue(conn);
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
});
