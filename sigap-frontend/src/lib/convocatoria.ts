"use client";

import { useMemo, useSyncExternalStore } from "react";
import { convocatoriaActual, type Convocatoria } from "./config";

/**
 * Convocatoria vigente, editable por el Administrador (RF-81, US-AD-03).
 * SOLO CASCARÓN: se guarda en el navegador. Con backend: GET/PUT /convocatorias/activa.
 */
export type ConfigConvocatoria = {
  nombre: string;
  inicio: string; // AAAA-MM-DD
  cierre: string;
  activa: boolean;
  /** Límite por archivo que suben los aspirantes */
  limiteMB: number;
  actualizadoEl?: string;
  actualizadoPor?: string;
};

export const CONVOCATORIA_DEFECTO: ConfigConvocatoria = {
  nombre: convocatoriaActual.nombre,
  inicio: "2026-01-12",
  cierre: "2026-02-27",
  activa: convocatoriaActual.activa,
  limiteMB: 5,
};

const CLAVE = "sigap-convocatoria";
const EVENTO = "sigap-convocatoria";
const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const corta = (f: string, conAnio: boolean) => {
  const [a, m, d] = f.split("-").map(Number);
  return `${d} ${MES[m - 1]}${conAnio ? ` ${a}` : ""}`;
};

const leer = () => {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
};
const suscribir = (cb: () => void) => {
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENTO, cb);
    window.removeEventListener("storage", cb);
  };
};

export function guardarConvocatoria(c: ConfigConvocatoria | null) {
  try {
    if (c) localStorage.setItem(CLAVE, JSON.stringify(c));
    else localStorage.removeItem(CLAVE);
  } catch {
    /* ignorar */
  }
  window.dispatchEvent(new Event(EVENTO));
}

/** Configuración vigente y la forma en que la muestran las páginas públicas. */
export function useConvocatoria(): { config: ConfigConvocatoria; conv: Convocatoria; cargada: boolean } {
  const raw = useSyncExternalStore(suscribir, leer, () => null);
  const cargada = useSyncExternalStore(suscribir, () => true, () => false);
  return useMemo(() => {
    let config = CONVOCATORIA_DEFECTO;
    try {
      if (raw) config = { ...CONVOCATORIA_DEFECTO, ...(JSON.parse(raw) as ConfigConvocatoria) };
    } catch {
      /* usar la de ejemplo */
    }
    const conv: Convocatoria = {
      ...convocatoriaActual,
      nombre: config.nombre,
      activa: config.activa,
      inicio: corta(config.inicio, config.inicio.slice(0, 4) !== config.cierre.slice(0, 4)),
      cierre: corta(config.cierre, true),
    };
    return { config, conv, cargada };
  }, [raw, cargada]);
}
