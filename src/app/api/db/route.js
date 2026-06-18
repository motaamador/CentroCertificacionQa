// src/app/api/db/route.js
// DB Tester — conexión REAL a PostgreSQL vía driver pg

import { Pool } from "pg";

// Pool compartido (se reutiliza entre requests)
let pool = null;

function getPool(connStr) {
  // Si se pasa una connection string custom desde el formulario, úsala.
  // Si no, cae al DATABASE_URL del .env.local
  const connectionString = connStr || process.env.DATABASE_URL;

  if (!connectionString) {
    return null;
  }

  // Crear un pool nuevo si no existe o si cambió la connection string
  if (!pool || pool._connectionString !== connectionString) {
    pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 10000,
      max: 3,
      ssl: connectionString.includes("sslmode=require") || connectionString.includes("neon.tech") || connectionString.includes("supabase")
        ? { rejectUnauthorized: false }
        : false,
    });
    // Establecer search_path al esquema invme por defecto
    pool.on("connect", (client) => {
      client.query("SET search_path TO invme, public");
    });
    pool._connectionString = connectionString;
  }

  return pool;
}

export async function POST(request) {
  try {
    const {
      connStr,
      query,
      assertMaxMs = 100,
      benchmarkRuns = 1,
    } = await request.json();

    // ── Validaciones básicas ─────────────────────────────────────────────
    if (!query?.trim()) {
      return Response.json({ status: "fail", message: "Query requerida" }, { status: 400 });
    }

    const connectionString = connStr || process.env.DATABASE_URL;

    if (!connectionString) {
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

    // ── Crear pool ────────────────────────────────────────────────────────
    const db = getPool(connectionString);

    // ── Test de conectividad primero ──────────────────────────────────────
    let client;
    try {
      client = await db.connect();
    } catch (connErr) {
      return Response.json({
        status: "fail",
        message: `No se pudo conectar a PostgreSQL`,
        details: [
          `Error: ${connErr.message}`,
          "Verifica host, puerto, usuario y contraseña",
          "Si es Supabase/Neon, asegúrate de que el proyecto esté activo",
        ],
      });
    }

    // ── Ejecutar query (con benchmark si aplica) ──────────────────────────
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
        break; // No repetir si la query falla
      }
    }

    client.release(); // Devolver conexión al pool

    // ── Si la query falló ─────────────────────────────────────────────────
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

    // ── Calcular estadísticas ─────────────────────────────────────────────
    const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
    const min = Math.min(...latencies);
    const max = Math.max(...latencies);
    const latencyOk = avg <= assertMaxMs;

    // Limitar filas devueltas a 50 para no sobrecargar la UI
    const rows = (lastResult?.rows || []).slice(0, 50);
    const rowCount = lastResult?.rowCount ?? rows.length;
    const command = lastResult?.command || "QUERY";

    const details = [
      `Comando: ${command}`,
      `Filas afectadas/retornadas: ${rowCount}`,
      `Latencia avg: ${avg}ms`,
      runs > 1 ? `Runs: ${runs} | Min: ${min}ms | Max: ${max}ms` : null,
      !latencyOk ? `⚠ Latencia ${avg}ms supera límite de ${assertMaxMs}ms` : `✓ Dentro del límite de ${assertMaxMs}ms`,
    ].filter(Boolean);

    return Response.json({
      status: latencyOk ? "pass" : "warn",
      message: latencyOk
        ? `✅ Query ejecutada en ${avg}ms`
        : `⚠ Query lenta: ${avg}ms (límite: ${assertMaxMs}ms)`,
      latency: avg,
      details,
      rows,
      rowCount,
      command,
      benchmarkStats: runs > 1 ? { avg, min, max, runs } : null,
    });

  } catch (err) {
    return Response.json(
      { status: "fail", message: `Error interno: ${err.message}` },
      { status: 500 }
    );
  }
}
