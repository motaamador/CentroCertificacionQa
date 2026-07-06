// src/components/pdf/ReportDocument.js
// Plantilla del PDF usando @react-pdf/renderer

import {
  Document, Page, Text, View, Image, StyleSheet, Font
} from "@react-pdf/renderer";

// ── Helpers ───────────────────────────────────────────────────────────────
const STATUS_COLOR = {
  pass:    "#16a34a",
  warn:    "#d97706",
  fail:    "#dc2626",
  success: "#16a34a",
  error:   "#dc2626",
  idle:    "#6b7280",
};

const STATUS_LABEL = {
  pass: "PASS", warn: "WARN", fail: "FAIL",
  success: "OK", error: "ERROR", idle: "N/A",
};

const MODULE_LABEL = {
  api:          "API Tester",
  security:     "Security Scanner",
  db:           "DB Tester",
  connectivity: "Connectivity",
  curl:         "cURL Runner",
  sql:          "SQL Analyzer",
};

// ── Estilos ───────────────────────────────────────────────────────────────
function makeStyles(branding) {
  return StyleSheet.create({
    page: {
      fontFamily: "Helvetica",
      backgroundColor: "#ffffff",
      paddingTop: 0,
      paddingBottom: 40,
      paddingHorizontal: 0,
      fontSize: 10,
      color: "#1e293b",
    },
    // Header
    header: {
      backgroundColor: "#ffffff",
      paddingVertical: 20,
      paddingHorizontal: 32,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    logo: { width: 160, height: 56, objectFit: "contain" },
    headerRight: { alignItems: "flex-end" },
    headerTitle: { fontSize: 16, fontFamily: "Helvetica-Bold", color: branding.color_primary, marginBottom: 3 },
    headerSub:   { fontSize: 8,  color: "#64748b" },

    // Accent bar
    accentBar: { height: 4, backgroundColor: branding.color_accent },

    // Body
    body: { paddingHorizontal: 32, paddingTop: 20 },

    // Summary box
    summaryBox: {
      backgroundColor: "#f8fafc",
      border: "1 solid #e2e8f0",
      borderRadius: 6,
      padding: 16,
      marginBottom: 20,
      flexDirection: "row",
      gap: 20,
    },
    summaryItem: { alignItems: "center", flex: 1 },
    summaryNum:  { fontSize: 26, fontFamily: "Helvetica-Bold", marginBottom: 2 },
    summaryLbl:  { fontSize: 8,  color: "#64748b", textTransform: "uppercase" },

    // Meta info
    metaRow: { flexDirection: "row", gap: 6, marginBottom: 4 },
    metaLabel: { fontSize: 8, color: "#64748b", fontFamily: "Helvetica-Bold", width: 70 },
    metaValue: { fontSize: 8, color: "#334155" },

    // Section header
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "#f1f5f9",
      borderLeft: `4 solid ${branding.color_primary}`,
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginBottom: 8,
      marginTop: 14,
    },
    sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#0f172a", flex: 1 },
    badge: {
      fontSize: 8, fontFamily: "Helvetica-Bold",
      paddingVertical: 2, paddingHorizontal: 6,
      borderRadius: 3,
    },

    // Detail item
    detailItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 6,
      paddingVertical: 3,
      paddingHorizontal: 12,
    },
    bullet:     { fontSize: 9, color: "#94a3b8", marginTop: 1 },
    detailText: { fontSize: 9, color: "#475569", flex: 1 },

    // Output block (curl/db)
    outputBlock: {
      backgroundColor: "#0f172a",
      borderRadius: 4,
      padding: 10,
      marginHorizontal: 12,
      marginBottom: 8,
    },
    outputText: { fontSize: 7.5, color: "#94a3b8", fontFamily: "Courier", lineHeight: 1.5 },

    // Divider
    divider: { height: 1, backgroundColor: "#e2e8f0", marginVertical: 4 },

    // Footer
    footer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 40,
      backgroundColor: "#ffffff",
      borderTop: "1 solid #e2e8f0",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 32,
    },
    footerText:  { fontSize: 7.5, color: "#64748b" },
    footerPage:  { fontSize: 7.5, color: branding.color_primary, fontFamily: "Helvetica-Bold" },
  });
}

