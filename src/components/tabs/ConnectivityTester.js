"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, Play, Network, Copy, Check, ScanSearch, AlertTriangle, Info, Download, RefreshCw } from "lucide-react";
import { SectionHeader, StatusBadge } from "@/components/ui";

// ── Checks HTTP existentes ────────────────────────────────────────────────
const CHECKS = [
  { id: "ping", label: "Ping / Latencia", icon: "📡", desc: "Mide tiempo de respuesta HTTP" },
  { id: "dns",  label: "DNS Resolution",  icon: "🔍", desc: "Resuelve nombre de dominio" },
  { id: "ssl",  label: "SSL/TLS Cert",    icon: "🔐", desc: "Valida certificado HTTPS" },
  { id: "http", label: "HTTP Status",     icon: "🌐", desc: "Verifica respuesta 2xx" },
];

const PRESETS = [
  { label: "Google",     host: "google.com",       port: "443" },
  { label: "Cloudflare", host: "cloudflare.com",   port: "443" },
  { label: "SCIME DB",   host: "192.168.81.60",    port: "5432" },
  { label: "Localhost",  host: "localhost",         port: "3002" },
];

// ── Herramientas de red (nueva sección) ───────────────────────────────────
const NET_TOOLS = [
  {
    id: "traceroute",
    label: "Traceroute",
    icon: "🗺️",
    desc: "Ruta de saltos hasta el destino",
    color: "#f59e0b",
    fields: [],
  },
  {
    id: "ping",
    label: "Ping nativo",
    icon: "📶",
    desc: "4 paquetes ICMP con estadísticas",
    color: "#10b981",
    fields: [],
  },
  {
    id: "nslookup",
    label: "NSLookup",
    icon: "🔎",
    desc: "Consulta DNS detallada",
    color: "#3b82f6",
    fields: [],
  },
  {
    id: "dig",
    label: "DIG",
    icon: "🧬",
    desc: "Consulta DNS avanzada",
    color: "#8b5cf6",
    fields: [{ key: "extra", label: "Tipo registro", placeholder: "A, MX, TXT, CNAME..." }],
  },
  {
    id: "nc",
    label: "Port Check (nc)",
    icon: "🔌",
    desc: "Verifica si un puerto está abierto",
    color: "#06b6d4",
    fields: [{ key: "port", label: "Puerto", placeholder: "5432, 80, 443..." }],
  },
];

// ── CopyButton util ───────────────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button onClick={copy} style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 8px", borderRadius: 6, border: "1px solid var(--border)",
      background: copied ? "rgba(16,185,129,0.1)" : "transparent",
      color: copied ? "#10b981" : "var(--text-muted)",
      fontSize: 10, cursor: "pointer", transition: "all 0.2s",
    }}>
      {copied ? <><Check size={10}/> Copiado</> : <><Copy size={10}/> Copiar</>}
    </button>
  );
}

