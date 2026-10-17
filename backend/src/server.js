require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en el archivo .env');
  process.exit(1);
}

const app = require('./app');
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API PokeCard escuchando en http://localhost:${PORT}`));
