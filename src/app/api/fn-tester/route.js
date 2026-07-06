// src/app/api/fn-tester/route.js
// Introspección genérica del catálogo PostgreSQL + ejecución de funciones

import { getServerPool } from "@/lib/pg-pool";

function getPool(envHeader = "dev") {
  const envVar =
    envHeader === "qa"   ? "QA_DATABASE_URL"   :
    envHeader === "prod" ? "PROD_DATABASE_URL" :
    "DATABASE_URL";
  return getServerPool(envVar);
}

// ── GET: Lista todas las funciones de un esquema con sus parámetros ──────────
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const schema = searchParams.get("schema") || "invme";
  const envHeader = request.headers.get("x-qa-env") || "dev";

  try {
    const db = getPool(envHeader);
    const client = await db.connect();

    // Consulta al catálogo de PostgreSQL para obtener firma completa de funciones
    const { rows } = await client.query(`
      SELECT
        p.proname                                          AS nombre,
        n.nspname                                          AS esquema,
        pg_get_function_result(p.oid)                     AS tipo_retorno,
        CASE
          WHEN pg_get_function_result(p.oid) ILIKE 'TABLE%'  THEN 'table'
          WHEN pg_get_function_result(p.oid) ILIKE 'SETOF%'  THEN 'setof'
          WHEN pg_get_function_result(p.oid) = 'integer'     THEN 'integer'
          WHEN pg_get_function_result(p.oid) = 'bigint'      THEN 'bigint'
          WHEN pg_get_function_result(p.oid) = 'boolean'     THEN 'boolean'
          WHEN pg_get_function_result(p.oid) = 'text'        THEN 'text'
          WHEN pg_get_function_result(p.oid) = 'jsonb'       THEN 'jsonb'
          WHEN pg_get_function_result(p.oid) = 'json'        THEN 'json'
          WHEN pg_get_function_result(p.oid) ILIKE 'character%' THEN 'text'
          WHEN pg_get_function_result(p.oid) = 'void'        THEN 'void'
          ELSE 'scalar'
        END                                                AS categoria_retorno,
        (
          SELECT json_agg(json_build_object(
            'nombre',    par.parameter_name,
            'tipo',      par.data_type,
            'udt_name',  par.udt_name,
            'posicion',  par.ordinal_position,
            'default',   par.parameter_default,
            'requerido', par.parameter_default IS NULL
          ) ORDER BY par.ordinal_position)
          FROM information_schema.parameters par
          WHERE par.specific_schema = n.nspname
            AND par.specific_name   = p.proname || '_' || p.oid
            AND par.parameter_mode  = 'IN'
        )                                                  AS parametros,
        obj_description(p.oid, 'pg_proc')                 AS descripcion,
        p.provolatile                                      AS volatilidad
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = $1
        AND p.prokind = 'f'
      ORDER BY p.proname;
    `, [schema]);

    client.release();

    return Response.json({ status: "ok", schema, functions: rows });

  } catch (err) {
    return Response.json(
      { status: "error", message: err.message },
      { status: 500 }
    );
  }
}

// ── POST: Ejecuta una función y devuelve el resultado crudo ──────────────────
export async function POST(request) {
  const envHeader = request.headers.get("x-qa-env") || "dev";
  try {
    const { sql, params = [], benchmarkRuns = 1 } = await request.json();

    if (!sql?.trim()) {
      return Response.json({ status: "error", message: "SQL requerido" }, { status: 400 });
    }

    const db = getPool(envHeader);
    const client = await db.connect();

    const start = Date.now();
    let result, error;
    let successCount = 0;
    let failCount = 0;

    try {
      for (let i = 1; i <= benchmarkRuns; i++) {
        const dynamicParams = params.map(p => {
          if (typeof p === "string") {
            return p.replace(/\{\{i\}\}/g, i).replace(/\{\{rnd\}\}/g, Math.random().toString(36).substring(2, 8).toUpperCase());
          }
          return p;
        });

        try {
          result = await client.query(sql, dynamicParams.length > 0 ? dynamicParams : undefined);
          successCount++;
        } catch (queryErr) {
          error = queryErr;
          failCount++;
          if (benchmarkRuns === 1) throw queryErr;
        }
      }
    } catch (e) {
      // Ignorar, error ya guardado
    }

    const latencyTotal = Date.now() - start;
    const latency = Math.round(latencyTotal / benchmarkRuns);
    client.release();

    if (benchmarkRuns > 1) {
      return Response.json({
        status: "ok",
        latency,
        benchmarkRuns,
        isStressTest: true,
        successCount,
        failCount,
        message: `Estrés finalizado: ${successCount} éxitos, ${failCount} fallos en ${latencyTotal}ms.`,
        lastError: error ? error.message : null,
      });
    }

    if (error) {
      return Response.json({
        status: "error",
        message: error.message,
        code: error.code,
        detail: error.detail,
        latency,
        benchmarkRuns,
      });
    }

    const rows = result?.rows || [];
    const rowCount = result?.rowCount ?? rows.length;

    // Determinar si el resultado es escalar (SELECT fn()) o tabla (SELECT * FROM fn())
    const isScalar = rows.length === 1 && Object.keys(rows[0] || {}).length === 1;
    const scalarValue = isScalar ? Object.values(rows[0])[0] : undefined;

    return Response.json({
      status: "ok",
      latency,
      rowCount,
      rows: rows.slice(0, 200),
      columns: rows.length > 0 ? Object.keys(rows[0]) : [],
      isScalar,
      scalarValue,
      command: result?.command,
    });

  } catch (err) {
    return Response.json(
      { status: "error", message: err.message },
      { status: 500 }
    );
  }
}
