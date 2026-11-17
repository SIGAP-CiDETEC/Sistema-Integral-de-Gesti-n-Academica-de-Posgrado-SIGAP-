"use client";

import { useEffect, useSyncExternalStore } from "react";
import { api, leerToken } from "./api";

/** Contador de notificaciones del personal (servidor real), compartido por el menú y la pantalla de notificaciones. */
let noLeidas = 0;
let tokenUsado: string | null | undefined;
const oyentes = new Set<() => void>();
const fijar = (n: number) => {
  noLeidas = n;
  oyentes.forEach((f) => f());
};

export function recargarNoLeidas() {
  tokenUsado = leerToken();
  api<{ noLeidas: number }>("/notificaciones/pendientes")
    .then((r) => fijar(r.noLeidas))
    .catch(() => undefined);
}
export const marcarVistasPersonal = () => fijar(0);

export function useNoLeidasPersonal(activo: boolean) {
  const n = useSyncExternalStore(
    (cb) => {
      oyentes.add(cb);
      return () => oyentes.delete(cb);
    },
    () => noLeidas,
    () => 0,
  );
  useEffect(() => {
    if (activo && leerToken() !== tokenUsado) recargarNoLeidas();
  }, [activo]);
  return activo ? n : 0;
}
