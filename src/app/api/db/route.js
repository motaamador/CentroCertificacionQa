// src/app/api/db/route.js
// DB Tester — conexión REAL a PostgreSQL vía driver pg
//
// SEGURIDAD:
//   - Si el usuario envía su propio connStr → pool TEMPORAL por request (withTempPool).
//   - Si se usa el DATABASE_URL del servidor  → pool PERSISTENTE (getServerPool).
//   Los pools de usuario nunca se comparten entre requests.

import { getServerPool, withTempPool } from "@/lib/pg-pool";

async function runQuery({ connStr, query, assertMaxMs, benchmarkRuns }) {
  // ── Elegir estrategia de pool ─────────────────────────────────────────────
  const useCustom = Boolean(connStr?.trim());

  const exec = async (pool) => {
    let client;
    try {
      client = await pool.connect();
    } catch (connErr) {
      return Response.json({
        status: "fail",
        message: "No se pudo conectar a PostgreSQL",
        details: [
          `Error: ${connErr.message}`,
          "Verifica host, puerto, usuario y contraseña",
          "Si es Supabase/Neon, asegúrate de que el proyecto esté activo",
        ],
      });
    }

    const runs = Math.min(Math.max(benchmarkRuns, 1), 20);
    const latencies = [];
    let lastResult = null;
    let queryError = null;

    for (let i = 0; i < runs; i++) {
      const start = Date.now();
      try {
        lastResult = await client.query(query);
        latencies.push(Date.now() - start);
      } catch (queryErr) {
        queryError = queryErr;
        latencies.push(Date.now() - start);
        break;
      }
    }

    client.release();

    if (queryError) {
      return Response.json({
        status: "fail",
        message: `Error en la query: ${queryError.message}`,
        details: [
          `PostgreSQL error code: ${queryError.code || "?"}`,
          `Detalle: ${queryError.detail || queryError.message}`,
          "Revisa la sintaxis SQL y los permisos del usuario",
        ],
      });
    }

    const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
    const min = Math.min(...latencies);
    const max = Math.max(...latencies);
    const latencyOk = avg <= assertMaxMs;

    const rows = (lastResult?.rows || []).slice(0, 50);
    const rowCount = lastResult?.rowCount ?? rows.length;
    const command = lastResult?.command || "QUERY";

    return Response.json({
      status: latencyOk ? "pass" : "warn",
      message: latencyOk
        ? `✅ Query ejecutada en ${avg}ms`
        : `⚠ Query lenta: ${avg}ms (límite: ${assertMaxMs}ms)`,
      latency: avg,
      details: [
        `Comando: ${command}`,
        `Filas afectadas/retornadas: ${rowCount}`,
        `Latencia avg: ${avg}ms`,
        runs > 1 ? `Runs: ${runs} | Min: ${min}ms | Max: ${max}ms` : null,
        !latencyOk ? `⚠ Latencia ${avg}ms supera límite de ${assertMaxMs}ms` : `✓ Dentro del límite de ${assertMaxMs}ms`,
      ].filter(Boolean),
      rows,
      rowCount,
      command,
      benchmarkStats: runs > 1 ? { avg, min, max, runs } : null,
    });
  };

  // Pool temporal para connStr del usuario → aislado por request
  if (useCustom) {
    return withTempPool(connStr.trim(), "invme, public", exec);
  }

  // Pool persistente para DATABASE_URL del servidor
  const pool = getServerPool("DATABASE_URL");
  if (!pool) {
    return Response.json({
      status: "fail",
      message: "No hay conexión configurada",
      details: [
        "Opción 1: Ingresa la cadena de conexión en el formulario",
        "Opción 2: Define DATABASE_URL en el archivo .env.local",
        "Formato: postgresql://usuario:contraseña@host:5432/base_de_datos",
      ],
    });
  }
  return exec(pool);
}

export async function POST(request) {
  try {
    const {
      connStr,
      query,
      assertMaxMs = 100,
      benchmarkRuns = 1,
    } = await request.json();

    if (!query?.trim()) {
      return Response.json({ status: "fail", message: "Query requerida" }, { status: 400 });
    }

    return await runQuery({ connStr, query, assertMaxMs, benchmarkRuns });
  } catch (err) {
    return Response.json(
      { status: "fail", message: `Error interno: ${err.message}` },
      { status: 500 }
    );
  }
}
