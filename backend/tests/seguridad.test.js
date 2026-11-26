// Tests de cabeceras de seguridad, CORS, adaptador de base de datos y validación de catálogos
jest.mock('pg', () => ({ Pool: jest.fn(() => ({ query: jest.fn(), connect: jest.fn(), end: jest.fn() })), types: { setTypeParser: jest.fn() } }));
const request = require('supertest');
const jwt = require('jsonwebtoken');

describe('Cabeceras de seguridad', () => {
  const app = require('../src/app');
  test('helmet agrega HSTS, nosniff y bloquea iframes; no revela Express', async () => {
    const res = await request(app).get('/');
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toMatch(/frame-ancestors 'none'/);
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  test('el cuerpo máximo es 20kb (413)', async () => {
    const res = await request(app).post('/usuarios/login').send({ email: 'a@b.com', password: 'x'.repeat(30000) });
    expect(res.status).toBe(413);
  });
});

describe('Adaptador de base de datos (? -> $n)', () => {
  const { _convertir } = require('../src/db');

  test('numera los parámetros', () => {
    expect(_convertir('SELECT * FROM t WHERE a = ? AND b = ?', [1, 'x'])).toEqual({
      texto: 'SELECT * FROM t WHERE a = $1 AND b = $2', valores: [1, 'x'],
    });
  });

  test('expande arrays para IN (?)', () => {
    expect(_convertir('WHERE id IN (?) AND x = ?', [[4, 5, 6], 'a'])).toEqual({
      texto: 'WHERE id IN ($1, $2, $3) AND x = $4', valores: [4, 5, 6, 'a'],
    });
  });

  test('un valor malicioso nunca se pega en el texto SQL', () => {
    const { texto, valores } = _convertir('WHERE nombre = ?', ["'; DROP TABLE usuario; --"]);
    expect(texto).toBe('WHERE nombre = $1');
    expect(valores[0]).toContain('DROP TABLE');
  });
});

describe('Categorías y proveedores: validación de tipos', () => {
  const db = require('../src/db');
  const app = require('../src/app');
  const admin = { Authorization: `Bearer ${jwt.sign({ id: 1, rol: 'admin' }, process.env.JWT_SECRET)}` };

  test('un nombre que no es texto devuelve 400 (no 500)', async () => {
    const res = await request(app).post('/categorias').set(admin).send({ nombre: { $gt: '' } });
    expect(res.status).toBe(400);
  });

  test('no refleja campos extra del body en la respuesta', async () => {
    jest.spyOn(db, 'query').mockResolvedValueOnce([{ insertId: 9 }]);
    const res = await request(app).post('/categorias').set(admin).send({ nombre: 'Promos', rol: 'admin', extra: 1 });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 9, nombre: 'Promos' });
  });

  test('id inválido devuelve 404 sin consultar', async () => {
    const res = await request(app).delete('/categorias/1%20OR%201=1').set(admin);
    expect(res.status).toBe(404);
  });
});

describe('Productos: imagen y límites', () => {
  const db = require('../src/db');
  const app = require('../src/app');
  const admin = { Authorization: `Bearer ${jwt.sign({ id: 1, rol: 'admin' }, process.env.JWT_SECRET)}` };
  const base = { nombre: 'X', precio: 10, stock: 1, categoria_id: 1 };

  test.each(['javascript:alert(1)', 'data:text/html,<script>1</script>', 'ftp://x.com/a.png'])('rechaza imagen %s', async (imagen) => {
    const res = await request(app).post('/productos').set(admin).send({ ...base, imagen });
    expect(res.status).toBe(400);
  });

  test('rechaza precios y stocks absurdos', async () => {
    expect((await request(app).post('/productos').set(admin).send({ ...base, precio: 1e12 })).status).toBe(400);
    expect((await request(app).post('/productos').set(admin).send({ ...base, stock: 1e9 })).status).toBe(400);
  });

  test('acepta una imagen https y no refleja campos que no son del producto', async () => {
    jest.spyOn(db, 'query').mockResolvedValueOnce([{ insertId: 4 }]);
    const res = await request(app).post('/productos').set(admin).send({ ...base, imagen: 'https://x.com/a.png', rol: 'admin' });
    expect(res.status).toBe(201);
    expect(res.body.rol).toBeUndefined();
  });
});
