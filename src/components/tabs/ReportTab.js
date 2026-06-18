"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Download, Trash2, CheckSquare, Square, Filter, User, RefreshCw } from "lucide-react";
import { SectionHeader, StatusBadge } from "@/components/ui";

const MODULE_LABEL = {
  api:          "API Tester",
  security:     "Security Scanner",
  db:           "DB Tester",
  connectivity: "Connectivity",
  curl:         "cURL Runner",
};

const MODULE_ICON = {
  api: "🌐", security: "🛡️", db: "🗄️", connectivity: "📡", curl: "💻",
};

const STATUS_COLOR = {
  pass:    "#10b981", success: "#10b981",
  warn:    "#f59e0b",
  fail:    "#ef4444", error:   "#ef4444",
};

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleString("es-VE", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
}

export default function ReportTab() {
  // Historial
  const [history, setHistory]       = useState(() => {
    try { return JSON.parse(localStorage.getItem("qa_history") || "[]"); } catch { return []; }
  });
  const [selected, setSelected]     = useState(new Set());
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Metadata del reporte
  const [operador, setOperador]     = useState("");
  const [titulo, setTitulo]         = useState("Informe de Certificación QA");

  // Estado de generación
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  // ── Filtrado ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return history.filter(item => {
      const typeOk   = filterType   === "all" || item.type   === filterType;
      const statusOk = filterStatus === "all" || item.status === filterStatus;
      return typeOk && statusOk;
    });
  }, [history, filterType, filterStatus]);

  const allFilteredIds = new Set(filtered.map((_, i) => history.indexOf(filtered[i])));
  const allSelected    = filtered.length > 0 && filtered.every((_, i) => selected.has(history.indexOf(filtered[i])));

  // ── Selección ─────────────────────────────────────────────────────────────
  const toggleItem = (globalIdx) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(globalIdx) ? n.delete(globalIdx) : n.add(globalIdx);
      return n;
    });
  };

  const toggleAll = () => {
    setSelected(prev => {
      const n = new Set(prev);
      if (allSelected) {
        filtered.forEach((_, i) => n.delete(history.indexOf(filtered[i])));
      } else {
        filtered.forEach((_, i) => n.add(history.indexOf(filtered[i])));
      }
      return n;
    });
  };

  // ── Eliminar items ────────────────────────────────────────────────────────
  const deleteSelected = () => {
    const newHistory = history.filter((_, i) => !selected.has(i));
    setHistory(newHistory);
    localStorage.setItem("qa_history", JSON.stringify(newHistory));
    setSelected(new Set());
  };

  const clearAll = () => {
    setHistory([]);
    localStorage.setItem("qa_history", "[]");
    setSelected(new Set());
  };

  const clearByType = (type) => {
    const newHistory = history.filter(item => item.type !== type);
    setHistory(newHistory);
    localStorage.setItem("qa_history", JSON.stringify(newHistory));
    setSelected(prev => {
      const n = new Set(prev);
      history.forEach((item, i) => { if (item.type === type) n.delete(i); });
      return n;
    });
  };

  // ── Generar PDF ───────────────────────────────────────────────────────────
  const generatePDF = async () => {
    const items = selected.size > 0
      ? [...selected].sort((a, b) => a - b).map(i => history[i])
      : filtered;

    if (items.length === 0) {
      setError("Selecciona al menos un resultado para el reporte.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, operador: operador || "Analista QA", titulo }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      // Descargar el PDF
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `QA_Reporte_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(`Error: ${err.message}`);
    }
    setLoading(false);
  };

  const selectedCount = selected.size || filtered.length;
  const types = ["all", ...new Set(history.map(h => h.type))];

  return (
    <div>
      <SectionHeader
        title="Generador de Reportes PDF"
        desc="Selecciona los resultados del historial y genera un informe de certificación institucional"
        icon={FileText}
        color="#6366f1"
      />

      {/* ── Config del reporte ── */}
      <div className="qa-card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Datos del documento
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Título del informe</label>
            <input className="qa-input" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Informe de Certificación QA" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>
              <User size={10} style={{ display: "inline", marginRight: 4 }} />
              Operador / Analista
            </label>
            <input className="qa-input" value={operador} onChange={e => setOperador(e.target.value)} placeholder="Tu nombre..." />
          </div>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", padding: "8px 12px", borderRadius: 8, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)" }}>
          🏛️ Branding: <b style={{ color: "#6366f1" }}>SAIME</b> — para cambiar la institución edita <code style={{ color: "#06b6d4" }}>src/config/branding.js</code>
        </div>
      </div>

      {/* ── Controles del historial ── */}
      <div className="qa-card" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Filter size={14} color="var(--text-muted)" />
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Historial ({history.length} registros)
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { setHistory([]); localStorage.setItem("qa_history", "[]"); setSelected(new Set()); }}
              style={{ fontSize: 11, color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <Trash2 size={11} /> Limpiar todo
            </button>
            {selected.size > 0 && (
              <button onClick={deleteSelected}
                style={{ fontSize: 11, color: "#f59e0b", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                <Trash2 size={11} /> Eliminar seleccionados ({selected.size})
              </button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Módulo:</span>
            {types.map(t => (
              <button key={t} onClick={() => setFilterType(t)}
                style={{
                  padding: "3px 9px", fontSize: 10, borderRadius: 6,
                  border: `1px solid ${filterType === t ? "rgba(99,102,241,0.5)" : "var(--border)"}`,
                  background: filterType === t ? "rgba(99,102,241,0.1)" : "transparent",
                  color: filterType === t ? "#6366f1" : "var(--text-muted)", cursor: "pointer"
                }}>
                {t === "all" ? "Todos" : MODULE_ICON[t] + " " + (MODULE_LABEL[t] || t)}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Status:</span>
            {["all", "pass", "warn", "fail"].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                style={{
                  padding: "3px 9px", fontSize: 10, borderRadius: 6,
                  border: `1px solid ${filterStatus === s ? (STATUS_COLOR[s] || "rgba(99,102,241,0.5)") + "66" : "var(--border)"}`,
                  background: filterStatus === s ? (STATUS_COLOR[s] || "#6366f1") + "18" : "transparent",
                  color: filterStatus === s ? (STATUS_COLOR[s] || "#6366f1") : "var(--text-muted)", cursor: "pointer"
                }}>
                {s === "all" ? "Todos" : s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Select all */}
        {filtered.length > 0 && (
          <button onClick={toggleAll}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: "4px 0", marginBottom: 8 }}>
            {allSelected ? <CheckSquare size={13} color="#6366f1" /> : <Square size={13} />}
            {allSelected ? "Deseleccionar todos" : `Seleccionar todos (${filtered.length})`}
          </button>
        )}

        {/* Lista del historial */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: 13 }}>
            {history.length === 0
              ? "El historial está vacío — ejecuta pruebas en cualquier módulo"
              : "No hay resultados con los filtros seleccionados"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 340, overflowY: "auto" }}>
            {filtered.map((item, fi) => {
              const globalIdx = history.indexOf(item);
              const isSelected = selected.has(globalIdx);
              const sc = STATUS_COLOR[item.status] || "#6b7280";
              return (
                <motion.div key={globalIdx} layout
                  onClick={() => toggleItem(globalIdx)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 12px", borderRadius: 8, cursor: "pointer",
                    border: `1px solid ${isSelected ? "rgba(99,102,241,0.4)" : "var(--border)"}`,
                    background: isSelected ? "rgba(99,102,241,0.06)" : "var(--bg-surface)",
                    transition: "all 0.15s"
                  }}>
                  {isSelected
                    ? <CheckSquare size={14} color="#6366f1" style={{ flexShrink: 0 }} />
                    : <Square size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />}
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{MODULE_ICON[item.type] || "🔧"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {MODULE_LABEL[item.type] || item.type} — {item.message?.slice(0, 60) || "Sin mensaje"}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                      {formatTime(item.timestamp)}
                      {item.latency != null ? ` · ${item.latency}ms` : ""}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                    background: sc + "18", color: sc, border: `1px solid ${sc}44`, flexShrink: 0
                  }}>
                    {(item.status || "?").toUpperCase()}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Botón generar ── */}
      {error && (
        <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 12, color: "#ef4444" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {selected.size > 0
            ? `${selected.size} item(s) seleccionados para el reporte`
            : filtered.length > 0
            ? `Se incluirán todos los filtrados: ${filtered.length} item(s)`
            : "Sin items"}
        </div>
        <button
          className="btn-primary"
          onClick={generatePDF}
          disabled={loading || (history.length === 0)}
          style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", gap: 8, minWidth: 180, justifyContent: "center" }}>
          {loading
            ? <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Generando PDF...</>
            : <><Download size={14} /> Descargar PDF ({selectedCount})</>}
        </button>
      </div>
    </div>
  );
}
