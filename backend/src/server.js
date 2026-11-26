const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

// Sin estas variables el servidor no arranca (evita publicar algo inseguro por olvido)
if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL en el archivo .env (ver README).');
  process.exit(1);
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET falta o es muy corto (mínimo 32 caracteres).');
  process.exit(1);
}

const app = express();
const produccion = process.env.NODE_ENV === 'production';
if (produccion) app.set('trust proxy', 1); // detrás del proxy del hosting (Render, Railway…)

// Encabezados de seguridad (CSP, anti-clickjacking, no revelar la tecnología, etc.)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'img-src': ["'self'", 'data:', 'https:'],
      'connect-src': ["'self'"],
    },
  },
}));

app.use(express.json({ limit: '50kb' }));

// Límite general de peticiones a la API y uno más estricto para login y registro
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 300 }));
const limiteCuentas = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: { error: 'Demasiados intentos desde tu conexión. Esperá unos minutos.' },
});
app.use('/api/usuarios/login', limiteCuentas);
app.use('/api/usuarios/registro', limiteCuentas);

// Rutas de la API
const { categorias, proveedores } = require('./routes/catalogos');
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/categorias', categorias);
app.use('/api/proveedores', proveedores);
app.use('/api/pedidos', require('./routes/pedidos'));
app.use('/api/admin', require('./routes/admin'));
app.get('/api', (req, res) => res.json({ api: 'PokeCard', estado: 'ok' }));
app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// En producción el mismo servidor entrega la página (frontend/dist): un solo dominio, sin CORS
const dist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('/{*ruta}', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// Manejador único de errores: mensajes claros y sin detalles internos
const ERRORES_PG = {
  23505: [409, 'Ya existe un registro con ese nombre o email'],
  23503: [409, 'No se puede completar: hay datos relacionados'],
  23514: [400, 'Algún dato no cumple las reglas (por ejemplo, un número negativo)'],
  '22P02': [400, 'Algún dato tiene un formato inválido'],
};
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'La petición es demasiado grande' });
  if (err.status) return res.status(err.status).json({ error: err.message });
  if (ERRORES_PG[err.code]) {
    const [status, mensaje] = ERRORES_PG[err.code];
    return res.status(status).json({ error: mensaje });
  }
  console.error(err);
  res.status(500).json({ error: 'Error del servidor' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`PokeCard escuchando en http://localhost:${PORT}`));
