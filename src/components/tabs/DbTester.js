"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Database, Play, ChevronDown } from "lucide-react";
import { SectionHeader, ResultPanel } from "@/components/ui";

// ── Presets agrupados por categoría ───────────────────────────────────────
const PRESET_GROUPS = [
  {
    group: "🔧 Sistema",
    items: [
      {
        label: "Health Check",
        query: "SELECT 1 AS health, current_database() AS bd, current_user AS usuario, now() AS hora_servidor",
      },
      {
        label: "Tablas del esquema invme",
        query: `SELECT tablename,
  pg_size_pretty(pg_total_relation_size('invme.'||tablename)) AS tamaño,
  (SELECT count(*) FROM information_schema.columns
   WHERE table_schema='invme' AND table_name=tablename) AS columnas
FROM pg_tables
WHERE schemaname='invme'
ORDER BY tablename`,
      },
      {
        label: "Tamaño de la BD",
        query: "SELECT pg_size_pretty(pg_database_size(current_database())) AS tamaño_total",
      },
      {
        label: "Conexiones activas",
        query: "SELECT count(*) FROM pg_stat_activity WHERE state = 'active'",
      },
    ],
  },
  {
    group: "⚙️ Funciones",
    items: [
      {
        label: "Listar todas las funciones",
        query: `SELECT DISTINCT routine_name AS funcion,
  data_type AS retorno,
  pg_get_function_arguments(p.oid) AS argumentos
FROM information_schema.routines r
JOIN pg_proc p ON p.proname = r.routine_name
JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname = r.routine_schema
WHERE r.routine_schema = 'invme'
ORDER BY routine_name`,
      },
      {
        label: "fn: consultar_documentos_con_saldo()",
        query: "SELECT * FROM invme.consultar_documentos_con_saldo()",
      },
      {
        label: "fn: consultar_tipo_material_por_usuario(1)",
        query: "SELECT * FROM invme.consultar_tipo_material_por_usuario(1)",
      },
      {
        label: "fn: obtener_plantilla_tipo_material(1)",
        query: "SELECT invme.obtener_plantilla_tipo_material(1) AS plantilla_jsonb",
      },
      {
        label: "fn: obtener_color_tipo_material(1)",
        query: "SELECT * FROM invme.obtener_color_tipo_material(1)",
      },
      {
        label: "fn: obtener_tipo_documento()",
        query: "SELECT * FROM invme.obtener_tipo_documento()",
      },
      {
        label: "fn: obtener_unidad_medida()",
        query: "SELECT * FROM invme.obtener_unidad_medida()",
      },
    ],
  },
  {
    group: "🔵 JSON / JSONB",
    items: [
      {
        label: "plantilla_caracteristicas — todas",
        query: `SELECT id_tipo_material, desc_tipo_material,
  plantilla_caracteristicas,
  jsonb_array_length(COALESCE(plantilla_caracteristicas,'[]'::jsonb)) AS num_caracteristicas
FROM invme.tipo_material
ORDER BY id_tipo_material`,
      },
      {
        label: "Validar estructura de plantilla (expandida)",
        query: `SELECT
  tm.id_tipo_material,
  tm.desc_tipo_material,
  elem->>'campo'    AS campo,
  elem->>'etiqueta' AS etiqueta,
  elem->>'tipo'     AS tipo_input,
  (elem->>'requerido')::bool AS requerido
FROM invme.tipo_material tm,
     jsonb_array_elements(COALESCE(tm.plantilla_caracteristicas,'[]'::jsonb)) AS elem
ORDER BY tm.id_tipo_material`,
      },
      {
        label: "inv_lote — valores_caracteristicas",
        query: `SELECT il.id_inv_lote, l.nro_lote, l.cantidad,
  il.valores_caracteristicas,
  jsonb_typeof(il.valores_caracteristicas) AS tipo_json
FROM invme.inv_lote il
JOIN invme.lote l ON l.id_lote = il.id_lote
WHERE il.valores_caracteristicas IS NOT NULL
LIMIT 20`,
      },
      {
        label: "detalle_recepcion — valores_caracteristicas",
        query: `SELECT id_detalle_recepcion_material,
  valores_caracteristicas,
  jsonb_typeof(valores_caracteristicas) AS tipo_json
FROM invme.detalle_recepcion_material
WHERE valores_caracteristicas IS NOT NULL
LIMIT 20`,
      },
      {
        label: "JSON — claves únicas en inv_lote",
        query: `SELECT DISTINCT jsonb_object_keys(valores_caracteristicas) AS clave
FROM invme.inv_lote
WHERE valores_caracteristicas IS NOT NULL`,
      },
    ],
  },
  {
    group: "📦 Tablas",
    items: [
      { label: "Usuarios",       query: "SELECT * FROM invme.usuario ORDER BY id_usuario" },
      { label: "Almacenes",      query: "SELECT * FROM invme.almacen ORDER BY id_almacen" },
      { label: "Tipo Material",  query: "SELECT * FROM invme.tipo_material ORDER BY id_tipo_material" },
      { label: "Lotes (últimos)", query: "SELECT * FROM invme.lote ORDER BY id_lote DESC LIMIT 20" },
      { label: "Inv. Lote",      query: "SELECT * FROM invme.inv_lote ORDER BY id_inv_lote DESC LIMIT 20" },
      { label: "Movimientos",    query: "SELECT * FROM invme.hist_movimiento ORDER BY id_hist_movimiento DESC LIMIT 20" },
      { label: "Recepción Mat.", query: "SELECT * FROM invme.recepcion_material ORDER BY id_recepcion_material DESC LIMIT 20" },
      { label: "Detalle Recep.", query: "SELECT * FROM invme.detalle_recepcion_material ORDER BY id_detalle_recepcion_material DESC LIMIT 20" },
      { label: "Tipo Estatus",   query: "SELECT * FROM invme.tipo_estatus" },
      { label: "Tipo Tramite",   query: "SELECT * FROM invme.tipo_tramite" },
      { label: "Unidad Medida",  query: "SELECT * FROM invme.unidad_medida" },
    ],
  },
];