// ── DiagnosticSection ─────────────────────────────────────────────────────
function DiagnosticSection() {
  const [diagHost, setDiagHost]       = useState("192.168.81.60");
  const [diagData, setDiagData]       = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagError, setDiagError]     = useState(null);
  const [pdfLoading, setPdfLoading]   = useState(false);
  const [pdfError, setPdfError]       = useState(null);

  const DIAG_PRESETS = [
    { label: "SAIME DB",   host: "192.168.81.60" },
    { label: "Localhost",  host: "localhost" },
    { label: "Gateway",    host: "192.168.81.1" },
    { label: "Google DNS", host: "8.8.8.8" },
  ];

  const runDiagnostic = async () => {
    if (!diagHost.trim()) return;
    setDiagLoading(true);
    setDiagData(null);
    setDiagError(null);
    try {
      const res  = await fetch(`/api/diagnostic?host=${encodeURIComponent(diagHost.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error desconocido");
        setDiagData(data);
      // Guardar en historial
      try {
        const h = JSON.parse(localStorage.getItem("qa_history") || "[]");
        h.unshift({
          type: "connectivity",
          status: data.status,
          message: `Diagnóstico: ${diagHost.trim()} — ${data.openPorts?.length || 0} puertos abiertos`,
          timestamp: Date.now(),
          diagData: data,
        });
        localStorage.setItem("qa_history", JSON.stringify(h.slice(0, 100)));
      } catch {}
    } catch (err) {
      setDiagError(err.message);
    }
    setDiagLoading(false);
  };

  const exportPDF = async () => {
    if (!diagData) return;
    setPdfLoading(true);
    setPdfError(null);
    try {
      const item = {
        type: "connectivity",
        status: diagData.status,
        message: diagData.message,
        timestamp: Date.now(),
        details: [
          `Host: ${diagData.host}`,
          `Ping: ${diagData.ping.reachable ? "Alcanzable" : "No responde"} — Pérdida: ${diagData.ping.loss}, Avg RTT: ${diagData.ping.avg || "—"}`,
          `IP local: ${diagData.network.localIP || "—"} · Gateway: ${diagData.network.gateway || "—"} · Misma red: ${diagData.network.sameSubnet ? "Sí" : "No"}`,
          `Puertos abiertos (${diagData.openPorts?.length || 0}): ${diagData.openPorts?.map(p => `${p.port}/${p.service}`).join(", ") || "Ninguno"}`,
          `Traceroute: ${diagData.trace?.totalHops || 0} saltos`,
          ...( diagData.recommendations?.map(r => `[${r.type.toUpperCase()}] ${r.text}`) || [] ),
        ],
        latency: diagData.duration,
      };
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [item],
          operador: "Analista QA",
          titulo: `Diagnóstico de Red — ${diagData.host}`,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `Diagnostico_${diagData.host}_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setPdfError(`Error al generar PDF: ${err.message}`);
    }
    setPdfLoading(false);
  };

  const recColor = { ok: "#10b981", warn: "#f59e0b", error: "#ef4444", info: "#3b82f6" };
  const recIcon  = { ok: "✅", warn: "⚠️", error: "❌", info: "ℹ️" };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <ScanSearch size={16} color="#a78bfa" />
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
          Diagnóstico General de Host
        </span>
        <span style={{
          fontSize: 10, padding: "2px 8px", borderRadius: 10,
          background: "rgba(167,139,250,0.1)", color: "#a78bfa",
          border: "1px solid rgba(167,139,250,0.25)", fontWeight: 600,
        }}>
          ping · traceroute · puertos · red
        </span>
      </div>

      {/* Input row */}
      <div className="qa-card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
          <input
            className="qa-input"
            placeholder="hostname o IP (ej: 192.168.1.1)"
            value={diagHost}
            onChange={e => setDiagHost(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !diagLoading && runDiagnostic()}
            style={{ flex: 1, fontFamily: "var(--font-geist-mono)", fontSize: 13 }}
          />
          <button
            className="btn-primary"
            onClick={runDiagnostic}
            disabled={diagLoading || !diagHost.trim()}
            style={{
              minWidth: 150, justifyContent: "center",
              background: diagLoading
                ? "rgba(167,139,250,0.3)"
                : "linear-gradient(135deg, #a78bfa, #7c3aed)",
            }}
          >
            {diagLoading
              ? <><div style={{ width: 12, height: 12, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", display: "inline-block", marginRight: 6 }} />Analizando...</>
              : <><ScanSearch size={14} style={{ marginRight: 6 }} />Diagnosticar</>
            }
          </button>
        </div>

        {/* Presets */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", alignSelf: "center" }}>Presets:</span>
          {DIAG_PRESETS.map(p => (
            <button key={p.label}
              onClick={() => setDiagHost(p.host)}
              style={{
                padding: "3px 10px", fontSize: 11, borderRadius: 6,
                border: `1px solid ${diagHost === p.host ? "rgba(167,139,250,0.4)" : "var(--border)"}`,
                background: diagHost === p.host ? "rgba(167,139,250,0.1)" : "transparent",
                color: diagHost === p.host ? "#a78bfa" : "var(--text-muted)",
                cursor: "pointer", transition: "all 0.15s",
              }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {diagError && (
        <div className="qa-card" style={{ borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ef4444", fontSize: 13 }}>
            <AlertTriangle size={14} /> {diagError}
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {diagLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {["Ejecutando ping...", "Trazando ruta...", "Escaneando puertos..."].map((msg, i) => (
            <div key={i} className="qa-card" style={{ opacity: 0.6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-muted)", fontSize: 13 }}>
                <div style={{ width: 14, height: 14, border: "2px solid #a78bfa", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", flexShrink: 0 }} />
                {msg}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {diagData && !diagLoading && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Summary header */}
          <div className="qa-card" style={{
            borderColor: diagData.status === "pass" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)",
            background: diagData.status === "pass" ? "rgba(16,185,129,0.05)" : "rgba(239,68,68,0.05)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>
                  {diagData.message}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Análisis completado en {diagData.duration}ms
                </div>
              </div>
              <StatusBadge status={diagData.status} />
            </div>
          </div>

          {/* Ping stats */}
          <div className="qa-card">
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
              📡 Ping — {diagData.ping.reachable ? "Alcanzable" : "Sin respuesta"}
            </div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              {[
                { label: "Enviados",  val: diagData.ping.sent },
                { label: "Recibidos", val: diagData.ping.received },
                { label: "Pérdida",   val: diagData.ping.loss },
                { label: "Min RTT",   val: diagData.ping.min || "—" },
                { label: "Avg RTT",   val: diagData.ping.avg || "—" },
                { label: "Max RTT",   val: diagData.ping.max || "—" },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#a78bfa", fontFamily: "var(--font-geist-mono)" }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Network info */}
          <div className="qa-card">
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
              🌐 Red local
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
              {[
                { label: "IP local",  val: diagData.network.localIP  || "—" },
                { label: "Gateway",   val: diagData.network.gateway  || "—" },
                { label: "Red/CIDR",  val: diagData.network.localNet || "—" },
                { label: "Misma red", val: diagData.network.sameSubnet ? "✅ Sí" : "🔀 No" },
              ].map(s => (
                <div key={s.label} style={{ background: "var(--bg-surface)", borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-geist-mono)" }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Open ports */}
          {diagData.ports?.length > 0 && (
            <div className="qa-card">
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                🔌 Puertos escaneados — {diagData.openPorts?.length || 0} abiertos
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {diagData.ports.map(p => (
                  <div key={p.port} style={{
                    padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                    border: `1px solid ${p.open ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.08)"}`,
                    background: p.open ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.03)",
                    color: p.open ? "#10b981" : "var(--text-muted)",
                    fontFamily: "var(--font-geist-mono)",
                    display: "flex", gap: 6, alignItems: "center",
                  }}>
                    <span>{p.open ? "●" : "○"}</span>
                    <span>{p.port}</span>
                    <span style={{ fontSize: 10, opacity: 0.7 }}>{p.service}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Traceroute */}
          {diagData.trace?.hops?.length > 0 && (
            <div className="qa-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  🗺️ Traceroute — {diagData.trace.totalHops} saltos
                </div>
                <CopyButton text={diagData.trace.hops.map(h => `${h.hop}  ${h.info}`).join("\n")} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 260, overflowY: "auto" }}>
                {diagData.trace.hops.map((hop, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "6px 10px", borderRadius: 8,
                    background: "var(--bg-surface)", fontSize: 12,
                    fontFamily: "var(--font-geist-mono)",
                  }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                      background: `rgba(167,139,250,${0.1 + i * 0.025})`,
                      border: "1px solid rgba(167,139,250,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, color: "#a78bfa", fontWeight: 700,
                    }}>
                      {hop.hop}
                    </span>
                    <span style={{ color: "var(--text-secondary)", flex: 1 }}>{hop.info}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {diagData.recommendations?.length > 0 && (
            <div className="qa-card">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Info size={13} color="#3b82f6" />
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Recomendaciones
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {diagData.recommendations.map((rec, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "8px 12px", borderRadius: 8,
                    background: `${recColor[rec.type]}0d`,
                    border: `1px solid ${recColor[rec.type]}33`,
                    fontSize: 13,
                  }}>
                    <span style={{ flexShrink: 0, fontSize: 14 }}>{recIcon[rec.type]}</span>
                    <span style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>{rec.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

          {/* ── PDF export button row ── */}
          {diagData && !diagLoading && (
            <div style={{ marginTop: 4 }}>
              {pdfError && (
                <div style={{ marginBottom: 8, padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 12, color: "#ef4444" }}>
                  {pdfError}
                </div>
              )}
              <button
                onClick={exportPDF}
                disabled={pdfLoading}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 20px", borderRadius: 10, cursor: pdfLoading ? "wait" : "pointer",
                  border: "1px solid rgba(167,139,250,0.4)",
                  background: pdfLoading ? "rgba(167,139,250,0.1)" : "linear-gradient(135deg, rgba(167,139,250,0.15), rgba(124,58,237,0.2))",
                  color: "#a78bfa", fontSize: 13, fontWeight: 700,
                  transition: "all 0.2s", width: "100%", justifyContent: "center",
                }}
              >
                {pdfLoading
                  ? <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Generando PDF...</>
                  : <><Download size={14} /> Exportar Diagnóstico como PDF</>
                }
              </button>
            </div>
          )}

    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────
export default function ConnectivityTester() {
  // HTTP checks
  const [host, setHost]         = useState("google.com");
  const [port, setPort]         = useState("443");
  const [selected, setSelected] = useState(new Set(["ping", "dns", "ssl", "http"]));
  const [results, setResults]   = useState({});
  const [loading, setLoading]   = useState(false);
  const [running, setRunning]   = useState(null);

  // Net tools
  const [ntHost, setNtHost]         = useState("google.com");
  const [ntTool, setNtTool]         = useState(null);
  const [ntPort, setNtPort]         = useState("443");
  const [ntExtra, setNtExtra]       = useState("A");
  const [ntResult, setNtResult]     = useState(null);
  const [ntLoading, setNtLoading]   = useState(false);

  const toggle = (id) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  // Run HTTP checks
  const runAll = async () => {
    setLoading(true);
    setResults({});
    const checks = CHECKS.filter(c => selected.has(c.id));
    for (const check of checks) {
      setRunning(check.id);
      try {
        const res = await fetch(`/api/connectivity?check=${check.id}&host=${encodeURIComponent(host)}&port=${port}`);
        const data = await res.json();
        setResults(prev => ({ ...prev, [check.id]: data }));
      } catch {
        setResults(prev => ({ ...prev, [check.id]: { status: "fail", message: "Error de red", details: [] } }));
      }
      await new Promise(r => setTimeout(r, 200));
    }
    setRunning(null);
    setLoading(false);

    try {
      const h = JSON.parse(localStorage.getItem("qa_history") || "[]");
      h.unshift({ type: "connectivity", status: "done", message: `Connectivity: ${host}`, timestamp: Date.now() });
      localStorage.setItem("qa_history", JSON.stringify(h.slice(0, 100)));
    } catch {}
  };

  // Run a net tool
  const runNetTool = async (toolId) => {
    setNtTool(toolId);
    setNtLoading(true);
    setNtResult(null);
    try {
      const params = new URLSearchParams({
        tool:  toolId,
        host:  ntHost,
        port:  ntPort,
        extra: ntExtra,
      });
      const res  = await fetch(`/api/nettools?${params}`);
      const data = await res.json();
      setNtResult(data);
    } catch (err) {
      setNtResult({ status: "fail", message: `Error: ${err.message}`, output: "" });
    }
    setNtLoading(false);
  };

  const currentTool = NET_TOOLS.find(t => t.id === ntTool);

  return (
    <div>
      <SectionHeader
        title="Connectivity Tester"
        desc="Verifica ping, DNS, SSL/TLS y status HTTP — más herramientas de red avanzadas"
        icon={Wifi}
        color="#f59e0b"
      />

      {/* ── Sección 1: HTTP Checks ── */}
      <div className="qa-card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          HTTP Checks
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
          <input
            className="qa-input"
            placeholder="hostname o IP"
            value={host}
            onChange={e => setHost(e.target.value)}
            style={{ flex: 1, fontFamily: "var(--font-geist-mono)", fontSize: 13 }}
          />
          <input
            className="qa-input"
            placeholder="Puerto"
            value={port}
            onChange={e => setPort(e.target.value)}
            style={{ width: 80, fontFamily: "var(--font-geist-mono)" }}
          />
          <button
            className="btn-primary"
            onClick={runAll}
            disabled={loading || !host}
            style={{ minWidth: 130, justifyContent: "center", background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
          >
            {loading ? "⟳ Probando..." : <><Play size={14} /> Probar</>}
          </button>
        </div>

        {/* Presets */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", alignSelf: "center" }}>Presets:</span>
          {PRESETS.map(p => (
            <button key={p.label}
              onClick={() => { setHost(p.host); setPort(p.port); }}
              style={{
                padding: "4px 10px", fontSize: 11, borderRadius: 6,
                border: `1px solid ${host === p.host ? "rgba(245,158,11,0.4)" : "var(--border)"}`,
                background: host === p.host ? "rgba(245,158,11,0.1)" : "transparent",
                color: host === p.host ? "#f59e0b" : "var(--text-muted)", cursor: "pointer", transition: "all 0.15s"
              }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Check toggles */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {CHECKS.map(c => (
            <button key={c.id} onClick={() => toggle(c.id)}
              style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: `1px solid ${selected.has(c.id) ? "rgba(245,158,11,0.4)" : "var(--border)"}`,
                background: selected.has(c.id) ? "rgba(245,158,11,0.1)" : "transparent",
                color: selected.has(c.id) ? "#f59e0b" : "var(--text-muted)", cursor: "pointer",
                transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6
              }}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* HTTP check results */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {CHECKS.filter(c => selected.has(c.id)).map(check => {
          const res = results[check.id];
          const isRunning = running === check.id;
          const status = isRunning ? "running" : res ? res.status : "idle";

          return (
            <motion.div key={check.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="qa-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 22 }}>{check.icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{check.label}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{check.desc}</div>
                  </div>
                </div>
                <StatusBadge status={status} />
              </div>
              {res?.details?.length > 0 && (
                <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ listStyle: "none", padding: 0, margin: "12px 0 0", display: "flex", flexDirection: "column", gap: 5 }}>
                  {res.details.map((d, i) => (
                    <li key={i} style={{
                      fontSize: 12, padding: "5px 10px",
                      background: "var(--bg-surface)", borderRadius: 6,
                      fontFamily: "var(--font-geist-mono)", color: "var(--text-secondary)",
                      display: "flex", gap: 8
                    }}>
                      <span style={{ color: res.status === "pass" ? "#10b981" : "#ef4444" }}>›</span>
                      {d}
                    </li>
                  ))}
                </motion.ul>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* ── Sección 2: Network Tools ── */}
      <div style={{
        borderTop: "1px solid var(--border)", paddingTop: 20, marginTop: 4
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Network size={16} color="#06b6d4" />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Network Tools</span>
          <span style={{
            fontSize: 10, padding: "2px 8px", borderRadius: 10,
            background: "rgba(6,182,212,0.1)", color: "#06b6d4",
            border: "1px solid rgba(6,182,212,0.25)", fontWeight: 600
          }}>traceroute · nslookup · dig · nc · ping</span>
        </div>

        {/* Host input for net tools */}
        <div className="qa-card" style={{ marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Host / IP destino
              </label>
              <input
                className="qa-input"
                placeholder="hostname o IP"
                value={ntHost}
                onChange={e => setNtHost(e.target.value)}
                style={{ fontFamily: "var(--font-geist-mono)", fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Puerto (nc)
              </label>
              <input
                className="qa-input"
                placeholder="443"
                value={ntPort}
                onChange={e => setNtPort(e.target.value)}
                style={{ width: 80, fontFamily: "var(--font-geist-mono)" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Tipo DNS (dig)
              </label>
              <input
                className="qa-input"
                placeholder="A"
                value={ntExtra}
                onChange={e => setNtExtra(e.target.value)}
                style={{ width: 80, fontFamily: "var(--font-geist-mono)", textTransform: "uppercase" }}
              />
            </div>
          </div>

          {/* Preset host shortcuts */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", alignSelf: "center" }}>Presets:</span>
            {PRESETS.map(p => (
              <button key={p.label}
                onClick={() => { setNtHost(p.host); setNtPort(p.port); }}
                style={{
                  padding: "3px 10px", fontSize: 11, borderRadius: 6,
                  border: `1px solid ${ntHost === p.host ? "rgba(6,182,212,0.4)" : "var(--border)"}`,
                  background: ntHost === p.host ? "rgba(6,182,212,0.08)" : "transparent",
                  color: ntHost === p.host ? "#06b6d4" : "var(--text-muted)", cursor: "pointer", transition: "all 0.15s"
                }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tool buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 16 }}>
          {NET_TOOLS.map(tool => {
            const isActive = ntTool === tool.id && ntLoading;
            const isDone   = ntTool === tool.id && !ntLoading && ntResult;
            return (
              <button key={tool.id}
                onClick={() => runNetTool(tool.id)}
                disabled={ntLoading}
                style={{
                  padding: "14px 12px", borderRadius: 10, border: `1px solid ${isDone ? tool.color + "44" : "var(--border)"}`,
                  background: isDone ? `${tool.color}10` : isActive ? `${tool.color}18` : "var(--bg-card)",
                  color: "var(--text-primary)", cursor: ntLoading ? "wait" : "pointer",
                  display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6,
                  transition: "all 0.2s", opacity: ntLoading && !isActive ? 0.6 : 1,
                  textAlign: "left"
                }}
                onMouseEnter={e => { if (!ntLoading) e.currentTarget.style.borderColor = tool.color + "66"; }}
                onMouseLeave={e => { if (!isDone) e.currentTarget.style.borderColor = "var(--border)"; }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                  <span style={{ fontSize: 18 }}>{tool.icon}</span>
                  {isActive && (
                    <div style={{ width: 12, height: 12, border: `2px solid ${tool.color}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", marginLeft: "auto" }} />
                  )}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: isDone ? tool.color : "var(--text-primary)" }}>
                  {tool.label}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{tool.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Net tool result */}
        <AnimatePresence mode="wait">
          {(ntLoading || ntResult) && (
            <motion.div key={ntTool} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="qa-card" style={{ borderColor: currentTool ? `${currentTool.color}33` : "var(--border)" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{currentTool?.icon}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: currentTool?.color }}>
                        {currentTool?.label} — {ntHost}
                      </div>
                      {ntResult && (
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          {ntResult.message}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {ntResult && <StatusBadge status={ntResult.status} />}
                    {ntLoading && (
                      <div style={{ width: 18, height: 18, border: `2px solid ${currentTool?.color}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                    )}
                  </div>
                </div>

                {/* Traceroute — hop-by-hop visualization */}
                {ntResult?.hops?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                      Ruta — {ntResult.hops.length} saltos
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {ntResult.hops.map((hop, i) => (
                        <div key={i} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "6px 10px", borderRadius: 8,
                          background: "var(--bg-surface)", fontSize: 12,
                          fontFamily: "var(--font-geist-mono)"
                        }}>
                          <span style={{
                            width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                            background: `rgba(245,158,11,${0.1 + i * 0.03})`,
                            border: "1px solid rgba(245,158,11,0.3)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 10, color: "#f59e0b", fontWeight: 700
                          }}>
                            {hop.hop}
                          </span>
                          <span style={{ color: "var(--text-secondary)", flex: 1 }}>{hop.info}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ping stats */}
                {ntResult?.pingStats && (
                  <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
                    {[
                      { label: "Enviados", val: ntResult.pingStats.sent },
                      { label: "Recibidos", val: ntResult.pingStats.received },
                      { label: "Pérdida", val: ntResult.pingStats.loss },
                      { label: "Min", val: ntResult.pingStats.min },
                      { label: "Avg", val: ntResult.pingStats.avg },
                      { label: "Max", val: ntResult.pingStats.max },
                    ].map(s => (
                      <div key={s.label} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#10b981", fontFamily: "var(--font-geist-mono)" }}>{s.val}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Raw output */}
                {ntResult?.output && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Output
                      </span>
                      <CopyButton text={ntResult.output} />
                    </div>
                    <pre style={{
                      margin: 0, padding: "10px 14px", borderRadius: 8,
                      background: "var(--bg-surface)", fontSize: 11,
                      fontFamily: "var(--font-geist-mono)", color: "var(--text-secondary)",
                      whiteSpace: "pre-wrap", wordBreak: "break-word",
                      maxHeight: 320, overflowY: "auto", lineHeight: 1.7,
                      borderLeft: `3px solid ${currentTool?.color || "var(--border)"}`
                    }}>
                      {ntResult.output}
                    </pre>
                  </div>
                )}

                {ntLoading && !ntResult && (
                  <div style={{ textAlign: "center", padding: 20, color: "var(--text-muted)", fontSize: 13 }}>
                    Ejecutando {currentTool?.label}...
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ══ Sección 3: Diagnóstico General de Host ══ */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20, marginTop: 8 }}>
        <DiagnosticSection />
      </div>
    </div>
  );
}
