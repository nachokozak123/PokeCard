// Tests del CRUD de productos y del dashboard
jest.mock('../src/db', () => ({ query: jest.fn() }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const db = require('../src/db');
const app = require('../src/app');

const auth = { Authorization: `Bearer ${jwt.sign({ id: 1, rol: 'admin' }, process.env.JWT_SECRET)}` };

beforeEach(() => db.query.mockReset());

describe('Productos (lectura pública)', () => {
  test('GET /productos devuelve la lista', async () => {
    db.query.mockResolvedValueOnce([[{ id: 1, nombre: 'Carta Holo Fuego' }, { id: 2, nombre: 'Carta Holo Agua' }]]);
    const res = await request(app).get('/productos');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('GET /productos/:id inexistente devuelve 404', async () => {
    db.query.mockResolvedValueOnce([[]]);
    const res = await request(app).get('/productos/999');
    expect(res.status).toBe(404);
  });

  test('el orden solo acepta valores permitidos (evita inyección SQL)', async () => {
    db.query.mockResolvedValueOnce([[]]);
    await request(app).get('/productos').query({ orden: 'precio; DROP TABLE producto' });
    const sql = db.query.mock.calls[0][0];
    expect(sql).not.toMatch(/DROP/i);
    expect(sql).toMatch(/ORDER BY p\.id DESC/);
  });
});

describe('Productos (CRUD admin)', () => {
  test('crear con precio negativo devuelve 400', async () => {
    const res = await request(app).post('/productos').set(auth)
      .send({ nombre: 'X', precio: -5, stock: 1, categoria_id: 1 });
    expect(res.status).toBe(400);
  });

  test('editar un producto inexistente devuelve 404', async () => {
    db.query.mockResolvedValueOnce([{ affectedRows: 0 }]);
    const res = await request(app).put('/productos/999').set(auth)
      .send({ nombre: 'X', precio: 10, stock: 1, categoria_id: 1 });
    expect(res.status).toBe(404);
  });

  test('eliminar un producto con pedidos asociados devuelve 409', async () => {
    db.query.mockRejectedValueOnce(Object.assign(new Error('fk'), { code: 'ER_ROW_IS_REFERENCED_2' }));
    const res = await request(app).delete('/productos/1').set(auth);
    expect(res.status).toBe(409);
  });
});

describe('Dashboard', () => {
  test('el admin recibe las métricas del panel', async () => {
    db.query
      .mockResolvedValueOnce([[{ total: 9, valor_inventario: '250000.00' }]])
      .mockResolvedValueOnce([[{ total: 4 }]])
      .mockResolvedValueOnce([[{ total: 2, ventas: '12000.00' }]])
      .mockResolvedValueOnce([[{ id: 6, nombre: 'Carta Holo Sombra', stock: 2 }]])
      .mockResolvedValueOnce([[{ categoria: 'Cartas sueltas', cantidad: 6 }]])
      .mockResolvedValueOnce([[]]);
    const res = await request(app).get('/admin/dashboard').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ totalProductos: 9, totalClientes: 4, totalPedidos: 2, ventasTotales: 12000 });
    expect(res.body.stockBajo).toHaveLength(1);
  });
});
