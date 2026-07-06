const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://scime:1qazxsw2@192.168.81.60:5432/scime' });

async function test() {
  const client = await pool.connect();
  try {
    const val = '\'{ "color": "rojo" }\'';
    const sql = `SELECT invme.crear_lote($1::varchar, $2::int4, $3::int4, $4::int4, $5::int4, $6::int4, $7::jsonb, $8::varchar, $9::int4, $10::int4)`;
    const params = ['LOTE-PRUEBA-01', 1, 9999, 1, 1, 10, val, null, null, null];
    
    console.log("Running query:", sql, params);
    const result = await client.query(sql, params);
    console.log("Success:", result.rows);
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
}
test();
