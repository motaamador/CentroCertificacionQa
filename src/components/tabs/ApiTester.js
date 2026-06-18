"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Play, Copy, Check, Terminal } from "lucide-react";
import { SectionHeader, ResultPanel } from "@/components/ui";

// Build the curl command equivalent from the form state
function buildCurlCommand(url, method, headers, body, auth) {
  if (!url) return "";
  const lines = [`curl -s -X ${method}`];

  // Auth header
  if (auth.type === "bearer" && auth.token) {
    lines.push(`  -H "Authorization: Bearer ${auth.token}"`);
  } else if (auth.type === "basic" && auth.token) {
    lines.push(`  -H "Authorization: Basic ${auth.token}"`);
  } else if (auth.type === "apikey" && auth.token) {
    lines.push(`  -H "X-API-Key: ${auth.token}"`);
  }

  // Custom headers
  try {
    const parsed = JSON.parse(headers);
    Object.entries(parsed).forEach(([k, v]) => {
      lines.push(`  -H "${k}: ${v}"`);
    });
  } catch {}

  // Body
  if (["POST", "PUT", "PATCH"].includes(method) && body.trim()) {
    try {
      const compact = JSON.stringify(JSON.parse(body));
      lines.push(`  -d '${compact}'`);
    } catch {
      lines.push(`  -d '${body.replace(/'/g, "'\"'\"'")}'`);
    }
  }

  lines.push(`  "${url}"`);
  return lines.join(" \\\n");
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button onClick={copy} style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)",
      background: copied ? "rgba(16,185,129,0.1)" : "transparent",
      color: copied ? "#10b981" : "var(--text-muted)",
      fontSize: 11, cursor: "pointer", transition: "all 0.2s",
      borderColor: copied ? "rgba(16,185,129,0.4)" : "var(--border)",
    }}>
      {copied ? <><Check size={11}/> Copiado</> : <><Copy size={11}/> Copiar</>}
    </button>
  );
}

const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"];

const DEFAULT_HEADERS = `{
  "Content-Type": "application/json"
}`;

