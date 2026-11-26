// Sesiones con JWT guardado en una cookie httpOnly (JavaScript del navegador no puede leerla)
const jwt = require('jsonwebtoken');
const db = require('./db');

const COOKIE = 'pc_sesion';
const DURACION_MS = 2 * 60 * 60 * 1000; // 2 horas

// Error con código HTTP: lo usa el manejador de errores de server.js para responder
class ErrorHttp extends Error {
  constructor(status, mensaje) { super(mensaje); this.status = status; }
}

function iniciarSesion(res, usuario) {
  const token = jwt.sign({ sub: usuario.id }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '2h' });
  res.cookie(COOKIE, token, {
    httpOnly: true,                                  // protege contra robo por XSS
    sameSite: 'strict',                              // protege contra CSRF
    secure: process.env.NODE_ENV === 'production',   // solo HTTPS en producción
    maxAge: DURACION_MS,
    path: '/api',
  });
}

function cerrarSesion(res) {
  res.clearCookie(COOKIE, { path: '/api' });
}

function leerCookie(req) {
  const par = (req.headers.cookie || '').split(';').map((c) => c.trim()).find((c) => c.startsWith(COOKIE + '='));
  return par ? decodeURIComponent(par.slice(COOKIE.length + 1)) : null;
}

// Exige una sesión válida. El usuario se vuelve a leer de la base en cada petición:
// si se borra o le cambian el rol, el cambio aplica en el acto.
async function verificarToken(req, res, next) {
  const token = leerCookie(req);
  if (!token) throw new ErrorHttp(401, 'Tenés que iniciar sesión');
  let datos;
  try {
    datos = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    cerrarSesion(res);
    throw new ErrorHttp(401, 'Tu sesión venció. Volvé a ingresar.');
  }
  const { rows } = await db.query('SELECT id, nombre, email, rol FROM usuario WHERE id = $1', [datos.sub]);
  if (!rows[0]) {
    cerrarSesion(res);
    throw new ErrorHttp(401, 'Tu sesión ya no es válida');
  }
  req.usuario = rows[0];
  next();
}

// Solo deja pasar a administradores (usar después de verificarToken)
function soloAdmin(req, res, next) {
  if (req.usuario?.rol !== 'admin') throw new ErrorHttp(403, 'Acceso solo para administradores');
  next();
}

// Convierte ":id" en número entero positivo o responde 404
function idValido(valor) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id < 1) throw new ErrorHttp(404, 'No encontrado');
  return id;
}

const tieneSesion = (req) => Boolean(leerCookie(req));

module.exports = { tieneSesion, iniciarSesion, cerrarSesion, verificarToken, soloAdmin, idValido, ErrorHttp };
