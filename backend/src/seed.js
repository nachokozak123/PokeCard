// Carga datos iniciales: categorías, proveedores, productos de ejemplo y dos usuarios.
// Uso: npm run seed   (la base debe existir: ejecutar antes database/schema.sql)
const bcrypt = require('bcryptjs');
const db = require('./db');

async function seed() {
  const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM categoria');
  if (total > 0) {
    console.log('La base ya tiene datos. No se cargó nada.');
    return;
  }

  await db.query("INSERT INTO categoria (nombre) VALUES ('Cartas sueltas'), ('Sobres'), ('Mazos'), ('Accesorios')");
  await db.query("INSERT INTO proveedor (nombre, contacto) VALUES ('Distribuidora Kanto', 'ventas@kanto.example'), ('Johto Import', 'contacto@johto.example')");

  const holo = (nombre, precio, stock, desc) => [nombre, desc, precio, stock, 'Base Set', 'Rara Holo', null, 1, 1];
  const productos = [
    holo('Carta Holo Fuego', 4500, 10, 'Carta holográfica de colección, tipo Fuego.'),
    holo('Carta Holo Agua', 5200, 8, 'Carta holográfica de colección, tipo Agua.'),
    holo('Carta Holo Planta', 2800, 12, 'Carta holográfica de colección, tipo Planta.'),
    holo('Carta Holo Eléctrica', 6100, 4, 'Carta holográfica de colección, tipo Eléctrico.'),
    holo('Carta Holo Psíquica', 7300, 3, 'Carta holográfica de colección, tipo Psíquico.'),
    holo('Carta Holo Sombra', 9900, 2, 'Carta holográfica de colección, tipo Fantasma.'),
    ['Sobre Booster', 'Sobre sellado de 10 cartas.', 3200, 40, 'Base Set', 'Común', null, 2, 2],
    ['Mazo Inicial', 'Mazo listo para jugar de 60 cartas.', 15000, 15, 'Base Set', 'Común', null, 3, 2],
    ['Fundas protectoras x50', 'Fundas de colores para proteger tus cartas.', 2500, 60, null, null, null, 4, 2],
  ];
  for (const p of productos) {
    await db.query(
      `INSERT INTO producto (nombre, descripcion, precio, stock, coleccion, rareza, imagen, categoria_id, proveedor_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, p);
  }

  const hashAdmin = await bcrypt.hash('Admin123', 10);
  const hashCliente = await bcrypt.hash('Cliente123', 10);
  await db.query(
    'INSERT INTO usuario (nombre, email, contrasena_hash, rol) VALUES (?, ?, ?, ?), (?, ?, ?, ?)',
    ['Administrador', 'admin@pokecard.com', hashAdmin, 'admin', 'Cliente Demo', 'cliente@pokecard.com', hashCliente, 'cliente']
  );

  console.log('Datos de ejemplo cargados.');
  console.log('  Admin:   admin@pokecard.com   / Admin123');
  console.log('  Cliente: cliente@pokecard.com / Cliente123');
}

seed()
  .catch((e) => { console.error('Error al cargar datos:', e.message); process.exitCode = 1; })
  .finally(() => db.end());
