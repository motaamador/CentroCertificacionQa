"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Activity, ShieldAlert, Database,
  Wifi, History, ChevronLeft, ChevronRight,
  Shield, Zap, Terminal, FileText
} from "lucide-react";

const NAV = [
  { id: "dashboard",    label: "Dashboard",      icon: LayoutDashboard, color: "#6366f1" },
  { id: "api",          label: "API Tester",      icon: Activity,        color: "#3b82f6" },
  { id: "security",     label: "Security Scan",   icon: ShieldAlert,     color: "#10b981" },
  { id: "database",     label: "DB Tester",       icon: Database,        color: "#8b5cf6" },
  { id: "connectivity", label: "Connectivity",    icon: Wifi,            color: "#f59e0b" },
  { id: "curl",         label: "cURL Runner",     icon: Terminal,        color: "#06b6d4" },
  { id: "report",       label: "Reporte PDF",     icon: FileText,        color: "#6366f1" },
  { id: "history",      label: "History",         icon: History,         color: "#64748b" },
];

export default function Shell({ activeTab, onTabChange, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const current = NAV.find(n => n.id === activeTab) || NAV[0];

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg-primary)" }}>
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
              zIndex: 40, display: "none"
            }}
            className="md-overlay"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 220 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        style={{
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border)",
          display: "flex", flexDirection: "column",
          overflow: "hidden", flexShrink: 0, position: "relative", zIndex: 10
        }}
      >
        {/* Logo */}
        <div style={{
          padding: collapsed ? "20px 14px" : "20px",
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: 10,
          overflow: "hidden"
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: "linear-gradient(135deg, #3b82f6, #6366f1)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <Shield size={16} color="white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                  QA Cert Center
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  v2.0 — MVP
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 4, overflowY: "auto" }}>
          {NAV.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                title={collapsed ? item.label : undefined}
                style={{
                  display: "flex", alignItems: "center",
                  gap: 10, padding: collapsed ? "10px 0" : "10px 12px",
                  justifyContent: collapsed ? "center" : "flex-start",
                  borderRadius: 10, border: "1px solid transparent",
                  background: isActive ? `${item.color}18` : "transparent",
                  color: isActive ? item.color : "var(--text-secondary)",
                  borderColor: isActive ? `${item.color}44` : "transparent",
                  cursor: "pointer", fontSize: 13, fontWeight: 500,
                  transition: "all 0.2s", width: "100%"
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "var(--bg-card-hover)"; e.currentTarget.style.color = "var(--text-primary)"; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; } }}
              >
                <Icon size={17} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ whiteSpace: "nowrap" }}>
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div style={{ padding: "12px 8px", borderTop: "1px solid var(--border)" }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "100%", padding: "8px", borderRadius: 8, border: "1px solid var(--border)",
              background: "transparent", color: "var(--text-muted)", cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-card)"; e.currentTarget.style.color = "var(--text-primary)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </motion.aside>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <header style={{
          background: "var(--bg-surface)", borderBottom: "1px solid var(--border)",
          padding: "0 24px", height: 56, display: "flex", alignItems: "center",
          justifyContent: "space-between", flexShrink: 0
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "var(--accent-green)", boxShadow: "0 0 8px var(--accent-green)"
            }} className="animate-pulse-glow" />
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
              {current.label}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "4px 10px", borderRadius: 20, border: "1px solid var(--border)",
              background: "var(--bg-card)"
            }}>
              <Zap size={11} color="var(--accent-yellow)" />
              <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 500 }}>Sistema Activo</span>
            </div>
            <div style={{
              fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-geist-mono)"
            }}>
              {new Date().toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflowY: "auto", padding: "24px" }} className="bg-grid">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
