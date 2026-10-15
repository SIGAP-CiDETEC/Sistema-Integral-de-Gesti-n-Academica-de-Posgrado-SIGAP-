/**
 * Reportes en CSV (se abren directo en Excel). Formato: UTF-8 con BOM (para que Excel respete acentos y ñ),
 * separado por comas, todas las celdas entre comillas y fin de línea CRLF.
 * Con backend, los mismos reportes pueden generarse en el servidor (GET /reportes/...?.csv).
 */
export type CeldaCsv = string | number | null | undefined;

const celda = (v: CeldaCsv) => {
  if (v === null || v === undefined) return '""';
  // Evita que Excel interprete como fórmula un texto que empieza con =, +, - o @ (inyección CSV)
  const t = typeof v === "number" ? String(v) : /^[=+\-@]/.test(v) ? `'${v}` : v;
  return `"${t.replace(/"/g, '""')}"`;
};

export const crearCsv = (encabezados: string[], filas: CeldaCsv[][]) =>
  "﻿" + [encabezados, ...filas].map((f) => f.map(celda).join(",")).join("\r\n") + "\r\n";

/** Fecha de hoy para el nombre del archivo (AAAA-MM-DD, hora local). */
export const fechaArchivo = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Genera y descarga el CSV en el navegador. */
export function descargarCsv(nombreArchivo: string, encabezados: string[], filas: CeldaCsv[][]) {
  const url = URL.createObjectURL(new Blob([crearCsv(encabezados, filas)], { type: "text/csv;charset=utf-8" }));
  const el = document.createElement("a");
  el.href = url;
  el.download = nombreArchivo;
  el.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
