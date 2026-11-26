require('dotenv').config();

const prod = process.env.NODE_ENV === 'production';

// Si falta algo crítico, mejor no arrancar que arrancar inseguro
if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en el archivo .env');
  process.exit(1);
}
if (prod) {
  if (process.env.JWT_SECRET.length < 32) {
    console.error('JWT_SECRET es demasiado corto: usá al menos 32 caracteres aleatorios.');
    process.exit(1);
  }
  if (!process.env.CORS_ORIGIN) {
    console.error('En producción hay que definir CORS_ORIGIN (dominio del frontend).');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('Falta DATABASE_URL (cadena de conexión de Supabase).');
    process.exit(1);
  }
}

const app = require('./app');
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API PokeCard escuchando en http://localhost:${PORT}`));
