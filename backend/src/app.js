const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
app.disable('x-powered-by'); // no revelar que el servidor usa Express

// Detrás de un proxy (Render, Railway, Nginx...) hay que confiar en él para ver la IP real del cliente.
// Ej: TRUST_PROXY=1
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

// Cabeceras de seguridad (HSTS, nosniff, frameguard, etc.). Es una API JSON: CSP estricta.
app.use(helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // el frontend está en otro dominio
}));

// En producción, CORS_ORIGIN limita qué dominios pueden usar la API (ej. https://pokecard.com.ar)
const origenes = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean) : null;
app.use(cors({
  origin: origenes || (process.env.NODE_ENV === 'production' ? false : '*'),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
}));
app.use(express.json({ limit: '20kb' }));

// Límite general por IP (frena scraping y abuso). Se desactiva en los tests.
if (process.env.NODE_ENV !== 'test') {
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Demasiadas peticiones. Probá de nuevo en unos minutos.' },
  }));
}

const { categorias, proveedores } = require('./routes/catalogos');

app.use('/usuarios', require('./routes/usuarios'));
app.use('/productos', require('./routes/productos'));
app.use('/categorias', categorias);
app.use('/proveedores', proveedores);
app.use('/admin', require('./routes/admin'));
app.use('/pedidos', require('./routes/pedidos'));

app.get('/', (req, res) => res.json({ api: 'PokeCard', estado: 'ok' }));

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Errores no controlados (JSON mal formado, cuerpo demasiado grande, etc.)
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'La petición es demasiado grande' });
  console.error(err);
  res.status(500).json({ error: 'Error del servidor' });
});

module.exports = app;
