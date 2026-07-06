// src/lib/pg-pool.js
// Gestión segura de pools de PostgreSQL
//
// Regla de seguridad:
//   - DATABASE_URL (variable de entorno del servidor) → pool PERSISTENTE global.
//   - connStr custom enviado por el usuario  → pool TEMPORAL, destruido al terminar el request.
//     Nunca se comparte entre requests ni usuarios.

import { Pool } from "pg";

// ── Pools persistentes para conexiones controladas por el servidor ─────────────
const _serverPools = {};

function sslFor(connStr) {
  if (!connStr) return false;
  return connStr.includes("sslmode=require") ||
    connStr.includes("neon.tech") ||
    connStr.includes("supabase")
    ? { rejectUnauthorized: false }
    : false;
}

/**
 * Devuelve (o crea) un pool PERSISTENTE para una variable de entorno del servidor.
 * @param {string} envVar  Nombre de la variable de entorno (ej: "DATABASE_URL")
 * @param {string} [searchPath] SET search_path al conectar
 */
export function getServerPool(envVar = "DATABASE_URL", searchPath = "invme, public") {
  const connStr = process.env[envVar] || process.env.DATABASE_URL;
  if (!connStr) return null;

  if (!_serverPools[envVar]) {
    const pool = new Pool({
      connectionString: connStr,
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 30000,
      max: 5,
      ssl: sslFor(connStr),
    });
    if (searchPath) {
      pool.on("connect", (client) => {
        client.query(`SET search_path TO ${searchPath}`);
      });
    }
    _serverPools[envVar] = pool;
  }

  return _serverPools[envVar];
}

/**
 * Ejecuta una función con un pool TEMPORAL para un connStr custom del usuario.
 * El pool se destruye automáticamente al terminar, sin importar si hay error.
 *
 * @param {string} connStr  Cadena de conexión enviada por el usuario
 * @param {string} [searchPath]
 * @param {(pool: Pool) => Promise<T>} fn  Callback con la lógica de la query
 * @returns {Promise<T>}
 */
export async function withTempPool(connStr, searchPath = "invme, public", fn) {
  const pool = new Pool({
    connectionString: connStr,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 5000,
    max: 2,
    ssl: sslFor(connStr),
  });

  if (searchPath) {
    pool.on("connect", (client) => {
      client.query(`SET search_path TO ${searchPath}`);
    });
  }

  try {
    return await fn(pool);
  } finally {
    // Siempre destruimos el pool temporal al terminar el request
    pool.end().catch(() => {});
  }
}
