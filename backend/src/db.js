// Conexión a PostgreSQL (Supabase) mediante un pool.
//
// Las rutas usan la forma `db.query('... WHERE id = ?', [x])` y reciben `[filas]` en un SELECT o
// `[{ insertId, affectedRows }]` en INSERT/UPDATE/DELETE. Este archivo traduce eso a PostgreSQL
// ($1, $2... / RETURNING id) para que el resto del código no dependa del motor.
require('dotenv').config();
const { Pool, types } = require('pg');

// bigint (COUNT, ids) -> Number. numeric (precios) se deja como string para no perder precisión.
types.setTypeParser(20, (v) => Number(v));

const url = process.env.DATABASE_URL;
const esLocal = !url || /@(localhost|127\.0\.0\.1)/.test(url);

const pool = new Pool({
  connectionString: url || 'postgresql://postgres:postgres@localhost:5432/pokecard',
  max: Number(process.env.DB_POOL_MAX) || 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // Supabase exige SSL. Para validar el certificado, descargá el CA desde el panel de Supabase
  // (Database > SSL Configuration) y apuntá DB_SSL_CA a ese archivo.
  ssl: esLocal ? false : {
    rejectUnauthorized: Boolean(process.env.DB_SSL_CA),
    ca: process.env.DB_SSL_CA ? require('fs').readFileSync(process.env.DB_SSL_CA, 'utf8') : undefined,
  },
});

// "?" -> $1, $2... ; un parámetro array (IN (?)) se expande a ($1, $2, ...)
function convertir(sql, params = []) {
  const valores = [];
  let i = 0;
  const texto = sql.replace(/\?/g, () => {
    const p = params[i++];
    if (Array.isArray(p)) {
      if (p.length === 0) { valores.push(null); return `$${valores.length}`; }
      return p.map((x) => { valores.push(x); return `$${valores.length}`; }).join(', ');
    }
    valores.push(p);
    return `$${valores.length}`;
  });
  return { texto, valores };
}

// Mapea errores de PostgreSQL a los códigos que ya manejan las rutas
function traducirError(e) {
  if (e.code === '23505') e.code = 'ER_DUP_ENTRY';
  else if (e.code === '23503') {
    e.code = /still referenced/i.test(e.detail || '') ? 'ER_ROW_IS_REFERENCED_2' : 'ER_NO_REFERENCED_ROW_2';
  }
  return e;
}

async function ejecutar(ejecutor, sql, params) {
  let { texto, valores } = convertir(sql, params);
  const esInsert = /^\s*INSERT\b/i.test(texto) && !/\bRETURNING\b/i.test(texto);
  if (esInsert) texto += ' RETURNING id';
  try {
    const r = await ejecutor.query(texto, valores);
    if (r.command === 'SELECT') return [r.rows];
    return [{ insertId: esInsert ? r.rows[0]?.id : undefined, affectedRows: r.rowCount }];
  } catch (e) {
    throw traducirError(e);
  }
}

module.exports = {
  query: (sql, params) => ejecutar(pool, sql, params),

  // Conexión dedicada para transacciones
  async getConnection() {
    const client = await pool.connect();
    return {
      query: (sql, params) => ejecutar(client, sql, params),
      beginTransaction: () => client.query('BEGIN'),
      commit: () => client.query('COMMIT'),
      rollback: () => client.query('ROLLBACK'),
      release: () => client.release(),
    };
  },

  end: () => pool.end(),
  _convertir: convertir, // expuesto para los tests
};
