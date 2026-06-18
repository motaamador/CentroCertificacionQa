"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, Trash2, Filter, ChevronDown } from "lucide-react";
import { SectionHeader, StatusBadge } from "@/components/ui";

const TYPE_COLORS = {
  api: "#3b82f6", security: "#10b981", db: "#8b5cf6",
  connectivity: "#f59e0b", unknown: "#6366f1"
};

export default function HistoryTab() {
  const [all, setAll] = useState([]);
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    try {
      setAll(JSON.parse(localStorage.getItem("qa_history") || "[]"));
    } catch {}
  }, []);

  const clearHistory = () => {
    localStorage.removeItem("qa_history");
    setAll([]);
  };

  const TYPES = ["all", "api", "security", "db", "connectivity"];
  const filtered = filter === "all" ? all : all.filter(r => r.type === filter);

  const passCount = all.filter(r => r.status === "pass" || r.status === "success").length;
  const failCount = all.length - passCount;

  return (
    <div>
      <SectionHeader
        title="Historial de Pruebas"
        desc="Registro completo de todas las certificaciones ejecutadas en esta sesión"
        icon={History}
        color="#06b6d4"
      />

      {/* Filters + clear */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {TYPES.map(t => (
            <button key={t} onClick={() => setFilter(t)}
              style={{
                padding: "6px 14px", fontSize: 12, fontWeight: 600, borderRadius: 8,
                border: `1px solid ${filter === t ? (TYPE_COLORS[t] || "var(--accent-blue)") : "var(--border)"}`,
                background: filter === t ? `${TYPE_COLORS[t] || "#3b82f6"}18` : "transparent",
                color: filter === t ? (TYPE_COLORS[t] || "var(--accent-blue)") : "var(--text-muted)",
                cursor: "pointer", transition: "all 0.15s", textTransform: "capitalize"
              }}>
              {t === "all" ? `Todo (${all.length})` : t}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#10b981" }}>✓ {passCount} PASS</span>
            <span style={{ color: "#ef4444" }}>✗ {failCount} FAIL</span>
          </div>
          <button className="btn-ghost" onClick={clearHistory} style={{ fontSize: 12, padding: "6px 12px" }}>
            <Trash2 size={13} /> Limpiar
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="qa-card" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <div style={{ color: "var(--text-secondary)", fontSize: 15 }}>No hay resultados todavía</div>
          <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6 }}>Ejecuta pruebas desde cualquier módulo</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((r, i) => {
            const color = TYPE_COLORS[r.type] || "#6366f1";
            const isPass = r.status === "pass" || r.status === "success";
            const isExpanded = expanded === i;

            return (
              <motion.div key={i} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="qa-card" style={{ cursor: "pointer", borderColor: isExpanded ? `${color}44` : undefined }}
                onClick={() => setExpanded(isExpanded ? null : i)}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: isPass ? "#10b981" : "#ef4444",
                    flexShrink: 0
                  }} />
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 4,
                    background: `${color}18`, color, letterSpacing: "0.08em", textTransform: "uppercase"
                  }}>
                    {r.type || "test"}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.message || "—"}
                  </span>
                  {r.latency != null && (
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-geist-mono)", flexShrink: 0 }}>
                      {r.latency}ms
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-geist-mono)", flexShrink: 0, minWidth: 60 }}>
                    {r.timestamp ? new Date(r.timestamp).toLocaleTimeString("es-VE") : "—"}
                  </span>
                  <StatusBadge status={isPass ? "pass" : "fail"} />
                  <ChevronDown size={14} color="var(--text-muted)"
                    style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }} />
                </div>

                <AnimatePresence>
                  {isExpanded && r.details?.length > 0 && (
                    <motion.ul
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      style={{ listStyle: "none", padding: "12px 0 0 20px", margin: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                      {r.details.map((d, j) => (
                        <li key={j} style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-geist-mono)", display: "flex", gap: 8 }}>
                          <span style={{ color }}>›</span> {d}
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
