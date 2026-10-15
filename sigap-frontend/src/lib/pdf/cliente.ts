"use client";

import { camposVisibles, resolver, type Contexto, type Formato } from "../formatos";
import { rellenarPdf } from "./rellenar";

const bytesDe = async (dataUrl: string) => new Uint8Array(await (await fetch(dataUrl)).arrayBuffer());

/** Genera el PDF llenado de un formato en el navegador y devuelve una URL para verlo o descargarlo. */
export async function generarPdfFormato(
  f: Formato,
  ctx: Contexto,
  opciones: { foto?: string | null },
): Promise<string> {
  const pdf = await generarBytesFormato(f, ctx, opciones);
  return URL.createObjectURL(new Blob([pdf as BlobPart], { type: "application/pdf" }));
}

export async function generarBytesFormato(f: Formato, ctx: Contexto, opciones: { foto?: string | null } = {}) {
  if (!f.plantilla) throw new Error("Este formato aún no tiene plantilla PDF.");
  const respuesta = await fetch(`/formatos/${f.plantilla}`);
  if (!respuesta.ok) throw new Error("No se pudo cargar la plantilla del formato.");
  const plantilla = await respuesta.arrayBuffer();
  const valores = Object.fromEntries(camposVisibles(f, ctx).map((c) => [c.id, resolver(c, ctx)]));
  const pdf = await rellenarPdf(f.clave, plantilla, {
    valores,
    hoy: ctx.hoy,
    soloPaginas: f.paginasAspirante,
    foto: opciones.foto
      ? { bytes: await bytesDe(opciones.foto), tipo: opciones.foto.startsWith("data:image/png") ? "png" : "jpg" }
      : undefined,
  });
  return pdf;
}

export function pdfDataUrl(bytes: Uint8Array): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result));
    lector.onerror = () => reject(new Error("No se pudo guardar el PDF del formato."));
    lector.readAsDataURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
  });
}

/** Genera un PDF con valores ya calculados (p. ej. un formato con datos del personal). */
export async function generarPdfConValores(clave: string, plantilla: string, valores: Record<string, string>): Promise<string> {
  const bytes = await (await fetch(`/formatos/${plantilla}`)).arrayBuffer();
  const pdf = await rellenarPdf(clave, bytes, { valores, hoy: new Date() });
  return URL.createObjectURL(new Blob([pdf as BlobPart], { type: "application/pdf" }));
}
