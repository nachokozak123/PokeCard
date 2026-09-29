require('dotenv').config();
const express = require('express');
const cors = require('cors');

const productosRouter = require('./src/routes/productos');
const usuariosRouter = require('./src/routes/usuarios');
const carritoRouter = require('./src/routes/carrito');
const pedidosRouter = require('./src/routes/pedidos');
const verificarToken = require('./src/middleware/auth');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/productos', productosRouter);
app.use('/usuarios', usuariosRouter);
app.use('/carrito', verificarToken, carritoRouter);
app.use('/pedidos', verificarToken, pedidosRouter);

app.get('/', (req, res) => {
  res.json({ mensaje: 'API de PokeCard funcionando' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
