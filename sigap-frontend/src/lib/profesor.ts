"use client";

import { useMemo, useSyncExternalStore } from "react";
import { PROFESORES_SINODO, PROFESOR_AREA, evaluacionPendiente, type AreaEvalId, type AspiranteP, type ProfesorP } from "./posgrado/datos";
import { useSesion } from "./sesion";

/**
 * Profesor de la sesión. SOLO CASCARÓN: para probar el flujo completo con una sola cuenta,
 * se puede "actuar como" otro profesor del sínodo (p. ej. para que firmen los 3 el acta).
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

/** Áreas que califica un profesor. */
export const areasDeProfesor = (id?: string) => (Object.entries(PROFESOR_AREA) as [AreaEvalId, string][]).filter(([, p]) => p === id).map(([a]) => a);

/** Profesor con el que se actúa (el de la cuenta, o el elegido en la vista de prueba). */
export function useProfesorActual(): { profesor: ProfesorP | null; propio: ProfesorP | null; simulado: boolean } {
  const { sesion } = useSesion();
  const como = useSyncExternalStore(suscribir, leer, () => null);
  return useMemo(() => {
    if (sesion?.rol !== "profesor") return { profesor: null, propio: null, simulado: false };
    const propio = profesorPorCorreo(sesion.correo) ?? null;
    const elegido = como ? PROFESORES_SINODO.find((p) => p.id === como) : undefined;
    const profesor = elegido ?? propio;
    return { profesor: profesor ?? null, propio, simulado: !!elegido && elegido.id !== propio?.id };
  }, [sesion, como]);
}

// ---------- Pendientes del profesor ----------

export type EstadoEntrevistaProf = "Por realizar" | "Por firmar" | "Esperando firmas" | "Dictaminada" | "Concluida";
export const TONO_ENTREVISTA_PROF: Record<EstadoEntrevistaProf, string> = {
  "Por realizar": "bg-indigo-50 text-primary",
  "Por firmar": "bg-amber-50 text-amber-800",
  "Esperando firmas": "bg-sky-50 text-sky-800",
  Dictaminada: "bg-emerald-50 text-emerald-700",
  Concluida: "bg-gray-100 text-gray-600",
};

/** Entrevistas donde el profesor forma parte del sínodo. */
export const entrevistasDe = (lista: AspiranteP[], prof?: string) => lista.filter((a) => !!prof && !!a.entrevista?.sinodo.includes(prof));

export function estadoEntrevistaProf(a: AspiranteP, prof: string): EstadoEntrevistaProf {
  if (a.dictamen) return "Dictaminada";
  if (a.concluido) return "Concluida";
  if (!a.actaEntrevista) return "Por realizar";
  return a.actaEntrevista.firmas[prof] ? "Esperando firmas" : "Por firmar";
}

/** Calificaciones que le toca capturar (aspirante + área) al profesor. */
export function capturasPendientes(lista: AspiranteP[], prof?: string) {
  const mias = areasDeProfesor(prof);
  return lista.flatMap((a) => {
    if (a.concluido) return [];
    const p = evaluacionPendiente(a.evaluacion);
    if (!p) return [];
    return p.areas.filter((x) => mias.includes(x)).map((area) => ({ a, area, tipo: p.tipo, esSegunda: p.esSegunda, capturada: a.evaluacion.capturas?.[p.tipo]?.[area] }));
  });
}
