const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const { categorias, proveedores } = require('./routes/catalogos');

app.use('/usuarios', require('./routes/usuarios'));
app.use('/productos', require('./routes/productos'));
app.use('/categorias', categorias);
app.use('/proveedores', proveedores);
app.use('/admin', require('./routes/admin'));
app.use('/pedidos', require('./routes/pedidos'));

app.get('/', (req, res) => res.json({ api: 'PokeCard', estado: 'ok' }));

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

module.exports = app;