export default function ApiTester() {
  const [url, setUrl] = useState("https://jsonplaceholder.typicode.com/posts/1");
  const [method, setMethod] = useState("GET");
  const [body, setBody] = useState('{\n  "title": "Test Post",\n  "body": "Test body",\n  "userId": 1\n}');
  const [headers, setHeaders] = useState(DEFAULT_HEADERS);
  const [auth, setAuth] = useState({ type: "none", token: "" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("body");
  const [assertStatus, setAssertStatus] = useState("200");
  const [assertMaxMs, setAssertMaxMs] = useState("2000");

  const saveHistory = (r) => {
    try {
      const h = JSON.parse(localStorage.getItem("qa_history") || "[]");
      h.unshift({ ...r, type: "api", timestamp: Date.now() });
      localStorage.setItem("qa_history", JSON.stringify(h.slice(0, 100)));
    } catch {}
  };

  const runTest = async () => {
    setLoading(true);
    setResult(null);
    const start = Date.now();

    try {
      let parsedHeaders = {};
      try { parsedHeaders = JSON.parse(headers); } catch {}

      if (auth.type === "bearer" && auth.token) {
        parsedHeaders["Authorization"] = `Bearer ${auth.token}`;
      } else if (auth.type === "basic" && auth.token) {
        parsedHeaders["Authorization"] = `Basic ${auth.token}`;
      }

      const fetchOpts = {
        method,
        headers: parsedHeaders,
      };

      if (["POST", "PUT", "PATCH"].includes(method) && body.trim()) {
        try { fetchOpts.body = JSON.stringify(JSON.parse(body)); }
        catch { fetchOpts.body = body; }
      }

      // Route through our backend to avoid CORS for external URLs
      const proxyRes = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, options: fetchOpts, assertStatus: +assertStatus, assertMaxMs: +assertMaxMs }),
      });
      const data = await proxyRes.json();
      const latency = Date.now() - start;

      const r = { ...data, latency };
      setResult(r);
      saveHistory(r);
    } catch (err) {
      const r = { status: "fail", message: `Error: ${err.message}`, latency: Date.now() - start };
      setResult(r);
      saveHistory(r);
    }
    setLoading(false);
  };

  const methodColor = {
    GET: "#10b981", POST: "#3b82f6", PUT: "#f59e0b",
    DELETE: "#ef4444", PATCH: "#8b5cf6"
  }[method];

  const TAB_STYLE = (t) => ({
    padding: "6px 14px", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer",
    border: "none", background: activeTab === t ? "var(--bg-card)" : "transparent",
    color: activeTab === t ? "var(--text-primary)" : "var(--text-muted)",
    transition: "all 0.15s"
  });

  return (
    <div>
      <SectionHeader
        title="API Tester"
        desc="Prueba endpoints REST con soporte GET/POST/PUT/DELETE/PATCH, headers, autenticación y assertions"
        icon={Activity}
        color="#3b82f6"
      />

      {/* URL Bar */}
      <div className="qa-card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <select
              value={method}
              onChange={e => setMethod(e.target.value)}
              className="qa-select"
              style={{ minWidth: 100, color: methodColor, fontWeight: 700 }}
            >
              {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <input
            type="text"
            className="qa-input"
            placeholder="https://api.example.com/endpoint"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === "Enter" && runTest()}
            style={{ flex: 1, fontFamily: "var(--font-geist-mono)", fontSize: 13 }}
          />
          <button
            className="btn-primary"
            onClick={runTest}
            disabled={loading || !url}
            style={{ minWidth: 100, justifyContent: "center" }}
          >
            {loading ? "⟳ Enviando..." : <><Play size={14} /> Enviar</>}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="qa-card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "var(--bg-surface)", borderRadius: 8, padding: 4, width: "fit-content" }}>
          {["body", "headers", "auth", "assertions"].map(t => (
            <button key={t} style={TAB_STYLE(t)} onClick={() => setActiveTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "body" && (
            <motion.div key="body" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                Request Body (JSON)
              </label>
              <textarea
                className="qa-textarea"
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder={method === "GET" ? "GET requests have no body" : '{\n  "key": "value"\n}'}
                disabled={method === "GET"}
                style={{ minHeight: 140, opacity: method === "GET" ? 0.4 : 1 }}
              />
            </motion.div>
          )}

          {activeTab === "headers" && (
            <motion.div key="headers" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                Headers (JSON)
              </label>
              <textarea
                className="qa-textarea"
                value={headers}
                onChange={e => setHeaders(e.target.value)}
                style={{ minHeight: 140 }}
              />
            </motion.div>
          )}

          {activeTab === "auth" && (
            <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 10 }}>
                Tipo de Autenticación
              </label>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {["none", "bearer", "basic", "apikey"].map(t => (
                  <button key={t} onClick={() => setAuth(a => ({ ...a, type: t }))}
                    style={{
                      padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                      border: "1px solid var(--border)", cursor: "pointer",
                      background: auth.type === t ? "rgba(59,130,246,0.15)" : "transparent",
                      color: auth.type === t ? "var(--accent-blue)" : "var(--text-muted)",
                      borderColor: auth.type === t ? "var(--accent-blue)" : "var(--border)",
                      transition: "all 0.15s"
                    }}>
                    {t === "none" ? "Sin Auth" : t === "bearer" ? "Bearer" : t === "basic" ? "Basic" : "API Key"}
                  </button>
                ))}
              </div>
              {auth.type !== "none" && (
                <input
                  className="qa-input"
                  placeholder={
                    auth.type === "bearer" ? "Token JWT..." :
                    auth.type === "basic" ? "Base64(user:pass)" : "API Key..."
                  }
                  value={auth.token}
                  onChange={e => setAuth(a => ({ ...a, token: e.target.value }))}
                />
              )}
            </motion.div>
          )}

          {activeTab === "assertions" && (
            <motion.div key="assertions" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                    Código HTTP esperado
                  </label>
                  <input className="qa-input" value={assertStatus} onChange={e => setAssertStatus(e.target.value)} placeholder="200" />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                    Latencia máxima (ms)
                  </label>
                  <input className="qa-input" value={assertMaxMs} onChange={e => setAssertMaxMs(e.target.value)} placeholder="2000" />
                </div>
              </div>
              <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", fontSize: 12, color: "var(--text-secondary)" }}>
                ✓ La prueba pasará si el código HTTP es <b style={{ color: "var(--text-primary)" }}>{assertStatus}</b> y la latencia es menor a <b style={{ color: "var(--text-primary)" }}>{assertMaxMs}ms</b>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ResultPanel result={result} loading={loading} />

      {result?.responseBody && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="qa-card" style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600, letterSpacing: "0.05em" }}>
            RESPONSE BODY
          </div>
          <pre style={{
            margin: 0, fontSize: 12, color: "var(--text-secondary)",
            fontFamily: "var(--font-geist-mono)", overflowX: "auto",
            maxHeight: 300, overflow: "auto"
          }}>
            {typeof result.responseBody === "string"
              ? result.responseBody
              : JSON.stringify(result.responseBody, null, 2)}
          </pre>
        </motion.div>
      )}

      {/* cURL Generator */}
      {url && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="qa-card" style={{ marginTop: 12, borderColor: "rgba(6,182,212,0.2)" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Terminal size={14} color="#06b6d4" />
              <span style={{ fontSize: 12, color: "#06b6d4", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Equivalente cURL
              </span>
            </div>
            <CopyButton text={buildCurlCommand(url, method, headers, body, auth)} />
          </div>
          <pre style={{
            margin: 0, fontSize: 12, color: "var(--text-secondary)",
            fontFamily: "var(--font-geist-mono)", whiteSpace: "pre-wrap",
            wordBreak: "break-word", lineHeight: 1.8,
            background: "var(--bg-surface)", padding: "10px 14px",
            borderRadius: 8, borderLeft: "3px solid #06b6d4"
          }}>
            {buildCurlCommand(url, method, headers, body, auth)}
          </pre>
        </motion.div>
      )}
    </div>
  );
}