// ── Componente principal del PDF ──────────────────────────────────────────
export function QAReportDocument({ items, meta, branding, logoBase64 }) {
  const S = makeStyles(branding);

  const passed  = items.filter(i => ["pass", "success"].includes(i.status)).length;
  const failed  = items.filter(i => ["fail", "error"].includes(i.status)).length;
  const warned  = items.filter(i => i.status === "warn").length;
  const total   = items.length;

  return (
    <Document title={meta.titulo} author={meta.operador} creator={branding.sistema || "QA Cert Center"}>
      <Page size="A4" style={S.page}>

        {/* ── Header institucional ── */}
        <View style={S.header}>
          {logoBase64 ? (
            <Image src={logoBase64} style={S.logo} />
          ) : (
            <Text style={{ fontSize: 20, fontFamily: "Helvetica-Bold", color: branding.color_primary }}>
              {branding.nombre}
            </Text>
          )}
          <View style={S.headerRight}>
            <Text style={S.headerTitle}>{meta.titulo}</Text>
            <Text style={S.headerSub}>Fecha: {meta.fecha}  ·  Hora: {meta.hora}</Text>
            <Text style={S.headerSub}>Operador: {meta.operador}</Text>
          </View>
        </View>

        <View style={S.accentBar} />

        <View style={S.body}>

          {/* ── Info del documento ── */}
          <View style={{ marginBottom: 16 }}>
            <View style={S.metaRow}>
              <Text style={S.metaLabel}>Institución:</Text>
              <Text style={S.metaValue}>{branding.nombre_full}</Text>
            </View>
            {branding.ministerio ? (
              <View style={S.metaRow}>
                <Text style={S.metaLabel}>Ministerio:</Text>
                <Text style={S.metaValue}>{branding.ministerio}</Text>
              </View>
            ) : null}
            <View style={S.metaRow}>
              <Text style={S.metaLabel}>Sistema:</Text>
              <Text style={S.metaValue}>{branding.sistema || "QA Cert Center"}</Text>
            </View>
          </View>

          {/* ── Resumen ejecutivo ── */}
          <View style={S.summaryBox}>
            <View style={S.summaryItem}>
              <Text style={[S.summaryNum, { color: "#334155" }]}>{total}</Text>
              <Text style={S.summaryLbl}>Total pruebas</Text>
            </View>
            <View style={S.summaryItem}>
              <Text style={[S.summaryNum, { color: STATUS_COLOR.pass }]}>{passed}</Text>
              <Text style={S.summaryLbl}>Pasaron</Text>
            </View>
            <View style={S.summaryItem}>
              <Text style={[S.summaryNum, { color: STATUS_COLOR.warn }]}>{warned}</Text>
              <Text style={S.summaryLbl}>Advertencias</Text>
            </View>
            <View style={S.summaryItem}>
              <Text style={[S.summaryNum, { color: STATUS_COLOR.fail }]}>{failed}</Text>
              <Text style={S.summaryLbl}>Fallaron</Text>
            </View>
            <View style={S.summaryItem}>
              <Text style={[S.summaryNum, { color: branding.color_primary }]}>
                {total > 0 ? Math.round((passed / total) * 100) : 0}%
              </Text>
              <Text style={S.summaryLbl}>Tasa de éxito</Text>
            </View>
          </View>

          {/* ── Resultados detallados ── */}
          {items.map((item, idx) => {
            const statusColor = STATUS_COLOR[item.status] || "#6b7280";
            const statusLabel = STATUS_LABEL[item.status] || item.status?.toUpperCase() || "?";
            const moduleLabel = MODULE_LABEL[item.type] || item.type || "Test";
            const ts = item.timestamp
              ? new Date(item.timestamp).toLocaleString("es-VE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
              : "";

            return (
              <View key={idx} wrap={false}>
                {/* Section header */}
                <View style={S.sectionHeader}>
                  <Text style={S.sectionTitle}>
                    #{idx + 1}  {moduleLabel}
                    {item.url ? `  ·  ${item.url}` : ""}
                    {item.host ? `  ·  ${item.host}` : ""}
                  </Text>
                  <View style={[S.badge, { backgroundColor: statusColor + "22", border: `1 solid ${statusColor}` }]}>
                    <Text style={{ color: statusColor }}>{statusLabel}</Text>
                  </View>
                  {ts ? <Text style={{ fontSize: 7.5, color: "#94a3b8" }}>{ts}</Text> : null}
                </View>

                {/* Message */}
                {item.message ? (
                  <View style={[S.detailItem, { marginBottom: 4 }]}>
                    <Text style={[S.detailText, { fontFamily: "Helvetica-Bold", color: "#334155" }]}>
                      {item.message}
                    </Text>
                  </View>
                ) : null}

                {/* Details list */}
                {item.details?.length > 0 ? item.details.map((d, i) => (
                  <View key={i} style={S.detailItem}>
                    <Text style={S.bullet}>›</Text>
                    <Text style={S.detailText}>{d}</Text>
                  </View>
                )) : null}

                {/* DB rows preview */}
                {item.rows?.length > 0 ? (
                  <View style={S.outputBlock}>
                    <Text style={S.outputText}>
                      {item.rows.slice(0, 5).map(r => JSON.stringify(r)).join("\n")}
                      {item.rows.length > 5 ? `\n... y ${item.rows.length - 5} filas más` : ""}
                    </Text>
                  </View>
                ) : null}

                {/* cURL stdout preview */}
                {item.stdout ? (
                  <View style={S.outputBlock}>
                    <Text style={S.outputText}>
                      {item.stdout.slice(0, 400)}{item.stdout.length > 400 ? "\n..." : ""}
                    </Text>
                  </View>
                ) : null}

                {/* SQL Query Preview */}
                {item.sqlQuery ? (
                  <View style={S.outputBlock}>
                    <Text style={S.outputText}>
                      {item.sqlQuery.slice(0, 400)}{item.sqlQuery.length > 400 ? "\n..." : ""}
                    </Text>
                  </View>
                ) : null}

                {/* SQL Warnings */}
                {item.sqlWarnings?.length > 0 ? (
                  <View style={{ marginBottom: 8, paddingHorizontal: 12 }}>
                    <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: "#d97706", marginBottom: 4 }}>Advertencias y Antipatrones:</Text>
                    {item.sqlWarnings.map((w, i) => (
                      <View key={i} style={{ marginBottom: 4, paddingLeft: 6, borderLeft: "2 solid #d97706" }}>
                        <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#334155" }}>{w.title}</Text>
                        <Text style={{ fontSize: 8, color: "#64748b" }}>{w.msg}</Text>
                        {w.fix ? <Text style={{ fontSize: 8, color: "#16a34a", marginTop: 1 }}>Sugerencia: {w.fix}</Text> : null}
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* SQL Locks */}
                {item.sqlLocks?.length > 0 ? (
                  <View style={{ marginBottom: 8, paddingHorizontal: 12 }}>
                    <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: "#dc2626", marginBottom: 4 }}>Riesgos de Bloqueo:</Text>
                    {item.sqlLocks.map((l, i) => (
                      <View key={i} style={{ marginBottom: 4, paddingLeft: 6, borderLeft: "2 solid #dc2626" }}>
                        <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#334155" }}>{l.type}</Text>
                        <Text style={{ fontSize: 8, color: "#64748b" }}>{l.msg}</Text>
                        {l.advice ? <Text style={{ fontSize: 8, color: "#16a34a", marginTop: 1 }}>Sugerencia: {l.advice}</Text> : null}
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* SQL Explain Plan Preview */}
                {item.explainPlan ? (
                  <View style={S.outputBlock}>
                    <Text style={S.outputText}>
                      {JSON.stringify(item.explainPlan, null, 2).slice(0, 600)}
                      {JSON.stringify(item.explainPlan).length > 600 ? "\n..." : ""}
                    </Text>
                  </View>
                ) : null}

                {/* API Response Body preview */}
                {item.responseBody ? (
                  <View style={S.outputBlock}>
                    <Text style={S.outputText}>
                      {(typeof item.responseBody === "string" ? item.responseBody : JSON.stringify(item.responseBody, null, 2)).slice(0, 400)}
                      {(typeof item.responseBody === "string" ? item.responseBody.length : JSON.stringify(item.responseBody).length) > 400 ? "\n..." : ""}
                    </Text>
                  </View>
                ) : null}

                {/* Collection step results */}
                {item.type === "collection" && item.stepResults?.length > 0 ? (
                  <View style={{ marginTop: 6, paddingHorizontal: 12 }}>
                    <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: "#334155", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Detalle de Pasos ({item.stepResults.length}):
                    </Text>
                    {item.stepResults.map((step, si) => {
                      const stepColor = step.ok ? "#16a34a" : "#dc2626";
                      return (
                        <View key={si} style={{ marginBottom: 10, borderLeft: `3 solid ${stepColor}`, paddingLeft: 8 }}>
                          {/* Step header */}
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 }}>
                            <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: stepColor }}>
                              {step.ok ? "✓" : "✗"}
                            </Text>
                            <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: "#1e293b", flex: 1 }}>
                              #{si + 1} {step.stepName}
                            </Text>
                            <Text style={{ fontSize: 8, color: "#64748b" }}>
                              {step.type === "db" ? "DB" : "HTTP"}
                              {step.status > 0 ? `  ·  ${step.status}` : ""}
                              {step.latency > 0 ? `  ·  ${step.latency}ms` : ""}
                            </Text>
                          </View>

                          {/* URL or Query */}
                          {step.url ? (
                            <Text style={{ fontSize: 7.5, color: "#64748b", fontFamily: "Courier", marginBottom: 3 }}>
                              {step.url.slice(0, 80)}{step.url.length > 80 ? "..." : ""}
                            </Text>
                          ) : null}
                          {step.query ? (
                            <Text style={{ fontSize: 7.5, color: "#64748b", fontFamily: "Courier", marginBottom: 3 }}>
                              {step.query.slice(0, 80)}{step.query.length > 80 ? "..." : ""}
                            </Text>
                          ) : null}

                          {/* Error */}
                          {step.error ? (
                            <Text style={{ fontSize: 8, color: "#dc2626", marginBottom: 3 }}>Error: {step.error}</Text>
                          ) : null}

                          {/* Assertions */}
                          {step.assertionResults?.length > 0 ? (
                            <View style={{ marginBottom: 3 }}>
                              <Text style={{ fontSize: 8, color: "#64748b", fontFamily: "Helvetica-Bold", marginBottom: 2 }}>Aserciones:</Text>
                              {step.assertionResults.map((a, ai) => (
                                <View key={ai} style={{ flexDirection: "row", gap: 4, marginBottom: 1 }}>
                                  <Text style={{ fontSize: 7.5, color: a.ok ? "#16a34a" : "#dc2626", fontFamily: "Helvetica-Bold" }}>
                                    {a.ok ? "✓" : "✗"}
                                  </Text>
                                  <Text style={{ fontSize: 7.5, color: "#475569", flex: 1 }}>
                                    [{a.target}] {a.operator}{a.path ? ` (${a.path})` : ""} → {a.message}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          ) : null}

                          {/* Response preview */}
                          {step.response ? (
                            <View style={{ backgroundColor: "#f8fafc", borderRadius: 3, padding: 5 }}>
                              <Text style={{ fontSize: 7, color: "#64748b", fontFamily: "Courier", lineHeight: 1.4 }}>
                                {step.response.slice(0, 300)}{step.response.length > 300 ? "\n..." : ""}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                ) : null}

                {/* Latency */}
                {item.latency != null ? (
                  <View style={[S.detailItem, { marginBottom: 6 }]}>
                    <Text style={S.bullet}>⏱</Text>
                    <Text style={[S.detailText, { color: "#64748b" }]}>Latencia: {item.latency}ms</Text>
                  </View>
                ) : null}

                <View style={S.divider} />
              </View>
            );
          })}
        </View>

        {/* ── Footer ── */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>{branding.pie_pagina}</Text>
          <Text style={S.footerPage} render={({ pageNumber, totalPages }) =>
            `Página ${pageNumber} de ${totalPages}`
          } />
        </View>

      </Page>
    </Document>
  );
}
