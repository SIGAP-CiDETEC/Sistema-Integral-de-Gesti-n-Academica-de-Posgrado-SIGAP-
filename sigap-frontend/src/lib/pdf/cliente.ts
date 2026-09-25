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
  if (!f.plantilla) throw new Error("Este formato aún no tiene plantilla PDF.");
  const plantilla = await (await fetch(`/formatos/${f.plantilla}`)).arrayBuffer();
  const valores = Object.fromEntries(camposVisibles(f, ctx).map((c) => [c.id, resolver(c, ctx)]));
  const pdf = await rellenarPdf(f.clave, plantilla, {
    valores,
    hoy: ctx.hoy,
    soloPaginas: f.paginasAspirante,
    foto: opciones.foto
      ? { bytes: await bytesDe(opciones.foto), tipo: opciones.foto.startsWith("data:image/png") ? "png" : "jpg" }
      : undefined,
  });
  return URL.createObjectURL(new Blob([pdf as BlobPart], { type: "application/pdf" }));
}

/** Genera un PDF con valores ya calculados (p. ej. el SIP-04 que elabora UTEyCV). */
export async function generarPdfConValores(clave: string, plantilla: string, valores: Record<string, string>): Promise<string> {
  const bytes = await (await fetch(`/formatos/${plantilla}`)).arrayBuffer();
  const pdf = await rellenarPdf(clave, bytes, { valores, hoy: new Date() });
  return URL.createObjectURL(new Blob([pdf as BlobPart], { type: "application/pdf" }));
}
