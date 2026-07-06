// src/app/api/sql-analyzer/route.js
// Valida y explica queries SQL sin ejecutarlas

import { Pool } from "pg";

let pool = null;
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 8000,
      max: 2,
      ssl: process.env.DATABASE_URL?.includes("neon.tech") || process.env.DATABASE_URL?.includes("supabase")
        ? { rejectUnauthorized: false } : false,
    });
    pool.on("connect", (c) => c.query("SET search_path TO invme, public"));
  }
  return pool;
}

export async function POST(request) {
  try {
    const { sql } = await request.json();
    if (!sql?.trim()) {
      return Response.json({ ok: false, error: "Query vacía" }, { status: 400 });
    }

    const connStr = process.env.DATABASE_URL;
    if (!connStr) {
      return Response.json({ ok: false, error: "DATABASE_URL no configurada" }, { status: 500 });
    }

    const db = getPool();
    let client;
    try {
      client = await db.connect();
    } catch (e) {
      return Response.json({ ok: false, error: `Sin conexión: ${e.message}` });
    }

    try {
      // Wrapeamos en transacción para no ejecutar DML/DDL
      await client.query("BEGIN");
      let plan = null;
      let syntaxError = null;

      try {
        const result = await client.query(`EXPLAIN (FORMAT JSON, VERBOSE true, COSTS true) ${sql}`);
        plan = result.rows[0]["QUERY PLAN"];
      } catch (explainErr) {
        syntaxError = {
          message: explainErr.message,
          detail: explainErr.detail || null,
          hint: explainErr.hint || null,
          position: explainErr.position || null,
          code: explainErr.code || null,
        };
      } finally {
        await client.query("ROLLBACK");
      }

      client.release();

      if (syntaxError) {
        return Response.json({ ok: false, syntaxError });
      }

      // Extraer tablas del plan
      const tables = extractTablesFromPlan(plan?.[0]?.Plan);

      return Response.json({ ok: true, plan: plan?.[0]?.Plan, tables });
    } catch (err) {
      try { await client.query("ROLLBACK"); client.release(); } catch (_) {}
      return Response.json({ ok: false, error: err.message });
    }
  } catch (err) {
    return Response.json({ ok: false, error: `Error interno: ${err.message}` }, { status: 500 });
  }
}

function extractTablesFromPlan(node, found = new Set()) {
  if (!node) return [...found];
  if (node["Relation Name"]) found.add(node["Relation Name"]);
  if (node.Plans) node.Plans.forEach(p => extractTablesFromPlan(p, found));
  return [...found];
}
