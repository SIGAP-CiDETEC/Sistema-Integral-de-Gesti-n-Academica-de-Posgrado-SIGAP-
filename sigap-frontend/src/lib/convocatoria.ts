"use client";

import { useMemo, useSyncExternalStore } from "react";
import { CONVOCATORIAS_INFO, convocatoriaActual, type Convocatoria, type IdConvocatoria } from "./config";

/**
 * Convocatorias de admisión (RF-81). Hay dos por ciclo: A (ingreso enero–junio) y B (ingreso agosto–diciembre).
 * El Departamento de Posgrado define sus fechas de registro y cada una se ABRE y se CIERRA SOLA según esas fechas
 * (ya no la abre ni la cierra el Administrador). El Administrador solo configura parámetros como el límite de archivos.
 * SOLO CASCARÓN: se guarda en el navegador. Con backend: GET/PUT /convocatorias y un proceso programado que las cierra.
 */
export type ConfigConvocatoria = {
  nombre: string;
  inicio: string; // AAAA-MM-DD
  cierre: string;
  /** Ya no se usa: el estado se calcula con las fechas (se conserva por datos guardados antes) */
  activa?: boolean;
};

export type EstadoConvocatoria = "Abierta" | "Próxima" | "Cerrada";
/** Fecha de hoy AAAA-MM-DD (hora local). */
export const hoyISO = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** Abierta del día de inicio al día de cierre (incluidos); antes, Próxima; después, Cerrada. */
export const estadoPorFechas = (c: Pick<ConfigConvocatoria, "inicio" | "cierre">, hoy = hoyISO()): EstadoConvocatoria =>
  hoy < c.inicio ? "Próxima" : hoy > c.cierre ? "Cerrada" : "Abierta";
export const TONO_ESTADO_CONV: Record<EstadoConvocatoria, string> = {
  Abierta: "bg-emerald-50 text-emerald-700",
  Próxima: "bg-sky-50 text-sky-800",
  Cerrada: "bg-gray-100 text-gray-600",
};

export type ConfigConvocatorias = {
  A: ConfigConvocatoria;
  B: ConfigConvocatoria;
  /** Límite por archivo que suben los aspirantes (aplica a ambas) */
  limiteMB: number;
  actualizadoEl?: string;
  actualizadoPor?: string;
};

export const IDS_CONVOCATORIA: IdConvocatoria[] = ["A", "B"];

export const CONVOCATORIAS_DEFECTO: ConfigConvocatorias = {
  A: { nombre: "Convocatoria de admisión A-27", inicio: "2026-10-05", cierre: "2026-11-20" },
  B: { nombre: "Convocatoria de admisión B-27", inicio: "2027-04-05", cierre: "2027-05-21" },
  limiteMB: 5,
};

/** Convocatoria lista para mostrarse en las páginas públicas. */
export type ConvocatoriaVista = Convocatoria & {
  id: IdConvocatoria;
  estado: EstadoConvocatoria;
  cierreISO: string;
  periodo: string;
  semestre: string;
  inicioISO: string;
};

const CLAVE = "sigap-convocatoria";
const EVENTO = "sigap-convocatoria";
const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const fechaCorta = (f: string, conAnio = true) => {
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

export function guardarConvocatorias(c: ConfigConvocatorias | null) {
  try {
    if (c) localStorage.setItem(CLAVE, JSON.stringify(c));
    else localStorage.removeItem(CLAVE);
  } catch {
    /* ignorar */
  }
  window.dispatchEvent(new Event(EVENTO));
}

function interpretar(raw: string | null): ConfigConvocatorias {
  const d = CONVOCATORIAS_DEFECTO;
  if (!raw) return d;
  try {
    const g = JSON.parse(raw) as Partial<ConfigConvocatorias>;
    // Nombres anteriores del cascarón ("2027-A") pasan a la nomenclatura A-27 / B-27
    for (const id of IDS_CONVOCATORIA) {
      const c = g[id];
      if (c?.nombre === `Convocatoria de admisión 2027-${id}`) g[id] = { ...c, nombre: d[id].nombre };
    }
    // Formato anterior (una sola convocatoria): solo se conserva el límite de MB
    return { ...d, ...g, A: { ...d.A, ...g.A }, B: { ...d.B, ...g.B }, limiteMB: g.limiteMB ?? d.limiteMB };
  } catch {
    return d;
  }
}

function vista(id: IdConvocatoria, c: ConfigConvocatoria, hoy: string): ConvocatoriaVista {
  const info = CONVOCATORIAS_INFO[id];
  const estado = estadoPorFechas(c, hoy);
  return {
    ...convocatoriaActual,
    id,
    nombre: c.nombre,
    estado,
    activa: estado === "Abierta",
    cierreISO: c.cierre,
    periodo: info.periodo,
    semestre: info.semestre,
    inicioISO: c.inicio,
    inicio: fechaCorta(c.inicio, c.inicio.slice(0, 4) !== c.cierre.slice(0, 4)),
    cierre: fechaCorta(c.cierre),
  };
}

/** Las dos convocatorias (A y B) y sus parámetros comunes. */
export function useConvocatorias() {
  const raw = useSyncExternalStore(suscribir, leer, () => null);
  const cargada = useSyncExternalStore(suscribir, () => true, () => false);
  return useMemo(() => {
    const config = interpretar(raw);
    const hoy = hoyISO();
    const lista = IDS_CONVOCATORIA.map((id) => vista(id, config[id], hoy));
    return { config, lista, activas: lista.filter((c) => c.activa), cargada };
  }, [raw, cargada]);
}

/**
 * Resumen para las pantallas que solo necesitan saber si hay registro abierto
 * y el límite de archivos.
 */
export function useConvocatoria() {
  const { config, activas, cargada } = useConvocatorias();
  return {
    cargada,
    limiteMB: config.limiteMB,
    hayActiva: activas.length > 0,
    nombres: activas.map((c) => c.nombre).join(" y ") || "Sin convocatoria activa",
  };
}
