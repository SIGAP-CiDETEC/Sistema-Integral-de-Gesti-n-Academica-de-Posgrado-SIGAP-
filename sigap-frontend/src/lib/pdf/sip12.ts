"use client";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { CLAVE_CURSO, COORDINADOR_PROGRAMA, DIRECTOR_CENTRO, SEMESTRE_ACTA, calificacionEnLetra, calificacionNumero, nombreDocente, type GrupoSip12 } from "../actas-sip12";
import { PROGRAMA } from "../config";

const FILAS_POR_HOJA = 16;
const negro = rgb(0, 0, 0);
const gris = rgb(0.45, 0.45, 0.45);
const fondo = rgb(0.9, 0.9, 0.9);

/**
 * SIP-12 · Acta grupal de evaluación de cursos propedéuticos (formato oficial del IPN, carta).
 * Se llena con el curso, el grupo, el docente y la calificación (número y letra) de cada aspirante del grupo.
 * Si el grupo tiene más de 16 aspirantes se agregan hojas. Devuelve una URL del PDF.
 */
export async function generarSip12(g: GrupoSip12, hoy = new Date()): Promise<string> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`SIP-12 ${g.nombreCurso} grupo ${g.grupo}`);
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  const cursiva = await pdf.embedFont(StandardFonts.HelveticaOblique);
  let logo;
  try {
    logo = await pdf.embedPng(await (await fetch("/img/logo-ipn.png")).arrayBuffer());
  } catch {
    logo = undefined;
  }

  const docente = nombreDocente(g);
  const titulo = /^Dra\.?\s/i.test(docente) ? "PROFESORA" : "PROFESOR";
  const hojas = Math.max(1, Math.ceil(g.filas.length / FILAS_POR_HOJA));

  for (let h = 0; h < hojas; h++) {
    const p = pdf.addPage([612, 792]);
    const texto = (t: string, x: number, y: number, size = 8, f: PDFFont = normal, color = negro) => p.drawText(t, { x, y, size, font: f, color });
    const centrado = (t: string, cx: number, y: number, size = 8, f: PDFFont = normal, color = negro) =>
      texto(t, cx - f.widthOfTextAtSize(t, size) / 2, y, size, f, color);
    const caja = (x: number, y: number, w: number, hgt: number, relleno = false) =>
      p.drawRectangle({ x, y, width: w, height: hgt, borderColor: negro, borderWidth: 0.6, color: relleno ? fondo : undefined });
    const ajustar = (t: string, max: number, size: number, f: PDFFont = normal) => {
      let s = t;
      while (s.length > 1 && f.widthOfTextAtSize(s, size) > max) s = s.slice(0, -1);
      return s === t ? t : `${s.slice(0, -1)}…`;
    };

    // Encabezado
    if (logo) p.drawImage(logo, { x: 54, y: 682, width: 54, height: 76 });
    caja(526, 760, 36, 12, true);
    centrado("SIP-12", 544, 763, 7);
    centrado("INSTITUTO POLITÉCNICO NACIONAL", 330, 735, 13, negrita);
    centrado("ACTA GRUPAL DE EVALUACIÓN DE CURSOS PROPEDÉUTICOS", 330, 712, 9.5, cursiva);
    if (hojas > 1) centrado(`Hoja ${h + 1} de ${hojas}`, 330, 700, 7, normal, gris);

    // Escuela y programa
    caja(110, 668, 160, 26, true);
    texto("ESCUELA:", 113, 685, 7.5);
    texto("CIDETEC", 118, 673, 8);
    caja(272, 668, 290, 26, true);
    texto("PROGRAMA:", 275, 685, 7.5);
    texto(PROGRAMA.toUpperCase(), 275, 673, 8);
    // Curso y clave
    caja(54, 646, 420, 16);
    texto(`CURSO:  ${g.nombreCurso.toUpperCase()} · GRUPO ${g.grupo}`, 58, 651, 8);
    caja(474, 646, 88, 16);
    centrado(CLAVE_CURSO[g.materia], 518, 651, 8, negrita);
    centrado("Clave", 518, 637, 6.5, normal, gris);
    // Docente y semestre
    caja(54, 612, 280, 16);
    texto(`${titulo}:  ${ajustar(docente.toUpperCase(), 210, 8)}`, 58, 617, 8);
    texto(`SEMESTRE:  ${SEMESTRE_ACTA}`, 58, 598, 8);
    caja(474, 594, 88, 16);
    centrado("Registro", 518, 612, 6.5, normal, gris);

    // Tabla
    const top = 586;
    const filaH = 17;
    const xs = { reg: 54, alumno: 150, num: 410, letra: 450, fin: 562 };
    caja(xs.reg, top - 28, xs.alumno - xs.reg, 28, true);
    caja(xs.alumno, top - 28, xs.num - xs.alumno, 28, true);
    caja(xs.num, top - 28, xs.fin - xs.num, 28, true);
    centrado("REGISTRO", (xs.reg + xs.alumno) / 2, top - 17, 8);
    centrado("ALUMNO", (xs.alumno + xs.num) / 2, top - 11, 8);
    centrado("CALIFICACIÓN", (xs.num + xs.fin) / 2, top - 11, 8);
    centrado("Número", (xs.num + xs.letra) / 2, top - 24, 6.5);
    centrado("Letra", (xs.letra + xs.fin) / 2, top - 24, 6.5);
    const filas = g.filas.slice(h * FILAS_POR_HOJA, (h + 1) * FILAS_POR_HOJA);
    for (let i = 0; i < FILAS_POR_HOJA; i++) {
      const y = top - 28 - (i + 1) * filaH;
      caja(xs.reg, y, xs.alumno - xs.reg, filaH);
      caja(xs.alumno, y, xs.num - xs.alumno, filaH);
      caja(xs.num, y, xs.letra - xs.num, filaH);
      caja(xs.letra, y, xs.fin - xs.letra, filaH);
      const f = filas[i];
      if (!f) continue;
      texto(f.a.id, xs.reg + 4, y + 5.5, 7.5);
      texto(ajustar(f.a.nombre.toUpperCase(), xs.num - xs.alumno - 8, 8), xs.alumno + 4, y + 5.5, 8);
      centrado(calificacionNumero(f.calificacion), (xs.num + xs.letra) / 2, y + 5.5, 8, negrita);
      centrado(ajustar(calificacionEnLetra(f.calificacion), xs.fin - xs.letra - 6, 7), (xs.letra + xs.fin) / 2, y + 5.5, 7);
    }

    // Firmas
    const yFirma = top - 28 - FILAS_POR_HOJA * filaH - 52;
    firma(p, normal, ajustar(docente.toUpperCase(), 140, 7), titulo, 130, yFirma);
    firma(p, normal, COORDINADOR_PROGRAMA.toUpperCase(), "COORDINADOR DEL PROGRAMA", 306, yFirma);
    firma(p, normal, DIRECTOR_CENTRO.toUpperCase(), "DIRECTOR DEL CENTRO", 482, yFirma);

    // Fecha
    const yFecha = yFirma - 52;
    texto("Fecha:", 400, yFecha + 3, 8.5);
    const partes = [String(hoy.getDate()).padStart(2, "0"), String(hoy.getMonth() + 1).padStart(2, "0"), String(hoy.getFullYear())];
    ["d", "m", "a"].forEach((etq, i) => {
      caja(432 + i * 40, yFecha, 40, 13);
      centrado(partes[i], 452 + i * 40, yFecha + 3.5, 8);
      centrado(etq, 452 + i * 40, yFecha - 8, 6.5, normal, gris);
    });
    texto("ESCALA DE CALIFICACIÓN: de 0 a 10; mínima aprobatoria 8.", 54, yFecha - 22, 7);
  }
  return URL.createObjectURL(new Blob([new Uint8Array(await pdf.save())], { type: "application/pdf" }));
}

function firma(p: PDFPage, f: PDFFont, nombre: string, cargo: string, cx: number, y: number) {
  p.drawLine({ start: { x: cx - 80, y: y + 10 }, end: { x: cx + 80, y: y + 10 }, thickness: 0.6, color: negro });
  p.drawText(nombre, { x: cx - f.widthOfTextAtSize(nombre, 7) / 2, y: y + 13, size: 7, font: f });
  p.drawText(cargo, { x: cx - f.widthOfTextAtSize(cargo, 7) / 2, y: y, size: 7, font: f });
}

/** Descarga el SIP-12 de un grupo. */
export async function descargarSip12(g: GrupoSip12) {
  const url = await generarSip12(g);
  const a = document.createElement("a");
  a.href = url;
  const curso = g.nombreCurso.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
  a.download = `SIP-12_${curso}_grupo_${g.grupo}.pdf`;
  a.click();
}
