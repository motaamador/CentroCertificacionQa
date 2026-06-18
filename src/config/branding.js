// src/config/branding.js
// ── Configuración de marca institucional ──────────────────────────────────
// Para cambiar de empresa: edita SOLO este archivo y reemplaza el logo en
// public/logos/<nombre>.png
//
// Campos:
//   nombre        → Siglas / nombre corto (aparece en encabezados)
//   nombre_full   → Nombre legal completo
//   ministerio    → Línea institucional debajo del nombre
//   logo          → Ruta relativa desde /public  (siempre PNG)
//   color_primary → Color principal de la institución (hex)
//   color_accent  → Color secundario / acento
//   pie_pagina    → Texto del footer del PDF

export const BRANDING = {
  nombre: "SAIME",
  nombre_full: "Servicio Administrativo de Identificación, Migración y Extranjería",
  ministerio: "Ministerio del Poder Popular para Relaciones Interiores, Justicia y Paz",
  logo: "/logos/saime.png",
  color_primary: "#003087",   // Azul SAIME
  color_accent: "#C8102E",   // Rojo bandera venezolana
  sistema: "QA 1.0",
  pie_pagina: "República Bolivariana de Venezuela — Documento generado por Prueba y Certificación de Sistemas",
};

// ── Ejemplos para otras instituciones (descomenta el que necesites) ────────

// CANTV
// export const BRANDING = {
//   nombre:        "CANTV",
//   nombre_full:   "Compañía Anónima Nacional Teléfonos de Venezuela",
//   ministerio:    "Ministerio del Poder Popular para Ciencia y Tecnología",
//   logo:          "/logos/cantv.png",
//   color_primary: "#E31837",
//   color_accent:  "#003087",
//   pie_pagina:    "CANTV — Documento generado por Prueba y Certificación de Sistemas",
// };

// Empresa genérica
// export const BRANDING = {
//   nombre:        "MI EMPRESA",
//   nombre_full:   "Mi Empresa C.A.",
//   ministerio:    "",
//   logo:          "/logos/empresa.png",
//   color_primary: "#1a1a2e",
//   color_accent:  "#16213e",
//   pie_pagina:    "Mi Empresa — Documento generado por QA Cert Center",
// };
