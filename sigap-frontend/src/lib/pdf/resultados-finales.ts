"use client";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { PROGRAMA } from "../config";
import type { ResolucionColegio } from "../posgrado/datos";
import { TEXTO_DICTAMEN_FINAL } from "../reporte-aspirantes";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const azul = rgb(0.56, 0.67, 0.86);
const gris = rgb(0.35, 0.35, 0.35);

/**
 * "Resultados finales del proceso de admisión" (formato de CIDETEC): ID del aspirante y dictamen final,
 * con las notas de contacto para aceptados y condicionados. Devuelve una URL del PDF.
 */
export async function generarResultadosFinales(convocatoria: string, filas: { id: string; resolucion: ResolucionColegio }[], hoy = new Date()) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Resultados finales del proceso de admisión ${convocatoria}`);
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  let logo;
  try {
    logo = await pdf.embedPng(await (await fetch("/img/logo-ipn.png")).arrayBuffer());
  } catch {
    logo = undefined;
  }

  let p: PDFPage;
  let y = 0;
  const derecha = (t: string, yy: number, size: number, f: PDFFont) => p.drawText(t, { x: 560 - f.widthOfTextAtSize(t, size), y: yy, size, font: f });
  const centrado = (t: string, cx: number, yy: number, size: number, f: PDFFont) => p.drawText(t, { x: cx - f.widthOfTextAtSize(t, size) / 2, y: yy, size, font: f });
  const lineas = (t: string, max: number, size: number, f: PDFFont) => {
    const out: string[] = [];
    let l = "";
    for (const w of t.split(" ")) {
      const prueba = l ? `${l} ${w}` : w;
      if (l && f.widthOfTextAtSize(prueba, size) > max) {
        out.push(l);
        l = w;
      } else l = prueba;
    }
    if (l) out.push(l);
    return out;
  };
  const pie = () => {
    const t = "Av. Juan de Dios Bátiz s/n esq. Miguel Othón de Mendizábal, Col. Nueva Industrial Vallejo, Del. Gustavo A. Madero, Ciudad de México, C.P. 07700.";
    centrado(t, 306, 40, 6.5, normal);
    centrado("Tel: (55) 57296000 Ext. 52516, cidetec@ipn.mx", 306, 31, 6.5, normal);
  };
  const encabezadoTabla = () => {
    p.drawRectangle({ x: 70, y: y - 4, width: 472, height: 16, color: azul, borderColor: rgb(0, 0, 0), borderWidth: 0.5 });
    centrado("ID Aspirante", 125, y + 1, 8.5, negrita);
    centrado("Dictamen", 361, y + 1, 8.5, negrita);
    y -= 16;
  };
  const nueva = (primera: boolean) => {
    p = pdf.addPage([612, 792]);
    if (logo) p.drawImage(logo, { x: 52, y: 712, width: 40, height: 56 });
    derecha("Centro de Innovación y Desarrollo Tecnológico en Cómputo", 748, 8.5, negrita);
    derecha("Subdirección Académica – Departamento de Posgrado", 737, 8.5, negrita);
    pie();
    y = 700;
    if (primera) {
      derecha(`Ciudad de México, ${hoy.getDate()} de ${MESES[hoy.getMonth()]} ${hoy.getFullYear()}`, y, 10.5, negrita);
      y -= 34;
      centrado(PROGRAMA.toUpperCase(), 306, y, 10.5, negrita);
      centrado(`RESULTADOS FINALES DEL PROCESO DE ADMISIÓN ${convocatoria}`, 306, y - 13, 10.5, negrita);
      y -= 40;
    }
    encabezadoTabla();
  };
  nueva(true);

  for (const f of filas) {
    const texto = lineas(TEXTO_DICTAMEN_FINAL[f.resolucion], 330, 8.5, normal);
    const alto = Math.max(24, texto.length * 11 + 10);
    if (y - alto < 170) nueva(false);
    p!.drawRectangle({ x: 70, y: y - alto + 12, width: 110, height: alto, borderColor: rgb(0, 0, 0), borderWidth: 0.5 });
    p!.drawRectangle({ x: 180, y: y - alto + 12, width: 362, height: alto, borderColor: rgb(0, 0, 0), borderWidth: 0.5 });
    p!.drawText(f.id, { x: 78, y: y - alto / 2 + 9, size: 8.5, font: normal });
    texto.forEach((t, i) => centrado(t, 361, y - (alto - texto.length * 11) / 2 - i * 11 + 3, 8.5, normal));
    y -= alto;
  }

  // Notas
  const notas = [
    ["NOTAS:", true],
    ["Los aspirantes Aceptados serán contactados por la Unidad de Tecnología Educativa y Campus Virtual vía correo electrónico, quien les brindará más información del avance de su proceso.", false],
    ["Los Condicionados al cumplimiento documental para proceder a su aceptación serán contactados por el Departamento de Posgrado vía correo electrónico, quien les brindará más información del avance de su proceso.", false],
    ["ATENTAMENTE", true],
    ["“La Técnica al Servicio de la Patria”", false],
  ] as const;
  y -= 18;
  for (const [t, fuerte] of notas) {
    const ls = lineas(t, 472, 8.5, fuerte ? negrita : normal);
    if (y - ls.length * 11 < 60) {
      nueva(false);
      y -= 4;
    }
    for (const l of ls) {
      p!.drawText(l, { x: 70, y, size: 8.5, font: fuerte ? negrita : normal, color: fuerte ? rgb(0, 0, 0) : gris });
      y -= 11;
    }
    y -= 6;
  }
  return URL.createObjectURL(new Blob([new Uint8Array(await pdf.save())], { type: "application/pdf" }));
}
