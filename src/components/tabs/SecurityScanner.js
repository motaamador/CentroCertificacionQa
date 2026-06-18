"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Play, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { SectionHeader, StatusBadge } from "@/components/ui";

const CHECKS = [
  { id: "headers", label: "Security Headers", desc: "HSTS, CSP, X-Frame-Options, X-Content-Type", icon: "🛡️" },
  { id: "cors", label: "CORS Config", desc: "Detecta configuraciones permisivas de CORS", icon: "🌐" },
  { id: "ssl", label: "SSL/TLS", desc: "Valida certificado y versión del protocolo", icon: "🔒" },
  { id: "injection", label: "SQL Injection", desc: "Envía payloads maliciosos y valida rechazo", icon: "💉" },
  { id: "ratelimit", label: "Rate Limiting", desc: "Verifica protección contra flood de requests", icon: "⏱️" },
];

export default function SecurityScanner() {
  const [targetUrl, setTargetUrl] = useState("https://jsonplaceholder.typicode.com");
  const [selected, setSelected] = useState(new Set(["headers", "cors", "ssl"]));
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(null);

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const runAll = async () => {
    setLoading(true);
    setResults({});
    const localResults = {}; // Acumulador local para evitar problemas de closure en React

    for (const check of CHECKS.filter(c => selected.has(c.id))) {
      setRunning(check.id);
      try {
        const res = await fetch(`/api/security?check=${check.id}&url=${encodeURIComponent(targetUrl)}`);
        const data = await res.json();
        localResults[check.id] = data;
        setResults(prev => ({ ...prev, [check.id]: data }));
      } catch {
        const errorData = { status: "fail", message: "Error de conexión", findings: [] };
        localResults[check.id] = errorData;
        setResults(prev => ({ ...prev, [check.id]: errorData }));
      }
      await new Promise(r => setTimeout(r, 300));
    }
    setRunning(null);
    setLoading(false);

    // Save to history
    try {
      const h = JSON.parse(localStorage.getItem("qa_history") || "[]");
      const allPass = Object.values(localResults).every(r => r.status === "pass");
      
      const details = [];
      Object.entries(localResults).forEach(([checkId, res]) => {
        const label = CHECKS.find(c => c.id === checkId)?.label || checkId;
        details.push(`[${label}] - Status: ${res.status?.toUpperCase() || "UNKNOWN"}`);
        if (res.findings) {
          res.findings.forEach(f => {
            const icon = f.severity === "critical" ? "✗" : f.severity === "warn" ? "⚠" : "✓";
            details.push(`  ${icon} ${f.message}`);
          });
        }
      });

      h.unshift({ 
        type: "security", 
        status: allPass ? "pass" : "fail", 
        message: `Escaneo de seguridad en ${targetUrl}`, 
        timestamp: Date.now(),
        details 
      });
      localStorage.setItem("qa_history", JSON.stringify(h.slice(0, 100)));
    } catch {}
  };

  const totalSelected = selected.size;
  const passCount = Object.values(results).filter(r => r.status === "pass").length;
  const failCount = Object.values(results).filter(r => r.status === "fail").length;
  const warnCount = Object.values(results).filter(r => r.status === "warn").length;

  return (
    <div>
      <SectionHeader
        title="Security Scanner"
        desc="Detecta vulnerabilidades OWASP Top 10: inyección SQL, misconfiguraciones CORS, headers inseguros y más"
        icon={ShieldAlert}
        color="#10b981"
      />

      {/* Target + run */}
      <div className="qa-card" style={{ marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
        <input
          className="qa-input"
          placeholder="https://target-api.example.com"
          value={targetUrl}
          onChange={e => setTargetUrl(e.target.value)}
          style={{ flex: 1, fontFamily: "var(--font-geist-mono)", fontSize: 13 }}
        />
        <button
          className="btn-primary"
          onClick={runAll}
          disabled={loading || !targetUrl || selected.size === 0}
          style={{ minWidth: 140, justifyContent: "center", background: "linear-gradient(135deg, #10b981, #059669)" }}
        >
          {loading ? "⟳ Escaneando..." : <><Play size={14} /> Iniciar Scan</>}
        </button>
      </div>

      {/* Check selector */}
      <div className="qa-card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Checks a ejecutar ({totalSelected}/{CHECKS.length})
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {CHECKS.map(c => (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              title={c.desc}
              style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: "1px solid var(--border)", cursor: "pointer",
                background: selected.has(c.id) ? "rgba(16,185,129,0.1)" : "transparent",
                color: selected.has(c.id) ? "#10b981" : "var(--text-muted)",
                borderColor: selected.has(c.id) ? "rgba(16,185,129,0.4)" : "var(--border)",
                transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6
              }}
            >
              <span>{c.icon}</span> {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary when done */}
      {Object.keys(results).length > 0 && !loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{
            display: "flex", gap: 12, marginBottom: 16,
            padding: 16, borderRadius: 12, background: "var(--bg-card)",
            border: "1px solid var(--border)"
          }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "#10b981" }}>
            <CheckCircle2 size={18} /> {passCount} PASS
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "#ef4444" }}>
            <XCircle size={18} /> {failCount} FAIL
          </div>
          {warnCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "#f59e0b" }}>
              <AlertTriangle size={18} /> {warnCount} WARN
            </div>
          )}
          <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>
            {failCount === 0 ? "✅ Sin vulnerabilidades críticas" : `⚠️ ${failCount} problema(s) detectado(s)`}
          </div>
        </motion.div>
      )}

      {/* Results */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {CHECKS.filter(c => selected.has(c.id)).map(check => {
          const res = results[check.id];
          const isRunning = running === check.id;
          const status = isRunning ? "running" : res ? (res.status === "pass" ? "pass" : res.status === "warn" ? "warn" : "fail") : "idle";

          return (
            <motion.div
              key={check.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="qa-card"
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 22 }}>{check.icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>
                      {check.label}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{check.desc}</div>
                  </div>
                </div>
                <StatusBadge status={status} />
              </div>

              {res?.findings?.length > 0 && (
                <motion.ul
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ listStyle: "none", padding: 0, margin: "12px 0 0", display: "flex", flexDirection: "column", gap: 6 }}
                >
                  {res.findings.map((f, i) => (
                    <li key={i} style={{
                      display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12,
                      color: f.severity === "critical" ? "#ef4444" : f.severity === "warn" ? "#f59e0b" : "var(--text-secondary)",
                      fontFamily: "var(--font-geist-mono)", padding: "6px 10px",
                      background: "var(--bg-surface)", borderRadius: 6
                    }}>
                      <span>{f.severity === "critical" ? "✗" : f.severity === "warn" ? "⚠" : "✓"}</span>
                      <span>{f.message}</span>
                    </li>
                  ))}
                </motion.ul>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
