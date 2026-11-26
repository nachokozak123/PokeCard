// Conexión a la base de datos de Supabase (PostgreSQL) mediante un pool de conexiones
const { Pool, types } = require('pg');

// PostgreSQL devuelve NUMERIC y COUNT(*) como texto: los convertimos a número
types.setTypeParser(1700, Number); // numeric (precios, totales)
types.setTypeParser(20, Number);   // bigint (resultados de COUNT)

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Supabase exige conexión cifrada (SSL). Solo se desactiva para un PostgreSQL local.
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
  max: 10,
});

// Ejecuta varias consultas como una sola operación: si algo falla, se deshace todo (rollback)
async function transaccion(trabajo) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await trabajo(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (e) {
    await cliente.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    cliente.release();
  }
}

module.exports = { query: (sql, params) => pool.query(sql, params), transaccion, pool };
