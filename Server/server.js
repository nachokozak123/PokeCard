require('dotenv').config();
const express = require('express');
const cors = require('cors');

const productosRouter = require('./src/routes/productos');
const usuariosRouter = require('./src/routes/usuarios');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/productos', productosRouter);
app.use('/usuarios', usuariosRouter);

app.get('/', (req, res) => {
  res.json({ mensaje: 'API de PokeCard funcionando' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
