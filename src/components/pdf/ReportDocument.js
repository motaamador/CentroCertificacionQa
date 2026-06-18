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
      backgroundColor: branding.color_primary,
      paddingVertical: 20,
      paddingHorizontal: 32,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    logo: { width: 160, height: 56, objectFit: "contain" },
    headerRight: { alignItems: "flex-end" },
    headerTitle: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#ffffff", marginBottom: 3 },
    headerSub:   { fontSize: 8,  color: "rgba(255,255,255,0.75)" },

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
      backgroundColor: branding.color_primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 32,
    },
    footerText:  { fontSize: 7.5, color: "rgba(255,255,255,0.7)" },
    footerPage:  { fontSize: 7.5, color: "rgba(255,255,255,0.9)", fontFamily: "Helvetica-Bold" },
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
            <Text style={{ fontSize: 20, fontFamily: "Helvetica-Bold", color: "#ffffff" }}>
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

                {/* API Response Body preview */}
                {item.responseBody ? (
                  <View style={S.outputBlock}>
                    <Text style={S.outputText}>
                      {(typeof item.responseBody === "string" ? item.responseBody : JSON.stringify(item.responseBody, null, 2)).slice(0, 400)}
                      {(typeof item.responseBody === "string" ? item.responseBody.length : JSON.stringify(item.responseBody).length) > 400 ? "\n..." : ""}
                    </Text>
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
