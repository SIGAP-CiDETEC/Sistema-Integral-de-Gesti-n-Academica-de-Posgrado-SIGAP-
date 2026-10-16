"use client";
import { useSyncExternalStore } from "react";
import { ID_TEMPORAL_DEMO } from "./cuenta-alumno";

type RevisionLocal = { estado?: string };
export type EstadoRevisionLocal = {
  docs?: Record<string, Record<string, RevisionLocal>>;
  cambios?: Record<string, { uteycv?: { formalizadoEl?: string; firmadosFinales?: Record<string, unknown> } }>;
};

/** La aprobación no se invalida por cambiar la fecha del archivo. Solo el personal puede reabrirlo. */
export function documentoValidado(estado: EstadoRevisionLocal, id: string, aspirante = ID_TEMPORAL_DEMO): boolean {
  const escolar = estado.cambios?.[aspirante]?.uteycv;
  return estado.docs?.[aspirante]?.[id]?.estado === "aprobado" || !!escolar?.formalizadoEl || !!escolar?.firmadosFinales?.[id];
}
const leer = () => {
  try { return localStorage.getItem("sigap-posgrado"); } catch { return null; }
};
function interpretar(raw: string | null): EstadoRevisionLocal {
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}
export const estaDocumentoValidado = (id: string) => documentoValidado(interpretar(leer()), id);
export function cambiarArchivoProtegido<T>(archivos: Record<string, T>, id: string, archivo: T | null, validado: boolean): Record<string, T> {
  if (validado) return archivos;
  const nuevos = { ...archivos };
  if (archivo === null) delete nuevos[id];
  else nuevos[id] = archivo;
  return nuevos;
}
const suscribir = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener("sigap-posgrado", cb);
  return () => { window.removeEventListener("storage", cb); window.removeEventListener("sigap-posgrado", cb); };
};
export function useDocumentosValidados() {
  const raw = useSyncExternalStore(suscribir, leer, () => null);
  const estado = interpretar(raw);
  return (id: string) => documentoValidado(estado, id);
}
