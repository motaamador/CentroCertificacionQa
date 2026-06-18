// src/app/api/report/route.js
// Genera el PDF de certificación QA usando @react-pdf/renderer (server-side)

import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { QAReportDocument } from "@/components/pdf/ReportDocument";
import { BRANDING } from "@/config/branding";
import path from "path";
import fs from "fs";

export async function POST(request) {
  try {
    const { items, operador, titulo } = await request.json();

    if (!items?.length) {
      return Response.json({ error: "No hay items para el reporte" }, { status: 400 });
    }

    // Leer el logo como base64 para embeber en el PDF
    let logoBase64 = null;
    try {
      const logoPath = path.join(process.cwd(), "public", BRANDING.logo);
      const logoBuffer = fs.readFileSync(logoPath);
      // The file has a .png extension but is actually a JPEG image
      logoBase64 = `data:image/jpeg;base64,${logoBuffer.toString("base64")}`;
    } catch {
      // Logo no encontrado — el PDF se genera sin él
    }

    const meta = {
      titulo:    titulo || "Informe de Certificación QA",
      operador:  operador || "Sistema",
      fecha:     new Date().toLocaleDateString("es-VE", { day: "2-digit", month: "long", year: "numeric" }),
      hora:      new Date().toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" }),
      generado:  new Date().toISOString(),
    };

    // Generar PDF
    const element = createElement(QAReportDocument, { items, meta, branding: BRANDING, logoBase64 });
    const buffer  = await renderToBuffer(element);

    const filename = `QA_Reporte_${new Date().toISOString().slice(0, 10)}.pdf`;

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length":      buffer.length.toString(),
      },
    });
  } catch (err) {
    console.error("[/api/report]", err);
    return Response.json({ error: `Error generando PDF: ${err.message}` }, { status: 500 });
  }
}
