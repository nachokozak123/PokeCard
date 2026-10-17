const jwt = require('jsonwebtoken');

// Verifica que la petición traiga un token JWT válido: "Authorization: Bearer <token>"
function verificarToken(req, res, next) {
  const [tipo, token] = (req.headers.authorization || '').split(' ');
  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET); // { id, nombre, rol }
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

module.exports = { verificarToken, soloAdmin };
