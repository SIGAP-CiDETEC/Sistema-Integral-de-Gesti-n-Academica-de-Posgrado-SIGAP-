"use client";

import { useMemo, useSyncExternalStore } from "react";
import { MATERIAS, MODALIDADES, type Materia, type ModalidadId } from "./evaluacion";

/**
 * Fechas y horarios de la evaluación, EDITABLES por el Departamento de Posgrado.
 * Solo cascarón: se guardan en el navegador y los leen tanto Posgrado como el aspirante.
 * Con backend: PUT /convocatorias/activa/evaluacion (y notificación a los afectados).
 */
export type ConfigEvaluacion = {
  propedeutico: { inicio: string; fin: string; modalidad: "Presencial" | "En línea" | "Mixta"; duracion: string };
  examen: { fecha: string; hora: string; lugar: string };
  materias: Materia[];
};

export const CONFIG_EVALUACION_DEFECTO: ConfigEvaluacion = {
  propedeutico: { inicio: "2026-04-27", fin: "2026-05-29", modalidad: "Presencial", duracion: "5 semanas" },
  examen: { fecha: "2026-06-08", hora: "10:00", lugar: "Aula 3, CIDETEC" },
  materias: MATERIAS,
};

const CLAVE = "sigap-evaluacion-config";
const EVENTO = "sigap-evaluacion-config";
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const partes = (f: string) => {
  const [a, m, d] = f.split("-").map(Number);
  return { a, m: MESES[m - 1], d };
};
export const fechaLargaIso = (f: string) => {
  const p = partes(f);
  return `${p.d} de ${p.m} de ${p.a}`;
};
const rango = (i: string, f: string) => {
  const a = partes(i);
  const b = partes(f);
  return a.a === b.a ? `${a.d} de ${a.m} al ${b.d} de ${b.m} de ${b.a}` : `${fechaLargaIso(i)} al ${fechaLargaIso(f)}`;
};

/** Textos de cada modalidad calculados con las fechas vigentes. */
export function modalidadesDe(c: ConfigEvaluacion): typeof MODALIDADES {
  const examen = fechaLargaIso(c.examen.fecha);
  return {
    propedeutico: {
      titulo: MODALIDADES.propedeutico.titulo,
      fechas: rango(c.propedeutico.inicio, c.propedeutico.fin),
      detalle: `${c.propedeutico.modalidad} · duración ${c.propedeutico.duracion}`,
      segundaOportunidad: `Si no acreditas el curso, puedes presentar el examen de admisión el ${examen} (RN-08).`,
    },
    examen: {
      titulo: MODALIDADES.examen.titulo,
      fechas: examen,
      detalle: `Examen de admisión directo · ${c.examen.hora} h · ${c.examen.lugar}`,
      segundaOportunidad: MODALIDADES.examen.segundaOportunidad,
    },
  };
}

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

export function guardarConfigEvaluacion(c: ConfigEvaluacion | null) {
  try {
    if (c) localStorage.setItem(CLAVE, JSON.stringify(c));
    else localStorage.removeItem(CLAVE);
  } catch {
    /* ignorar */
  }
  window.dispatchEvent(new Event(EVENTO));
}

/** Configuración vigente de la evaluación (la editada por Posgrado o la de la convocatoria). */
export function useConfigEvaluacion() {
  const raw = useSyncExternalStore(suscribir, leer, () => null);
  return useMemo(() => {
    let config = CONFIG_EVALUACION_DEFECTO;
    try {
      if (raw) config = { ...CONFIG_EVALUACION_DEFECTO, ...(JSON.parse(raw) as ConfigEvaluacion) };
    } catch {
      /* usar la de la convocatoria */
    }
    return { config, modalidades: modalidadesDe(config), materias: config.materias, editada: !!raw };
  }, [raw]);
}

export type { ModalidadId };
