"use client";

import { useEffect, useSyncExternalStore } from "react";
import { api, leerToken } from "./api";
import { mensajeDe } from "./avisos-ui";

/**
 * Portal del aspirante con el servidor real: lo que devuelve GET /portal/yo, compartido por el menú lateral y las
 * pantallas (una sola petición por carga; recargarPortal() la vuelve a pedir tras un cambio).
 */
export type PestanaPortal = "inicio" | "registro" | "documentos" | "entrevista" | "evaluacion" | "resultados" | "dictamen" | "notificaciones";

export type YoPortal = {
  nombre: string;
  idTemporal: string;
  pestanas: PestanaPortal[];
  etapa: string;
  concluido: string | null;
  enLinea: boolean;
  verificadoEl: string | null;
  documentos: { faltan: number; observados: number };
  noLeidas: number;
  entrevista: { fecha: string; hora: string; duracion: number; modalidad: string; sala: string } | null;
  puedeElegir: boolean;
  motivo?: string;
  eleccion: { modalidad: "propedeutico" | "examen" } | null;
  resultados: unknown;
  dictamen: unknown;
};

/** Pestaña del menú de cada ruta del portal. */
export const PESTANA_DE_RUTA: Record<string, PestanaPortal> = {
  "/aspirante": "inicio",
  "/aspirante/registro": "registro",
  "/aspirante/documentos": "documentos",
  "/aspirante/entrevista": "entrevista",
  "/aspirante/evaluacion": "evaluacion",
  "/aspirante/resultados": "resultados",
  "/aspirante/dictamen": "dictamen",
  "/aspirante/notificaciones": "notificaciones",
};

type Estado = { yo: YoPortal | null; error: string; cargando: boolean };
let estado: Estado = { yo: null, error: "", cargando: false };
let pedido: Promise<void> | null = null;
/** Sesión con la que se pidió (si cambia de cuenta en la misma pestaña, se vuelve a pedir). */
let tokenUsado: string | null = null;
const oyentes = new Set<() => void>();
const emitir = (e: Partial<Estado>) => {
  estado = { ...estado, ...e };
  oyentes.forEach((f) => f());
};

export function recargarPortal() {
  const token = leerToken();
  if (token !== tokenUsado) emitir({ yo: null, error: "" });
  tokenUsado = token;
  pedido = (async () => {
    emitir({ cargando: true });
    try {
      emitir({ yo: await api<YoPortal>("/portal/yo"), error: "", cargando: false });
    } catch (e) {
      emitir({ error: mensajeDe(e), cargando: false });
    }
  })();
  return pedido;
}

/** Actualiza solo el contador de notificaciones sin pedir todo de nuevo. */
export function marcarNotificacionesVistas() {
  if (estado.yo) emitir({ yo: { ...estado.yo, noLeidas: 0 } });
}

const VACIO: Estado = { yo: null, error: "", cargando: false };

export function usePortal(activo = true) {
  const e = useSyncExternalStore(
    (cb) => {
      oyentes.add(cb);
      return () => oyentes.delete(cb);
    },
    () => estado,
    () => VACIO,
  );
  useEffect(() => {
    if (activo && (!pedido || leerToken() !== tokenUsado)) void recargarPortal();
  }, [activo]);
  return e;
}
