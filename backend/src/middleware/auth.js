const jwt = require('jsonwebtoken');

// Verifica que la petición traiga un token JWT válido: "Authorization: Bearer <token>"
function verificarToken(req, res, next) {
  const [tipo, token] = (req.headers.authorization || '').split(' ');
  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    // Se fija el algoritmo: evita ataques que cambian el "alg" del token
    req.usuario = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }); // { id, nombre, rol }
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido o vencido' });
  }
}

// Permite el paso solo a usuarios con rol "admin" (usar después de verificarToken)
function soloAdmin(req, res, next) {
  if (!req.usuario || req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso solo para administradores' });
  }
  next();
}

// Los ids de la URL deben ser enteros positivos (evita errores 500 y consultas raras)
function idValido(req, res, next) {
  if (!/^\d{1,15}$/.test(req.params.id) || Number(req.params.id) < 1) {
    return res.status(404).json({ error: 'No encontrado' });
  }
  next();
}

// Limitadores de ritmo para rutas sensibles (se desactivan en los tests)
const rateLimit = require('express-rate-limit');
function limitar({ minutos, max, mensaje }) {
  if (process.env.NODE_ENV === 'test') return (req, res, next) => next();
  return rateLimit({
    windowMs: minutos * 60 * 1000,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: mensaje },
  });
}

module.exports = { verificarToken, soloAdmin, idValido, limitar };
