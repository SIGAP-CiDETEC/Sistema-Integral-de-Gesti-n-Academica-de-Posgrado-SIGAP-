import { autollenados, faltantes, type Contexto, type Formato } from "@/lib/formatos";
import type { ArchivoCargado } from "./ExpedienteProvider";

export type EstadoFormato = {
  etiqueta: string;
  tono: "ambar" | "azul" | "verde" | "gris";
  faltan: number;
  autollenados: number;
  /** El aspirante debe imprimirlo, firmarlo y subir el escaneo */
  firmaAspirante: boolean;
  completo: boolean;
};

export function estadoFormato(
  f: Formato,
  ctx: Contexto,
  firmado?: ArchivoCargado,
  extra: { confirmado?: string; recibido?: ArchivoCargado } = {},
): EstadoFormato {
  const firmaAspirante = f.firmas.some((x) => x.rol === "aspirante");
  const auto = autollenados(f, ctx).length;
  const base = { autollenados: auto, firmaAspirante };
  if (f.llena === "area" && f.confirmaAspirante) {
    if (extra.recibido) return { ...base, etiqueta: "Firmado · disponible", tono: "verde", faltan: 0, completo: true };
    if (extra.confirmado) return { ...base, etiqueta: "Esperando firmas", tono: "gris", faltan: 0, completo: false };
    return { ...base, etiqueta: "Revisa tus datos", tono: "azul", faltan: 0, completo: false };
  }
  if (f.llena === "area") return { ...base, etiqueta: "Lo emite UTEyCV", tono: "gris", faltan: 0, completo: false };
  if (f.llena === "asesor") {
    if (!extra.recibido) return { ...base, etiqueta: "Lo prepara tu asesor", tono: "gris", faltan: 0, completo: false };
    if (!firmado) return { ...base, etiqueta: "Imprime, firma y sube", tono: "azul", faltan: 0, completo: false };
    return { ...base, etiqueta: "Firmado · enviado", tono: "verde", faltan: 0, completo: true };
  }

  const faltan = faltantes(f, ctx).length;
  if (faltan > 0) return { ...base, etiqueta: `Faltan ${faltan} dato${faltan > 1 ? "s" : ""}`, tono: "ambar", faltan, completo: false };
  if (firmaAspirante && !firmado) return { ...base, etiqueta: "Imprime, firma y sube", tono: "azul", faltan, completo: false };
  return { ...base, etiqueta: firmaAspirante ? "Firmado · enviado" : "Completo · enviado", tono: "verde", faltan, completo: true };
}

export const TONOS = {
  ambar: "bg-amber-50 text-amber-800",
  azul: "bg-indigo-50 text-primary",
  verde: "bg-emerald-50 text-emerald-700",
  gris: "bg-gray-100 text-gray-600",
} as const;
