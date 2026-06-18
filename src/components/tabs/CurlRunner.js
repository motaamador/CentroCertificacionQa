"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Play, Copy, Check, Trash2, Clock, ChevronDown } from "lucide-react";
import { SectionHeader, StatusBadge } from "@/components/ui";

// ── Ejemplos predefinidos ─────────────────────────────────────────────────
const EXAMPLES = [
  {
    group: "🌐 GET básicos",
    items: [
      {
        label: "GET JSON simple",
        cmd: `curl -s https://jsonplaceholder.typicode.com/posts/1`,
      },
      {
        label: "GET con headers",
        cmd: `curl -s https://httpbin.org/headers -H "X-Custom-Header: QA-Test" -H "Accept: application/json"`,
      },
      {
        label: "Ver código HTTP",
        cmd: `curl -s -o /dev/null -w "%{http_code}" https://jsonplaceholder.typicode.com/posts/1`,
      },
      {
        label: "Ver headers de respuesta",
        cmd: `curl -sI https://jsonplaceholder.typicode.com/posts/1`,
      },
    ],
  },
  {
    group: "📤 POST / PUT / DELETE",
    items: [
      {
        label: "POST JSON",
        cmd: `curl -s -X POST https://jsonplaceholder.typicode.com/posts -H "Content-Type: application/json" -d '{"title":"Prueba QA","body":"Contenido de prueba","userId":1}'`,
      },
      {
        label: "PUT actualizar",
        cmd: `curl -s -X PUT https://jsonplaceholder.typicode.com/posts/1 -H "Content-Type: application/json" -d '{"id":1,"title":"Actualizado","body":"Nuevo contenido","userId":1}'`,
      },
      {
        label: "DELETE recurso",
        cmd: `curl -s -X DELETE https://jsonplaceholder.typicode.com/posts/1`,
      },
    ],
  },
  {
    group: "🔒 Auth & Seguridad",
    items: [
      {
        label: "Bearer Token",
        cmd: `curl -s https://httpbin.org/bearer -H "Authorization: Bearer mi-token-jwt-aqui"`,
      },
      {
        label: "Basic Auth",
        cmd: `curl -s -u usuario:contraseña https://httpbin.org/basic-auth/usuario/contraseña`,
      },
      {
        label: "Ver SSL/TLS info",
        cmd: `curl -sv https://jsonplaceholder.typicode.com/posts/1 --max-time 10`,
      },
    ],
  },
  {
    group: "📡 Diagnóstico",
    items: [
      {
        label: "Latencia / timing",
        cmd: `curl -s -o /dev/null -w "DNS: %{time_namelookup}s | Connect: %{time_connect}s | Total: %{time_total}s | HTTP: %{http_code}" https://jsonplaceholder.typicode.com/posts/1`,
      },
      {
        label: "Seguir redirecciones",
        cmd: `curl -sL -o /dev/null -w "%{url_effective} - HTTP %{http_code}" http://github.com`,
      },
      {
        label: "IP y geolocalización",
        cmd: `curl -s https://ipinfo.io/json`,
      },
    ],
  },
];

// ── Historial de comandos ─────────────────────────────────────────────────
function useCurlHistory() {
  const [history, setHistory] = useState([]);
  const add = (entry) => setHistory(prev => [entry, ...prev].slice(0, 20));
  const clear = () => setHistory([]);
  return { history, add, clear };
}

// ── Botón copiar ──────────────────────────────────────────────────────────
function CopyButton({ text, small }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); } catch { }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button onClick={copy}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: small ? "3px 8px" : "5px 12px",
        borderRadius: 6, border: "1px solid var(--border)",
        background: copied ? "rgba(16,185,129,0.1)" : "transparent",
        color: copied ? "#10b981" : "var(--text-muted)",
        fontSize: small ? 11 : 12, cursor: "pointer", transition: "all 0.2s",
        borderColor: copied ? "rgba(16,185,129,0.4)" : "var(--border)",
      }}>
      {copied ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar</>}
    </button>
  );
}

