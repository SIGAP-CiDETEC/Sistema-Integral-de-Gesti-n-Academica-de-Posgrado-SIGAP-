"use client";

import { subirAlmacen } from "./almacen-remoto";
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
  // Calendario A-27 de CIDETEC: propedéuticos del 9 de noviembre al 10 de diciembre; examen el 15 de diciembre de 2026
  propedeutico: { inicio: "2026-11-09", fin: "2026-12-10", modalidad: "Presencial", duracion: "5 semanas" },
  examen: { fecha: "2026-12-15", hora: "10:00", lugar: "Aula 3, CIDETEC" },
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
      segundaOportunidad: `Si no acreditas una o las dos áreas del curso, puedes presentar el examen de esas áreas el ${examen}.`,
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
  // Con el servidor real se guarda para todos
  subirAlmacen("evaluacion", c);
}

/** Configuración vigente de la evaluación (la editada por Posgrado o la de la convocatoria). */
export function useConfigEvaluacion() {
  const raw = useSyncExternalStore(suscribir, leer, () => null);
  return useMemo(() => {
    let config = CONFIG_EVALUACION_DEFECTO;
    try {
      if (raw) {
        const g = JSON.parse(raw) as ConfigEvaluacion;
        // Configuraciones guardadas antes de que existieran el lugar y el docente de cada grupo
        const materias = (g.materias ?? MATERIAS).map((m) => {
          const base = MATERIAS.find((x) => x.id === m.id);
          return {
            ...base,
            ...m,
            grupos: (m.grupos ?? base?.grupos ?? []).map((gr) => {
              const bg = base?.grupos.find((x) => x.id === gr.id) ?? base?.grupos[0];
              return { ...bg, ...gr, lugar: gr.lugar ?? bg?.lugar, docente: gr.docente ?? bg?.docente };
            }),
          } as Materia;
        });
        config = {
          ...CONFIG_EVALUACION_DEFECTO,
          ...g,
          propedeutico: { ...CONFIG_EVALUACION_DEFECTO.propedeutico, ...g.propedeutico },
          examen: { ...CONFIG_EVALUACION_DEFECTO.examen, ...g.examen },
          materias,
        };
      }
    } catch {
      /* usar la de la convocatoria */
    }
    return { config, modalidades: modalidadesDe(config), materias: config.materias, editada: !!raw };
  }, [raw]);
}

export type { ModalidadId };
