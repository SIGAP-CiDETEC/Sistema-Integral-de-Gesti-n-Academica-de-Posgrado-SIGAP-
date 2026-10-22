"use client";

import { useSyncExternalStore } from "react";

/** Mensajes breves en pantalla (p. ej. errores que responde el servidor). */
export type AvisoUi = { id: number; texto: string; tipo: "error" | "exito" };
let avisos: AvisoUi[] = [];
const oyentes = new Set<() => void>();
const emitir = () => oyentes.forEach((f) => f());

export function notificar(texto: string, tipo: AvisoUi["tipo"] = "error") {
  const id = Date.now() + Math.random();
  avisos = [...avisos, { id, texto, tipo }];
  emitir();
  setTimeout(() => cerrarAviso(id), 6000);
}
export function cerrarAviso(id: number) {
  avisos = avisos.filter((a) => a.id !== id);
  emitir();
}
export function useAvisosUi() {
  return useSyncExternalStore(
    (f) => {
      oyentes.add(f);
      return () => oyentes.delete(f);
    },
    () => avisos,
    () => avisos,
  );
}

/** Mensaje de error legible a partir de lo que lanzó la API. */
export const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : "No se pudo completar la operación");
