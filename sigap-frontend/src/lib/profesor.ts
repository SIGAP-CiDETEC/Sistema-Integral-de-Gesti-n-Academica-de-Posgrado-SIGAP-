"use client";

import { useMemo, useSyncExternalStore } from "react";
import { AREAS_EVAL, PROFESORES_SINODO, evaluacionEnCaptura, sinodoCompleto, type AreaEvalId, type AspiranteP, type ProfesorP } from "./posgrado/datos";
import { docenteDe, type Materia } from "./evaluacion";
import { useSesion } from "./sesion";
import { MODO_API } from "./api";

/**
 * Profesor de la sesión. SOLO CASCARÓN: para probar el flujo completo con una sola cuenta,
 * se puede "actuar como" otro profesor entrevistador (p. ej. para que firmen los 3 el acta).
 * Con backend cada profesor entra con su propia cuenta y esto desaparece.
 */
const CLAVE = "sigap-profesor-como";
const EVENTO = "sigap-profesor-como";

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

export function actuarComo(id: string | null) {
  try {
    if (id) localStorage.setItem(CLAVE, id);
    else localStorage.removeItem(CLAVE);
  } catch {
    /* ignorar */
  }
  window.dispatchEvent(new Event(EVENTO));
}

export const profesorPorCorreo = (correo?: string) => PROFESORES_SINODO.find((p) => p.correo === correo?.trim().toLowerCase());

/** Grupos de los cursos propedéuticos con calificación (Matemáticas y Programación) que imparte el profesor. */
export const gruposDeProfesor = (id: string | undefined, materias: Materia[]) =>
  materias.flatMap((m) => (AREAS_EVAL.some((x) => x.id === m.id) ? m.grupos.filter((g) => !!id && docenteDe(m.id, g.id, materias) === id).map((g) => ({ materia: m, grupo: g })) : []));

/** Profesor con el que se actúa (el de la cuenta, o el elegido en la vista de prueba). */
export function useProfesorActual(): { profesor: ProfesorP | null; propio: ProfesorP | null; simulado: boolean } {
  const { sesion } = useSesion();
  const como = useSyncExternalStore(suscribir, leer, () => null);
  return useMemo(() => {
    if (sesion?.rol !== "profesor") return { profesor: null, propio: null, simulado: false };
    // Servidor real: el profesor es el de la cuenta (no hay "actuar como")
    if (MODO_API) {
      const p: ProfesorP | null = sesion.profesorId
        ? (PROFESORES_SINODO.find((x) => x.id === sesion.profesorId) ?? { id: sesion.profesorId, nombre: sesion.nombre, correo: sesion.correo, colegiado: true, vigencia: "", linea: "" })
        : null;
      return { profesor: p, propio: p, simulado: false };
    }
    const propio = profesorPorCorreo(sesion.correo) ?? null;
    const elegido = como ? PROFESORES_SINODO.find((p) => p.id === como) : undefined;
    const profesor = elegido ?? propio;
    return { profesor: profesor ?? null, propio, simulado: !!elegido && elegido.id !== propio?.id };
  }, [sesion, como]);
}

// ---------- Pendientes del profesor ----------

export type EstadoEntrevistaProf = "Profesores entrevistadores incompletos" | "Esperando publicación" | "Por llenar acta" | "Por subir firmada" | "Dictaminada" | "Concluida";
export const TONO_ENTREVISTA_PROF: Record<EstadoEntrevistaProf, string> = {
  "Profesores entrevistadores incompletos": "bg-gray-100 text-gray-700",
  "Esperando publicación": "bg-gray-100 text-gray-700",
  "Por llenar acta": "bg-indigo-50 text-primary",
  "Por subir firmada": "bg-amber-50 text-amber-800",
  Dictaminada: "bg-emerald-50 text-emerald-700",
  Concluida: "bg-gray-100 text-gray-600",
};

/**
 * true cuando Posgrado ya publicó la cita al aspirante (o la entrevista ya avanzó a acta o dictamen). Antes de eso el
 * profesor no ve los datos del aspirante y todavía puede dejar su lugar.
 */
