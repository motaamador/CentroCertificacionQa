// src/app/api/collections/route.js
// Motor de ejecución de Colecciones de Prueba con Aserciones y Capturas de Variables

import { Pool } from "pg";

// ── Variable resolver ─────────────────────────────────────────────────────────
function resolveVars(str, vars) {
  if (!str) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

// ── Simple JSONPath extractor ─────────────────────────────────────────────────
function getJsonPath(obj, path) {
  if (!path || path === "$") return obj;
  try {
    const parts = path.replace(/^\$\.?/, "").split(".");
    let val = obj;
    for (const p of parts) {
      if (val == null) return undefined;
      const arrMatch = p.match(/^(\w+)\[(\d+)\]$/);
      if (arrMatch) val = val[arrMatch[1]]?.[parseInt(arrMatch[2])];
      else val = val[p];
    }
    return val;
  } catch { return undefined; }
}

// ── Assertion evaluator ───────────────────────────────────────────────────────
function evaluateAssertion(assertion, ctx) {
  const { target, operator, path, expected } = assertion;
  let actual;

  switch (target) {
    case "status":         actual = ctx.status; break;
    case "latency":        actual = ctx.latency; break;
    case "body_contains":  actual = typeof ctx.body === "string" ? ctx.body : JSON.stringify(ctx.body ?? ""); break;
    case "body_json_path": actual = getJsonPath(ctx.body, path || "$"); break;
    case "header":         actual = ctx.headers?.[path?.toLowerCase()]; break;
    default: return { ok: false, message: `Target desconocido: ${target}` };
  }

  let ok = false;
  let message = "";

  switch (operator) {
    case "equals":        ok = String(actual) === String(expected); message = `${actual} == ${expected}`; break;
    case "not_equals":    ok = String(actual) !== String(expected); message = `${actual} != ${expected}`; break;
    case "contains":      ok = String(actual ?? "").includes(String(expected)); message = `"${String(actual ?? "").slice(0,40)}" contiene "${expected}"`; break;
    case "not_contains":  ok = !String(actual ?? "").includes(String(expected)); message = `No contiene "${expected}"`; break;
    case "greater_than":  ok = Number(actual) > Number(expected); message = `${actual} > ${expected}`; break;
    case "less_than":     ok = Number(actual) < Number(expected); message = `${actual} < ${expected}`; break;
    case "exists":        ok = actual !== undefined && actual !== null; message = `Existe: ${ok}`; break;
    case "not_exists":    ok = actual === undefined || actual === null; message = `No existe: ${ok}`; break;
    case "matches_regex":
      try { ok = new RegExp(expected).test(String(actual ?? "")); message = `/${expected}/ → ${ok}`; }
      catch { ok = false; message = `Regex inválido: ${expected}`; }
      break;
    default: return { ok: false, message: `Operador desconocido: ${operator}` };
  }

  return { ok, message, actual: String(actual ?? ""), expected };
}

// ── DB Pool ───────────────────────────────────────────────────────────────────
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

// ── Step runners ──────────────────────────────────────────────────────────────
async function runHttpStep(step, vars) {
  const url = resolveVars(step.url, vars);
  let headers = {};
  try { headers = JSON.parse(resolveVars(step.headers || "{}", vars)); } catch {}
  const body = resolveVars(step.body || "", vars);

  const opts = { method: step.method || "GET", headers };
  if (["POST", "PUT", "PATCH"].includes(step.method) && body.trim()) {
    try { opts.body = JSON.stringify(JSON.parse(body)); }
    catch { opts.body = body; }
  }

  const start = Date.now();
  const res = await fetch(url, opts);
  const latency = Date.now() - start;

  let responseBody;
  const ct = res.headers.get("content-type") || "";
  try {
    responseBody = ct.includes("application/json") ? await res.json() : await res.text();
  } catch { responseBody = null; }

  const responseHeaders = {};
  res.headers.forEach((v, k) => { responseHeaders[k] = v; });

  return { status: res.status, latency, body: responseBody, headers: responseHeaders, url };
}

async function runDbStep(step, vars) {
  const query = resolveVars(step.query || "", vars);
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no configurada");
  const db = getPool();
  const start = Date.now();
  const result = await db.query(query);
  const latency = Date.now() - start;
  return { status: 200, latency, body: { rows: result.rows.slice(0, 20), rowCount: result.rowCount }, headers: {}, query };
}

// ── Variable capture ──────────────────────────────────────────────────────────
function applyCaptures(captures, ctx, vars) {
  for (const cap of (captures || [])) {
    if (!cap.varName) continue;
    let val;
    switch (cap.source) {
      case "body_json_path": val = getJsonPath(ctx.body, cap.path); break;
      case "header":         val = ctx.headers?.[cap.path?.toLowerCase()]; break;
      case "status":         val = ctx.status; break;
    }
    if (val !== undefined && val !== null) vars[cap.varName] = val;
  }
}

// ── POST handler ─────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const { collection, initialVars = {} } = await request.json();
    if (!collection?.steps?.length) {
      return Response.json({ ok: false, error: "Colección sin pasos" }, { status: 400 });
    }

    const vars = { ...initialVars };
    const stepResults = [];
    const startTotal = Date.now();

    for (const step of collection.steps) {
      let ctx = null;
      let error = null;

      try {
        ctx = step.type === "db" ? await runDbStep(step, vars) : await runHttpStep(step, vars);
        applyCaptures(step.captures, ctx, vars);
      } catch (e) {
        error = e.message;
        ctx = { status: 0, latency: 0, body: null, headers: {} };
      }

      const assertionResults = (step.assertions || []).map((a) =>
        error ? { ...a, ok: false, message: `Error: ${error}` } : { ...a, ...evaluateAssertion(a, ctx) }
      );

      const allPassed = !error && (assertionResults.length === 0 || assertionResults.every((a) => a.ok));

      stepResults.push({
        stepId: step.id,
        stepName: step.name || `Paso ${stepResults.length + 1}`,
        type: step.type || "http",
        ok: allPassed,
        error: error || null,
        status: ctx.status,
        latency: ctx.latency,
        url: ctx.url || null,
        query: ctx.query || null,
        response: (() => {
          try { return typeof ctx.body === "string" ? ctx.body.slice(0, 800) : JSON.stringify(ctx.body || {}).slice(0, 800); }
          catch { return ""; }
        })(),
        assertionResults,
      });

      if (collection.stopOnFailure && !allPassed) break;
    }

    const totalDuration = Date.now() - startTotal;
    const passedSteps = stepResults.filter((s) => s.ok).length;
    const failedSteps = stepResults.filter((s) => !s.ok).length;

    return Response.json({
      ok: failedSteps === 0,
      totalDuration,
      passedSteps,
      failedSteps,
      totalSteps: stepResults.length,
      capturedVars: vars,
      stepResults,
    });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