// Aplanar presets para búsqueda rápida
const ALL_PRESETS = PRESET_GROUPS.flatMap(g => g.items);

export default function DbTester() {
  const [connStr, setConnStr] = useState("");
  const [query, setQuery] = useState("SELECT 1 AS health, current_database() AS bd, current_user AS usuario, now() AS hora_servidor");
  const [assertMaxMs, setAssertMaxMs] = useState("200");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [benchmarkRuns, setBenchmarkRuns] = useState(5);
  const [isBenchmark, setIsBenchmark] = useState(false);
  const [openGroup, setOpenGroup] = useState("🔧 Sistema");

  const runTest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connStr: connStr.trim() || undefined,
          query,
          assertMaxMs: +assertMaxMs,
          benchmarkRuns: isBenchmark ? benchmarkRuns : 1,
        }),
      });
      const data = await res.json();
      setResult(data);
      const h = JSON.parse(localStorage.getItem("qa_history") || "[]");
      h.unshift({ type: "db", ...data, timestamp: Date.now() });
      localStorage.setItem("qa_history", JSON.stringify(h.slice(0, 100)));
    } catch (err) {
      setResult({ status: "fail", message: `Error: ${err.message}` });
    }
    setLoading(false);
  };

  return (
    <div>
      <SectionHeader
        title="Database Tester"
        desc="Conectado a PostgreSQL 16.7 — scime@192.168.81.60 — esquema invme"
        icon={Database}
        color="#8b5cf6"
      />

      {/* Connection */}
      <div className="qa-card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Cadena de Conexión (opcional)
        </div>
        <input
          className="qa-input"
          value={connStr}
          onChange={e => setConnStr(e.target.value)}
          placeholder="Vacío = usa .env.local (postgresql://scime:***@192.168.81.60:5432/scime)"
          style={{ fontFamily: "var(--font-geist-mono)", fontSize: 12 }}
        />
        <div style={{ fontSize: 11, color: "#10b981", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
          Conexión activa — PostgreSQL 16.7 · esquema: invme
        </div>
      </div>

      {/* Presets accordion + query editor */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, marginBottom: 16 }}>
        {/* Accordion de presets */}
        <div className="qa-card" style={{ padding: 12 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Presets
          </div>
          {PRESET_GROUPS.map(group => (
            <div key={group.group} style={{ marginBottom: 6 }}>
              <button
                onClick={() => setOpenGroup(openGroup === group.group ? null : group.group)}
                style={{
                  width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "7px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                  background: openGroup === group.group ? "rgba(139,92,246,0.12)" : "transparent",
                  color: openGroup === group.group ? "#8b5cf6" : "var(--text-secondary)",
                  fontSize: 12, fontWeight: 600, transition: "all 0.15s"
                }}
              >
                <span>{group.group}</span>
                <ChevronDown size={13} style={{ transform: openGroup === group.group ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
              </button>

              <AnimatePresence>
                {openGroup === group.group && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: "hidden" }}>
                    <div style={{ paddingLeft: 8, paddingTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
                      {group.items.map(item => (
                        <button
                          key={item.label}
                          onClick={() => setQuery(item.query)}
                          style={{
                            textAlign: "left", padding: "6px 10px", borderRadius: 6,
                            border: "none", background: query === item.query ? "rgba(139,92,246,0.1)" : "transparent",
                            color: query === item.query ? "#8b5cf6" : "var(--text-secondary)",
                            fontSize: 11, cursor: "pointer", transition: "all 0.1s", whiteSpace: "nowrap",
                            overflow: "hidden", textOverflow: "ellipsis", width: "100%"
                          }}
                          onMouseEnter={e => { if (query !== item.query) e.currentTarget.style.background = "var(--bg-card-hover)"; }}
                          onMouseLeave={e => { if (query !== item.query) e.currentTarget.style.background = "transparent"; }}
                          title={item.label}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Query editor + options */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="qa-card" style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Query SQL
            </div>
            <textarea
              className="qa-textarea"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="SELECT ..."
              style={{ minHeight: 160, fontSize: 12 }}
            />
          </div>

          {/* Options + run */}
          <div className="qa-card">
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, alignItems: "end" }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                  Latencia máx (ms)
                </label>
                <input className="qa-input" value={assertMaxMs} onChange={e => setAssertMaxMs(e.target.value)} placeholder="200" />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 2 }}>
                <input type="checkbox" id="bench" checked={isBenchmark} onChange={e => setIsBenchmark(e.target.checked)} style={{ cursor: "pointer" }} />
                <label htmlFor="bench" style={{ fontSize: 12, color: "var(--text-secondary)", cursor: "pointer", whiteSpace: "nowrap" }}>
                  Benchmark
                </label>
                {isBenchmark && (
                  <input className="qa-input" type="number" value={benchmarkRuns}
                    onChange={e => setBenchmarkRuns(+e.target.value)} style={{ width: 56 }} />
                )}
              </div>
              <button
                className="btn-primary"
                onClick={runTest}
                disabled={loading}
                style={{ background: "linear-gradient(135deg, #8b5cf6, #7c3aed)", justifyContent: "center", height: 40 }}
              >
                {loading ? "⟳ Ejecutando..." : <><Play size={14} /> Ejecutar</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ResultPanel result={result} loading={loading} />

      {result?.rows?.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="qa-card" style={{ marginTop: 12, overflow: "auto" }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", justifyContent: "space-between" }}>
            <span>Resultado — {result.rowCount ?? result.rows.length} fila(s) · {result.command}</span>
            {result.benchmarkStats && (
              <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>
                Avg: <b style={{ color: "var(--text-primary)" }}>{result.benchmarkStats.avg}ms</b>
                &nbsp;· Min: <b style={{ color: "#10b981" }}>{result.benchmarkStats.min}ms</b>
                &nbsp;· Max: <b style={{ color: "#ef4444" }}>{result.benchmarkStats.max}ms</b>
              </span>
            )}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "var(--font-geist-mono)" }}>
            <thead>
              <tr>
                {Object.keys(result.rows[0] || {}).map(col => (
                  <th key={col} style={{ padding: "8px 12px", textAlign: "left", color: "var(--text-muted)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--bg-surface)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  {Object.values(row).map((val, j) => {
                    const str = typeof val === "object" && val !== null ? JSON.stringify(val) : String(val ?? "");
                    const isJson = str.startsWith("{") || str.startsWith("[");
                    return (
                      <td key={j} style={{
                        padding: "8px 12px", color: isJson ? "#6366f1" : "var(--text-secondary)",
                        maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                      }}
                        title={str}>
                        {str}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  );
}
