const express = require('express');
const cors = require('cors');

const app = express();
app.disable('x-powered-by'); // no revelar que el servidor usa Express

// En producción, CORS_ORIGIN limita qué dominios pueden usar la API (ej. https://pokecard.com.ar)
const origenes = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()) : '*';
app.use(cors({ origin: origenes }));
app.use(express.json({ limit: '100kb' }));

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
