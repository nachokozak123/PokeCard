// Tests de registro, login y encriptado de contraseñas
jest.mock('../src/db', () => ({ query: jest.fn() }));

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../src/db');
const app = require('../src/app');

beforeEach(() => db.query.mockReset());

describe('POST /usuarios/registro', () => {
  test('guarda la contraseña encriptada (hash) y fuerza el rol "cliente"', async () => {
    db.query
      .mockResolvedValueOnce([[]])                  // el email no existe todavía
      .mockResolvedValueOnce([{ insertId: 7 }]);    // INSERT

    const res = await request(app)
      .post('/usuarios/registro')
      .send({ nombre: 'Ash', email: 'ash@mail.com', password: 'pikachu123', rol: 'admin' });

    expect(res.status).toBe(201);
    expect(res.body.rol).toBe('cliente');           // ignora el rol enviado por el usuario
    expect(res.body.contrasena_hash).toBeUndefined();

    const params = db.query.mock.calls[1][1];       // parámetros del INSERT
    const hashGuardado = params[2];
    expect(hashGuardado).not.toBe('pikachu123');    // no es texto plano
    expect(await bcrypt.compare('pikachu123', hashGuardado)).toBe(true);
  });

  test('rechaza un email ya registrado (409)', async () => {
    db.query.mockResolvedValueOnce([[{ id: 1 }]]);
    const res = await request(app)
      .post('/usuarios/registro')
      .send({ nombre: 'Ash', email: 'ash@mail.com', password: 'pikachu123' });
    expect(res.status).toBe(409);
  });

  test('rechaza una contraseña de menos de 6 caracteres (400)', async () => {
    const res = await request(app)
      .post('/usuarios/registro')
      .send({ nombre: 'Ash', email: 'ash@mail.com', password: '123' });
    expect(res.status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });
});

describe('POST /usuarios/login', () => {
  const usuarioBD = {
    id: 3, nombre: 'Misty', email: 'misty@mail.com', rol: 'cliente',
    contrasena_hash: bcrypt.hashSync('starmie456', 4),
  };

  test('con credenciales correctas devuelve un token JWT válido', async () => {
    db.query.mockResolvedValueOnce([[usuarioBD]]);
    const res = await request(app).post('/usuarios/login').send({ email: 'misty@mail.com', password: 'starmie456' });

    expect(res.status).toBe(200);
    const payload = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(payload).toMatchObject({ id: 3, rol: 'cliente' });
    expect(res.body.usuario.contrasena_hash).toBeUndefined();
  });

  test('con contraseña incorrecta devuelve 401', async () => {
    db.query.mockResolvedValueOnce([[usuarioBD]]);
    const res = await request(app).post('/usuarios/login').send({ email: 'misty@mail.com', password: 'incorrecta' });
    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });
});