// ── Componente principal ──────────────────────────────────────────────────
export default function CurlRunner() {
  const [command, setCommand] = useState(`curl -s https://jsonplaceholder.typicode.com/posts/1`);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openGroup, setOpenGroup] = useState("🌐 GET básicos");
  const { history, add, clear } = useCurlHistory();
  const [showHistory, setShowHistory] = useState(false);

  const run = async () => {
    if (!command.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/curl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: command.trim(), timeoutMs: 15000 }),
      });
      const data = await res.json();
      setResult(data);
      add({ command: command.trim(), ...data, ts: Date.now() });

      // Save to global history
      try {
        const h = JSON.parse(localStorage.getItem("qa_history") || "[]");
        h.unshift({ 
          type: "curl", 
          status: data.status, 
          message: data.message, 
          latency: data.latency, 
          stdout: data.stdout,
          stderr: data.stderr,
          executedCommand: data.executedCommand,
          timestamp: Date.now() 
        });
        localStorage.setItem("qa_history", JSON.stringify(h.slice(0, 100)));
      } catch {}
    } catch (err) {
      const r = { status: "fail", message: `Error: ${err.message}`, stdout: "", stderr: err.message, executedCommand: command.trim() };
      setResult(r);
      add({ command: command.trim(), ...r, ts: Date.now() });

      // Guardar también el error en el historial general para el PDF
      try {
        const h = JSON.parse(localStorage.getItem("qa_history") || "[]");
        h.unshift({ type: "curl", ...r, timestamp: Date.now() });
        localStorage.setItem("qa_history", JSON.stringify(h.slice(0, 100)));
      } catch {}
    }
    setLoading(false);
  };

  const isPass = result?.status === "pass";

  return (
    <div>
      <SectionHeader
        title="cURL Runner"
        desc="Ejecuta comandos curl directamente en el servidor — con sanitización de seguridad y output formateado"
        icon={Terminal}
        color="#06b6d4"
      />

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>
        {/* ── Panel izquierdo: ejemplos ── */}
        <div className="qa-card" style={{ padding: 12, alignSelf: "start" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Ejemplos
          </div>
          {EXAMPLES.map(group => (
            <div key={group.group} style={{ marginBottom: 4 }}>
              <button
                onClick={() => setOpenGroup(openGroup === group.group ? null : group.group)}
                style={{
                  width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "7px 8px", borderRadius: 8, border: "none", cursor: "pointer",
                  background: openGroup === group.group ? "rgba(6,182,212,0.1)" : "transparent",
                  color: openGroup === group.group ? "#06b6d4" : "var(--text-secondary)",
                  fontSize: 12, fontWeight: 600, transition: "all 0.15s"
                }}
              >
                <span>{group.group}</span>
                <ChevronDown size={12} style={{ transform: openGroup === group.group ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
              </button>
              <AnimatePresence>
                {openGroup === group.group && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: "hidden" }}>
                    <div style={{ paddingLeft: 8, paddingTop: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                      {group.items.map(item => (
                        <button key={item.label} onClick={() => setCommand(item.cmd)}
                          title={item.cmd}
                          style={{
                            textAlign: "left", padding: "5px 8px", borderRadius: 6,
                            border: "none", background: command === item.cmd ? "rgba(6,182,212,0.08)" : "transparent",
                            color: command === item.cmd ? "#06b6d4" : "var(--text-muted)",
                            fontSize: 11, cursor: "pointer", transition: "all 0.1s",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%"
                          }}
                          onMouseEnter={e => { if (command !== item.cmd) e.currentTarget.style.color = "var(--text-primary)"; }}
                          onMouseLeave={e => { if (command !== item.cmd) e.currentTarget.style.color = "var(--text-muted)"; }}>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          {/* Session history */}
          {history.length > 0 && (
            <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Historial ({history.length})
                </span>
                <button onClick={clear} style={{ fontSize: 10, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                  <Trash2 size={10} /> Limpiar
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 200, overflowY: "auto" }}>
                {history.map((h, i) => (
                  <button key={i} onClick={() => setCommand(h.command)}
                    title={h.command}
                    style={{
                      textAlign: "left", padding: "4px 8px", borderRadius: 6,
                      border: "none", background: "transparent",
                      color: "var(--text-muted)", fontSize: 10, cursor: "pointer",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      display: "flex", alignItems: "center", gap: 6, width: "100%"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg-card-hover)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: h.status === "pass" ? "#10b981" : "#ef4444" }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{h.command.slice(7, 50)}…</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Panel derecho: editor + output ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Editor */}
          <div className="qa-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Comando cURL
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <CopyButton text={command} small />
                <button onClick={() => setCommand("curl ")}
                  style={{ fontSize: 11, color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                  <Trash2 size={10} /> Limpiar
                </button>
              </div>
            </div>
            <textarea
              className="qa-textarea"
              value={command}
              onChange={e => setCommand(e.target.value)}
              onKeyDown={e => { if (e.ctrlKey && e.key === "Enter") run(); }}
              placeholder="curl -s https://tu-api.com/endpoint"
              style={{ minHeight: 80, fontSize: 13, fontFamily: "var(--font-geist-mono)", color: "#06b6d4" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Ctrl+Enter para ejecutar · Solo se permite <code style={{ color: "#06b6d4" }}>curl</code>
              </span>
              <button
                className="btn-primary"
                onClick={run}
                disabled={loading || !command.trim().startsWith("curl")}
                style={{ background: "linear-gradient(135deg, #06b6d4, #0891b2)", justifyContent: "center" }}
              >
                {loading ? "⟳ Ejecutando..." : <><Play size={14} /> Ejecutar</>}
              </button>
            </div>
          </div>

          {/* Loading bar */}
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ padding: "12px 16px", borderRadius: 10, background: "var(--bg-card)", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 14, height: 14, border: "2px solid #06b6d4", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Ejecutando curl en el servidor...</span>
              <div style={{ flex: 1, height: 2, background: "var(--border)", borderRadius: 1, overflow: "hidden" }}>
                <motion.div animate={{ x: ["-100%", "100%"] }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  style={{ width: "50%", height: "100%", background: "linear-gradient(90deg, transparent, #06b6d4, transparent)" }} />
              </div>
            </motion.div>
          )}

          {/* Result */}
          {result && !loading && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              {/* Status bar */}
              <div style={{
                display: "flex", alignItems: "center", gap: 12, marginBottom: 10,
                padding: "10px 16px", borderRadius: 10,
                background: isPass ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                border: `1px solid ${isPass ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
              }}>
                <StatusBadge status={isPass ? "pass" : "fail"} />
                <span style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>{result.message}</span>
                {result.latency != null && (
                  <span style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--font-geist-mono)" }}>
                    <Clock size={11} />{result.latency}ms
                  </span>
                )}
              </div>

              {/* Executed command */}
              {result.executedCommand && (
                <div className="qa-card" style={{ marginBottom: 10, padding: "10px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Comando ejecutado</span>
                    <CopyButton text={result.executedCommand} small />
                  </div>
                  <pre style={{ margin: 0, fontSize: 11, color: "#06b6d4", fontFamily: "var(--font-geist-mono)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                    {result.executedCommand}
                  </pre>
                </div>
              )}

              {/* stdout */}
              {result.stdout && (
                <div className="qa-card" style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      OUTPUT ({result.outputLines} líneas)
                    </span>
                    <CopyButton text={result.stdout} small />
                  </div>
                  <pre style={{
                    margin: 0, fontSize: 12, color: "var(--text-secondary)",
                    fontFamily: "var(--font-geist-mono)", overflowX: "auto",
                    maxHeight: 420, overflow: "auto", whiteSpace: "pre-wrap",
                    wordBreak: "break-word", lineHeight: 1.6,
                    background: "var(--bg-surface)", padding: 12, borderRadius: 8
                  }}>
                    {result.stdout}
                  </pre>
                </div>
              )}

              {/* stderr */}
              {result.stderr && (
                <div className="qa-card" style={{ borderColor: "rgba(239,68,68,0.2)" }}>
                  <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                    STDERR
                  </div>
                  <pre style={{
                    margin: 0, fontSize: 11, color: "#ef4444",
                    fontFamily: "var(--font-geist-mono)", whiteSpace: "pre-wrap",
                    wordBreak: "break-word", opacity: 0.8
                  }}>
                    {result.stderr}
                  </pre>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
