"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, AlertCircle, Loader2, Clock, TrendingUp } from "lucide-react";

// ── Stat Card ──────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, color = "#3b82f6", icon: Icon, glow }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="qa-card"
      style={{ borderColor: `${color}22`, position: "relative", overflow: "hidden" }}
    >
      <div style={{
        position: "absolute", top: -20, right: -20, width: 80, height: 80,
        borderRadius: "50%", background: `${color}12`, filter: "blur(16px)"
      }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            {label}
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1.2, margin: "8px 0 4px" }}>
            {value}
          </div>
          {sub && <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{sub}</div>}
        </div>
        {Icon && (
          <div style={{
            width: 42, height: 42, borderRadius: 10,
            background: `${color}18`, border: `1px solid ${color}33`,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <Icon size={20} color={color} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────
export function StatusBadge({ status, label }) {
  const map = {
    pass:    { cls: "badge-pass",    icon: <CheckCircle2 size={12} />, text: label || "PASS" },
    fail:    { cls: "badge-fail",    icon: <XCircle size={12} />,      text: label || "FAIL" },
    warn:    { cls: "badge-warn",    icon: <AlertCircle size={12} />,  text: label || "WARN" },
    running: { cls: "badge-running", icon: <Loader2 size={12} className="animate-spin" />, text: label || "..." },
    idle:    { cls: "",              icon: null, text: label || "IDLE" },
  };
  const s = map[status] || map.idle;
  return (
    <span className={s.cls} style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      letterSpacing: "0.06em"
    }}>
      {s.icon}{s.text}
    </span>
  );
}

// ── Result Panel ──────────────────────────────────────────────────────────
export function ResultPanel({ result, loading }) {
  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        style={{
          background: "var(--bg-surface)", border: "1px solid var(--border)",
          borderRadius: 12, padding: 20, marginTop: 16,
          display: "flex", alignItems: "center", gap: 12
        }}>
        <Loader2 size={18} color="var(--accent-blue)" className="animate-spin" />
        <span style={{ color: "var(--text-secondary)", fontSize: 14 }}>Ejecutando pruebas...</span>
        <div style={{ flex: 1, height: 2, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
          <motion.div
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            style={{ width: "50%", height: "100%", background: "linear-gradient(90deg, transparent, var(--accent-blue), transparent)" }}
          />
        </div>
      </motion.div>
    );
  }

  if (!result) return null;

  const isPass = result.status === "pass" || result.status === "success";
  const color = isPass ? "var(--accent-green)" : result.status === "warn" ? "var(--accent-yellow)" : "var(--accent-red)";

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      style={{
        background: "var(--bg-surface)", border: `1px solid ${color}33`,
        borderRadius: 12, padding: 20, marginTop: 16, overflow: "hidden"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        {isPass
          ? <CheckCircle2 size={18} color="var(--accent-green)" />
          : <XCircle size={18} color={color} />}
        <span style={{ fontWeight: 700, color, fontSize: 14 }}>{result.message}</span>
        {result.latency != null && (
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
            <Clock size={11} />{result.latency}ms
          </span>
        )}
      </div>
      {result.details?.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {result.details.map((d, i) => (
            <li key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 8,
              fontSize: 13, color: "var(--text-secondary)",
              fontFamily: "var(--font-geist-mono)"
            }}>
              <span style={{ color, marginTop: 2 }}>›</span>
              <span>{d}</span>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

// ── Section Header ─────────────────────────────────────────────────────────
export function SectionHeader({ title, desc, icon: Icon, color = "#3b82f6" }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        {Icon && (
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `${color}18`, border: `1px solid ${color}33`,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <Icon size={18} color={color} />
          </div>
        )}
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>{title}</h1>
      </div>
      {desc && <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", paddingLeft: Icon ? 48 : 0 }}>{desc}</p>}
    </div>
  );
}

// ── Method Badge ───────────────────────────────────────────────────────────
export function MethodBadge({ method }) {
  return (
    <span className={`method-${method.toLowerCase()}`} style={{
      padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800,
      fontFamily: "var(--font-geist-mono)", letterSpacing: "0.05em"
    }}>
      {method}
    </span>
  );
}