export const citaPublicada = (a: AspiranteP) => !!a.entrevista?.notificadaEl || !!a.actaEntrevista || !!a.dictamen;

/** Entrevistas donde el profesor forma parte de los profesores entrevistadores. */
export const entrevistasDe = (lista: AspiranteP[], prof?: string) => lista.filter((a) => !!prof && !!a.entrevista?.sinodo.includes(prof));

/**
 * Entrevistas programadas con lugares libres en los profesores entrevistadores que el profesor puede elegir.
 * El profesor solo ve el día y la hora; los datos del aspirante los ve al integrarse a los profesores entrevistadores.
 */
export function entrevistasDisponibles(lista: AspiranteP[], prof?: string) {
  if (!prof) return [];
  return lista
    .filter(
      (a) =>
        a.entrevista?.horarioPublicadoEl && !a.entrevista.notificadaEl && !a.dictamen && !a.concluido && !a.actaEntrevista && !sinodoCompleto(a.entrevista) && !a.entrevista.sinodo.includes(prof),
    )
    .map((a) => ({ a, choque: tieneChoque(lista, prof, a) }))
    .sort((x, y) => `${x.a.entrevista!.fecha}${x.a.entrevista!.hora}`.localeCompare(`${y.a.entrevista!.fecha}${y.a.entrevista!.hora}`));
}

/** true si el profesor ya está en otra entrevista sin dictamen el mismo día a la misma hora. */
export const tieneChoque = (lista: AspiranteP[], prof: string, a: AspiranteP) =>
  lista.some(
    (x) => x.id !== a.id && !x.dictamen && !x.concluido && x.entrevista?.sinodo.includes(prof) && x.entrevista.fecha === a.entrevista?.fecha && x.entrevista.hora === a.entrevista?.hora,
  );

/** El profesor puede dejar su lugar mientras Posgrado no haya publicado la entrevista al aspirante. */
export const puedeDejarLugar = (a: AspiranteP, prof: string) => !!a.entrevista?.sinodo.includes(prof) && !a.entrevista.notificadaEl && !a.actaEntrevista && !a.dictamen && !a.concluido;

export function estadoEntrevistaProf(a: AspiranteP): EstadoEntrevistaProf {
  if (a.dictamen) return "Dictaminada";
  if (a.concluido) return "Concluida";
  if (!a.actaEntrevista && !sinodoCompleto(a.entrevista)) return "Profesores entrevistadores incompletos";
  if (!a.actaEntrevista && !a.entrevista?.notificadaEl) return "Esperando publicación";
  if (!a.actaEntrevista) return "Por llenar acta";
  return "Por subir firmada";
}

/**
 * Calificaciones del curso propedéutico que le toca capturar al profesor: las de los aspirantes inscritos en los grupos
 * que imparte (el docente de cada grupo lo asigna Posgrado). El examen de admisión lo califica la Jefatura de Posgrado.
 */
export function capturasPendientes(lista: AspiranteP[], prof: string | undefined, materias: Materia[]) {
  if (!prof) return [];
  return lista.flatMap((a) => {
    if (a.concluido) return [];
    const p = evaluacionEnCaptura(a.evaluacion);
    if (!p || p.tipo !== "propedeutico") return [];
    return p.areas
      .filter((area) => docenteDe(area, a.evaluacion.grupos[area] ?? "", materias) === prof)
      .map((area) => ({ a, area, tipo: p.tipo, esSegunda: p.esSegunda, capturada: a.evaluacion.capturas?.[p.tipo]?.[area] }));
  });
}

/** Calificaciones del examen de admisión que captura la Jefatura de Posgrado. */
export function capturasExamen(lista: AspiranteP[]) {
  return lista.flatMap((a) => {
    if (a.concluido) return [];
    const p = evaluacionEnCaptura(a.evaluacion);
    if (!p || p.tipo !== "examen") return [];
    return p.areas.map((area: AreaEvalId) => ({ a, area, tipo: p.tipo, esSegunda: p.esSegunda, capturada: a.evaluacion.capturas?.examen?.[area] }));
  });
}
