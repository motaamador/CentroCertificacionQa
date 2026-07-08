"use client";

import { useState, useEffect, Suspense } from "react";
import { Shield, Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const expired = params.get("expired") === "1";
  const from = params.get("from") || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(expired ? "Tu sesión expiró. Inicia sesión nuevamente." : "");
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    const tick = () => setTimeStr(new Date().toLocaleString("es-VE", {
      weekday: "short", day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit",
    }));
    tick();
    const t = setInterval(tick, 60000);
    return () => clearInterval(t);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al iniciar sesión");
        return;
      }

      router.push(from);
      router.refresh();
    } catch {
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)",
      position: "relative", overflow: "hidden", fontFamily: "var(--font-geist-sans, system-ui, sans-serif)",
    }}>
      {/* Fondo animado */}
      <div style={{
        position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none",
      }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            width: `${200 + i * 80}px`, height: `${200 + i * 80}px`,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${["#3b82f620","#6366f118","#8b5cf615","#06b6d412","#10b98110"][i]} 0%, transparent 70%)`,
            top: `${[10, 60, 30, 70, 20][i]}%`, left: `${[10, 70, 50, 20, 80][i]}%`,
            transform: "translate(-50%,-50%)",
            animation: `float-${i} ${6 + i * 2}s ease-in-out infinite alternate`,
          }} />
        ))}
      </div>

      {/* Grid de puntos */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle, rgba(99,102,241,0.08) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }} />

      {/* Card */}
      <div style={{
        position: "relative", width: "100%", maxWidth: 420,
        margin: "0 16px", zIndex: 10,
      }}>
        {/* Logo header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 64, height: 64, borderRadius: 18,
            background: "linear-gradient(135deg, #3b82f6, #6366f1)",
            boxShadow: "0 0 40px rgba(99,102,241,0.4)",
            marginBottom: 16,
          }}>
            <Shield size={30} color="white" />
          </div>
          <h1 style={{
            fontSize: 24, fontWeight: 800, color: "#f8fafc",
            margin: "0 0 6px", letterSpacing: "-0.5px",
          }}>
            QA Cert Center
          </h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
            Plataforma de Certificación de Calidad
          </p>
          {timeStr && (
            <p style={{ fontSize: 11, color: "#475569", margin: "8px 0 0", fontFamily: "monospace" }}>
              {timeStr}
            </p>
          )}
        </div>

        {/* Card principal */}
        <div style={{
          background: "rgba(15,23,42,0.8)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: 20,
          padding: "36px 32px",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset",
        }}>
          <h2 style={{
            fontSize: 18, fontWeight: 700, color: "#e2e8f0",
            margin: "0 0 6px",
          }}>
            Iniciar Sesión
          </h2>
          <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 28px" }}>
            Ingresa tus credenciales para continuar
          </p>

          {/* Alerta de sesión expirada o error */}
          {error && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              background: expired && !error.includes("incorrecto")
                ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
              border: `1px solid ${expired && !error.includes("incorrecto") ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)"}`,
              borderRadius: 10, padding: "12px 14px", marginBottom: 20,
            }}>
              <AlertCircle size={16} color={expired && !error.includes("incorrecto") ? "#f59e0b" : "#ef4444"} />
              <span style={{ fontSize: 13, color: "#e2e8f0" }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Username */}
            <div>
              <label style={{
                display: "block", fontSize: 12, fontWeight: 600,
                color: "#94a3b8", marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase",
              }}>
                Usuario
              </label>
              <input
                id="qa-username"
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(""); }}
                placeholder="Ingresa tu usuario"
                autoComplete="username"
                autoFocus
                disabled={loading}
                style={{
                  width: "100%", padding: "12px 14px",
                  background: "rgba(30,41,59,0.8)", border: "1px solid rgba(71,85,105,0.5)",
                  borderRadius: 10, color: "#f1f5f9", fontSize: 14, outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={e => {
                  e.target.style.borderColor = "#6366f1";
                  e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.15)";
                }}
                onBlur={e => {
                  e.target.style.borderColor = "rgba(71,85,105,0.5)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{
                display: "block", fontSize: 12, fontWeight: 600,
                color: "#94a3b8", marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase",
              }}>
                Contraseña
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="qa-password"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                  style={{
                    width: "100%", padding: "12px 44px 12px 14px",
                    background: "rgba(30,41,59,0.8)", border: "1px solid rgba(71,85,105,0.5)",
                    borderRadius: 10, color: "#f1f5f9", fontSize: 14, outline: "none",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                    boxSizing: "border-box",
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = "#6366f1";
                    e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.15)";
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = "rgba(71,85,105,0.5)";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  tabIndex={-1}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "#64748b", padding: 4, display: "flex",
                  }}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Botón */}
            <button
              id="qa-login-btn"
              type="submit"
              disabled={loading || !username.trim() || !password}
              style={{
                padding: "13px",
                background: loading || !username.trim() || !password
                  ? "rgba(99,102,241,0.4)"
                  : "linear-gradient(135deg, #4f46e5, #6366f1)",
                border: "none", borderRadius: 10, color: "white",
                fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 0.2s",
                boxShadow: loading ? "none" : "0 4px 20px rgba(99,102,241,0.4)",
                marginTop: 4,
              }}
            >
              {loading ? (
                <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Verificando...</>
              ) : (
                "Iniciar Sesión"
              )}
            </button>
          </form>

          {/* Footer */}
          <div style={{
            marginTop: 28, paddingTop: 20,
            borderTop: "1px solid rgba(71,85,105,0.3)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <CheckCircle size={13} color="#10b981" />
            <span style={{ fontSize: 11, color: "#475569" }}>
              Sesión cifrada con JWT · 8 horas de duración
            </span>
          </div>
        </div>

        {/* Version tag */}
        <p style={{
          textAlign: "center", fontSize: 11, color: "#334155",
          marginTop: 20,
        }}>
          QA Cert Center v2.0 · Acceso restringido
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#0f0f1a", color: "#f8fafc", fontFamily: "sans-serif"
      }}>
        Cargando formulario de acceso...
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

