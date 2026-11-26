// Crea el usuario administrador (y opcionalmente un cliente de prueba).
// El catálogo de ejemplo ya lo carga database/supabase/schema.sql.
//
// Uso:
//   ADMIN_EMAIL=vos@mail.com ADMIN_PASSWORD='UnaClaveLarga123' npm run seed
//   (si no definís ADMIN_PASSWORD, se genera una al azar y se muestra UNA sola vez)
//   SEED_DEMO=1 npm run seed   -> además crea cliente@pokecard.com para probar la tienda
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');

const generar = () => crypto.randomBytes(9).toString('base64url') + 'a1'; // 12 caracteres + letra y número

async function crearUsuario({ nombre, email, password, rol }) {
  const [existe] = await db.query('SELECT id FROM usuario WHERE lower(email) = ?', [email.toLowerCase()]);
  if (existe.length) { console.log(`  ${email}: ya existía, no se tocó.`); return; }
  const hash = await bcrypt.hash(password, 12);
  await db.query('INSERT INTO usuario (nombre, email, contrasena_hash, rol) VALUES (?, ?, ?, ?)', [nombre, email.toLowerCase(), hash, rol]);
  console.log(`  ${rol}: ${email}  contraseña: ${password}`);
}

async function seed() {
  const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM categoria');
  if (total === 0) console.log('Aviso: no hay categorías. ¿Ejecutaste database/supabase/schema.sql?');

  console.log('Usuarios:');
  await crearUsuario({
    nombre: 'Administrador',
    email: process.env.ADMIN_EMAIL || 'admin@pokecard.com',
    password: process.env.ADMIN_PASSWORD || generar(),
    rol: 'admin',
  });
  if (process.env.SEED_DEMO) {
    await crearUsuario({ nombre: 'Cliente Demo', email: 'cliente@pokecard.com', password: process.env.DEMO_PASSWORD || generar(), rol: 'cliente' });
  }
  console.log('Guardá estas contraseñas ahora: no se vuelven a mostrar.');
}

seed()
  .catch((e) => { console.error('Error al cargar datos:', e.message); process.exitCode = 1; })
  .finally(() => db.end());
