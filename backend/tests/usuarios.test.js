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

  test('después de 5 intentos fallidos bloquea el login (429)', async () => {
    db.query.mockResolvedValue([[]]);
    for (let i = 0; i < 5; i++) {
      await request(app).post('/usuarios/login').send({ email: 'brock@mail.com', password: 'mala' });
    }
    const res = await request(app).post('/usuarios/login').send({ email: 'brock@mail.com', password: 'mala' });
    expect(res.status).toBe(429);
  });
});

describe('Errores generales', () => {
  test('un JSON mal formado devuelve 400 en JSON', async () => {
    const res = await request(app).post('/usuarios/login').set('Content-Type', 'application/json').send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/JSON/);
  });

  test('una ruta inexistente devuelve 404', async () => {
    const res = await request(app).get('/no-existe');
    expect(res.status).toBe(404);
  });
});


describe('Política de contraseñas y login seguro', () => {
  const reg = (password) => request(app).post('/usuarios/registro').send({ nombre: 'Ash', email: 'ash@mail.com', password });

  test.each([
    ['corta', 'abc123'],
    ['solo letras', 'pikachupikachu'],
    ['solo números', '123456789'],
  ])('rechaza una contraseña %s', async (_n, pass) => {
    const res = await reg(pass);
    expect(res.status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });

  test('rechaza contraseñas de más de 72 caracteres (bcrypt ignora el resto)', async () => {
    const res = await reg('a1' + 'x'.repeat(80));
    expect(res.status).toBe(400);
  });

  test('un email repetido que se cuela por una carrera igual devuelve 409 (no 500)', async () => {
    db.query.mockResolvedValueOnce([[]]).mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' }));
    const res = await reg('pikachu123');
    expect(res.status).toBe(409);
  });

  test('el login compara el hash aunque el email no exista (mismo tiempo, mismo mensaje)', async () => {
    db.query.mockResolvedValueOnce([[]]);
    const spy = jest.spyOn(bcrypt, 'compare');
    const res = await request(app).post('/usuarios/login').send({ email: 'nadie@mail.com', password: 'cualquiera1' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Credenciales inválidas');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test('una cuenta desactivada no puede iniciar sesión', async () => {
    const hash = await bcrypt.hash('starmie456', 4);
    db.query.mockResolvedValueOnce([[{ id: 3, nombre: 'Misty', email: 'm@mail.com', contrasena_hash: hash, rol: 'cliente', activo: false }]]);
    const res = await request(app).post('/usuarios/login').send({ email: 'm@mail.com', password: 'starmie456' });
    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });

  test('el login rechaza tipos que no son texto (inyección NoSQL/objetos)', async () => {
    const res = await request(app).post('/usuarios/login').send({ email: { $ne: '' }, password: { $ne: '' } });
    expect(res.status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });

  test('el token usa HS256 y un token firmado con otro algoritmo o sin firma se rechaza', async () => {
    const sinFirma = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
      + '.' + Buffer.from(JSON.stringify({ id: 1, rol: 'admin' })).toString('base64url') + '.';
    const res = await request(app).get('/admin/dashboard').set('Authorization', `Bearer ${sinFirma}`);
    expect(res.status).toBe(401);
    const hs512 = jwt.sign({ id: 1, rol: 'admin' }, process.env.JWT_SECRET, { algorithm: 'HS512' });
    expect((await request(app).get('/admin/dashboard').set('Authorization', `Bearer ${hs512}`)).status).toBe(401);
  });
});
