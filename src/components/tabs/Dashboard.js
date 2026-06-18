"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity, ShieldCheck, Database, Wifi, CheckCircle2,
  XCircle, TrendingUp, Clock, Zap, BarChart2
} from "lucide-react";
import { StatCard, StatusBadge, SectionHeader } from "@/components/ui";

const QUICK_TESTS = [
  { id: "api", label: "API Health", icon: Activity, color: "#3b82f6" },
  { id: "security", label: "Security Scan", icon: ShieldCheck, color: "#10b981" },
  { id: "db", label: "DB Integrity", icon: Database, color: "#8b5cf6" },
  { id: "connectivity", label: "Connectivity", icon: Wifi, color: "#f59e0b" },
];

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState({ total: 0, pass: 0, fail: 0, avgLatency: 0 });
  const [quickResults, setQuickResults] = useState({});
  const [running, setRunning] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    // Load history for stats
    try {
      const h = JSON.parse(localStorage.getItem("qa_history") || "[]");
      setHistory(h.slice(0, 5));
      const total = h.length;
      const pass = h.filter(r => r.status === "pass").length;
      const fail = total - pass;
      const latencies = h.filter(r => r.latency).map(r => r.latency);
      const avgLatency = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
      setStats({ total, pass, fail, avgLatency });
    } catch {}
  }, []);

  const runQuick = async (testId) => {
    setRunning(testId);
    try {
      const start = Date.now();
      const res = await fetch(`/api/tests?type=${testId}`);
      const data = await res.json();
      const latency = Date.now() - start;
      const result = { ...data, latency, timestamp: Date.now(), type: testId };
      setQuickResults(p => ({ ...p, [testId]: result }));

      // Save to history
      const h = JSON.parse(localStorage.getItem("qa_history") || "[]");
      h.unshift(result);
      localStorage.setItem("qa_history", JSON.stringify(h.slice(0, 100)));
    } catch (err) {
      setQuickResults(p => ({ ...p, [testId]: { status: "fail", message: "Error de red" } }));
    }
    setRunning(null);
  };

  const passRate = stats.total ? Math.round((stats.pass / stats.total) * 100) : 0;

  return (
    <div>
      <SectionHeader
        title="Dashboard General"
        desc="Vista rápida del estado del sistema y métricas de certificación"
        icon={BarChart2}
        color="#6366f1"
      />

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
        <StatCard label="Total Tests" value={stats.total} sub="histórico" color="#6366f1" icon={Activity} />
        <StatCard label="PASS" value={stats.pass} sub={`${passRate}% tasa de éxito`} color="#10b981" icon={CheckCircle2} />
        <StatCard label="FAIL" value={stats.fail} sub="requieren atención" color="#ef4444" icon={XCircle} />
        <StatCard label="Latencia Avg" value={stats.avgLatency ? `${stats.avgLatency}ms` : "—"} sub="promedio global" color="#3b82f6" icon={Clock} />
      </div>

      {/* Quick tests */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 14, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Prueba Rápida
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          {QUICK_TESTS.map(t => {
            const Icon = t.icon;
            const res = quickResults[t.id];
            const isRunning = running === t.id;
            return (
              <motion.div key={t.id} whileHover={{ scale: 1.02 }} className="qa-card" style={{ borderColor: `${t.color}22` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `${t.color}18`, border: `1px solid ${t.color}33`,
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}>
                    <Icon size={18} color={t.color} />
                  </div>
                  {res && !isRunning && (
                    <StatusBadge status={res.status === "success" ? "pass" : "fail"} />
                  )}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 10 }}>
                  {t.label}
                </div>
                <button
                  className="btn-primary"
                  onClick={() => runQuick(t.id)}
                  disabled={isRunning}
                  style={{
                    width: "100%", justifyContent: "center",
                    background: `linear-gradient(135deg, ${t.color}, ${t.color}cc)`
                  }}
                >
                  {isRunning ? (
                    <><span className="animate-spin" style={{ display: "inline-block" }}>⟳</span> Ejecutando...</>
                  ) : "Ejecutar"}
                </button>
                {res?.message && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, fontFamily: "var(--font-geist-mono)" }}>
                    {res.message.slice(0, 60)}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Recent history */}
      {history.length > 0 && (
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 14, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Resultados Recientes
          </h2>
          <div className="qa-card" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Tipo", "Estado", "Latencia", "Mensaje", "Hora"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((r, i) => (
                  <tr key={i} style={{ borderBottom: i < history.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>
                      {r.type?.toUpperCase() || "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <StatusBadge status={r.status === "success" ? "pass" : "fail"} />
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-geist-mono)" }}>
                      {r.latency ? `${r.latency}ms` : "—"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-muted)", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.message}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-geist-mono)" }}>
                      {r.timestamp ? new Date(r.timestamp).toLocaleTimeString("es-VE") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
