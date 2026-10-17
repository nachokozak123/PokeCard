// Tests de permisos por rol (cliente vs admin)
jest.mock('../src/db', () => ({ query: jest.fn() }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const db = require('../src/db');
const app = require('../src/app');

const tokenAdmin = jwt.sign({ id: 1, nombre: 'Admin', rol: 'admin' }, process.env.JWT_SECRET);
const tokenCliente = jwt.sign({ id: 2, nombre: 'Cliente', rol: 'cliente' }, process.env.JWT_SECRET);
const productoValido = { nombre: 'Carta Holo Hielo', precio: 3500, stock: 5, categoria_id: 1 };

beforeEach(() => db.query.mockReset());

describe('Permisos', () => {
  test('crear producto sin token devuelve 401', async () => {
    const res = await request(app).post('/productos').send(productoValido);
    expect(res.status).toBe(401);
  });

  test('crear producto con token inválido devuelve 401', async () => {
    const res = await request(app).post('/productos').set('Authorization', 'Bearer token.falso.123').send(productoValido);
    expect(res.status).toBe(401);
  });

  test('un cliente no puede crear productos (403)', async () => {
    const res = await request(app).post('/productos').set('Authorization', `Bearer ${tokenCliente}`).send(productoValido);
    expect(res.status).toBe(403);
    expect(db.query).not.toHaveBeenCalled();
  });

  test('un cliente no puede ver el dashboard (403)', async () => {
    const res = await request(app).get('/admin/dashboard').set('Authorization', `Bearer ${tokenCliente}`);
    expect(res.status).toBe(403);
  });

  test('un admin puede crear un producto (201)', async () => {
    db.query.mockResolvedValueOnce([{ insertId: 10 }]);
    const res = await request(app).post('/productos').set('Authorization', `Bearer ${tokenAdmin}`).send(productoValido);
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(10);
  });
});
