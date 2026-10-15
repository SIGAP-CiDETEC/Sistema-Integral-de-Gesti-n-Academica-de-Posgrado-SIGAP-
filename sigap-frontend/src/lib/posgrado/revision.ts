"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { EstadoDoc, ResultadoEval } from "./datos";

/**
 * Lo que Posgrado decidió sobre los documentos del aspirante de este navegador (ASP-2026-001).
 * Solo cascarón: se lee de lo que guardó la sesión de Posgrado. Con backend: GET /aspirantes/me/documentos.
 */
export type Revision = { estado: EstadoDoc; observacion?: string; prorrogaHasta?: string; /** fecha ISO de la revisión */ el?: string };

const leer = () => {
  try {
    return localStorage.getItem("sigap-posgrado");
  } catch {
    return null;
  }
};
const suscribir = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener("sigap-posgrado", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("sigap-posgrado", cb);
  };
};

/**
 * Solo cascarón: aplica un cambio del personal sobre el aspirante de este navegador desde su propia sesión
 * (botones "Simular que Posgrado…"). Con backend esto no existe: lo hace Posgrado en su sesión.
 */
export function simularCambioPosgrado(id: string, patch: Record<string, unknown>, aviso?: { asunto: string; mensaje: string }) {
  try {
    const e = JSON.parse(localStorage.getItem("sigap-posgrado") ?? "{}");
    const cambios = e.cambios ?? {};
    const actual = cambios[id] ?? {};
    const ev = patch.evaluacion ? { evaluacion: { ...(actual.evaluacion ?? {}), ...(patch.evaluacion as object) } } : {};
    cambios[id] = { ...actual, ...patch, ...ev, ultimoMovimiento: new Date().toISOString() };
    const avisos = aviso
      ? [{ id: `av-${Date.now()}`, fecha: new Date().toISOString(), usuario: "Departamento de Posgrado", aspirante: id, canal: "ambos", ...aviso }, ...(e.avisos ?? [])]
      : e.avisos ?? [];
    localStorage.setItem("sigap-posgrado", JSON.stringify({ ...e, cambios, avisos }));
  } catch {
    /* ignorar */
  }
  window.dispatchEvent(new Event("sigap-posgrado"));
}

export type AvisoRecibido = { id: string; fecha: string; usuario: string; aspirante: string; canal: "correo" | "sistema" | "ambos"; asunto: string; mensaje: string };

/** Avisos que Posgrado mandó al aspirante por el sistema (los de solo correo no aparecen en SIGAP). */
export function useAvisosAspirante(id = "ASP-2026-001"): AvisoRecibido[] {
  const raw = useSyncExternalStore(suscribir, leer, () => null);
  return useMemo(() => {
    try {
      const lista = (raw ? JSON.parse(raw).avisos : null) ?? [];
      return (lista as AvisoRecibido[]).filter((a) => a.aspirante === id && a.canal !== "correo");
    } catch {
      return [];
    }
  }, [raw, id]);
}

export function useRevisionDocs(id = "ASP-2026-001"): Record<string, Revision> {
  const raw = useSyncExternalStore(suscribir, leer, () => null);
  return useMemo(() => {
    try {
      return (raw ? JSON.parse(raw).docs?.[id] : null) ?? {};
    } catch {
      return {};
    }
  }, [raw, id]);
}

/** Lo que el personal (Posgrado y UTEyCV) ha registrado sobre el aspirante de este navegador. */
export type EstadoVivo = {
  /** true si el personal ya hizo algo con este aspirante */
  hayDatos: boolean;
  etapa: "registro" | "documentos" | "entrevista" | "evaluacion" | "dictamen";
  concluido?: string;
  entrevista?: { fecha: string; hora: string; modalidad: string; sala: string };
  /** Solo el resultado de la entrevista (no lleva ponderación) */
  resultadoEntrevista?: "Aprobado" | "Con reservas" | "Rechazado";
  /** Resultados de la evaluación (el aspirante solo ve los ya publicados) */
  evaluacion: { propedeutico?: ResultadoEval; examen?: ResultadoEval };
  resolucion?: "Aceptado" | "Condicionado" | "No aceptado";
  turnadoUteycv?: string;
};

export function useEstadoAdmision(id = "ASP-2026-001"): EstadoVivo {
  const raw = useSyncExternalStore(suscribir, leer, () => null);
  return useMemo(() => {
    let c: Record<string, unknown> = {};
    try {
      c = (raw ? JSON.parse(raw).cambios?.[id] : null) ?? {};
    } catch {
      /* sin datos */
    }
    const ev = (c.evaluacion ?? {}) as EstadoVivo["evaluacion"];
    return {
      hayDatos: Object.keys(c).length > 0,
      // "matricula" venía de versiones anteriores del cascarón: ahora el proceso termina en el dictamen
      etapa: c.etapa === "matricula" ? "dictamen" : ((c.etapa as EstadoVivo["etapa"]) ?? "documentos"),
      concluido: c.concluido as string | undefined,
      // El aspirante ve su cita solo cuando Posgrado la publica (después de que se completa el sínodo)
      entrevista: (c.entrevista as { notificadaEl?: string } | undefined)?.notificadaEl ? (c.entrevista as EstadoVivo["entrevista"]) : undefined,
      resultadoEntrevista: (c.dictamen as { resolucion?: EstadoVivo["resultadoEntrevista"] } | undefined)?.resolucion,
      evaluacion: { propedeutico: ev.propedeutico, examen: ev.examen },
      resolucion: c.resolucion as EstadoVivo["resolucion"],
      turnadoUteycv: c.turnadoUteycv as string | undefined,
    };
  }, [raw, id]);
}

/**
 * Solo cascarón: deshace la conclusión del proceso del aspirante de este navegador y lo regresa
 * al paso anterior, para seguir probando (p. ej. después de simular que no acreditó el examen).
 * Con backend esto no existe. Devuelve el motivo que se deshizo (o null si no había conclusión).
 */
export function deshacerConclusion(id = "ASP-2026-001"): string | null {
  let motivo: string | null = null;
  try {
    const e = JSON.parse(localStorage.getItem("sigap-posgrado") ?? "{}");
    const c = { ...(e.cambios?.[id] ?? {}) };
    if (!c.concluido) return null;
    motivo = String(c.concluido);
    delete c.concluido;
    if (/entrevista/i.test(motivo)) {
      // Rechazado por el sínodo: vuelve a la entrevista sin acta
      delete c.dictamen;
      delete c.actaEntrevista;
      c.etapa = "entrevista";
    } else if (/Colegio/i.test(motivo)) {
      // No aceptado por el Colegio: vuelve a esperar la resolución
      delete c.resolucion;
    } else {
      // Evaluación: se quita el examen no acreditado (o la decisión de no presentarlo)
      const ev = { ...(c.evaluacion ?? {}) };
      if (/Decidió no/i.test(motivo)) delete ev.segundaOportunidad;
      else {
        delete ev.examen;
        if (ev.capturas) {
          ev.capturas = { ...ev.capturas };
          delete ev.capturas.examen;
        }
      }
      c.evaluacion = ev;
      c.etapa = "evaluacion";
    }
    c.ultimoMovimiento = new Date().toISOString();
    const bitacora = [
      { fecha: new Date().toISOString(), usuario: "Vista de prueba", aspirante: id, accion: `Deshizo la conclusión del proceso (solo cascarón): ${motivo}` },
      ...(e.bitacora ?? []),
    ];
    localStorage.setItem("sigap-posgrado", JSON.stringify({ ...e, cambios: { ...e.cambios, [id]: c }, bitacora }));
  } catch {
    /* ignorar */
  }
  window.dispatchEvent(new Event("sigap-posgrado"));
  return motivo;
}

/** Sesión del Colegio que resolvió la admisión (la registra Posgrado al capturar el acta). */
export function useSesionColegio(): { fecha?: string; hora?: string; numero?: string } | null {
  const raw = useSyncExternalStore(suscribir, leer, () => null);
  return useMemo(() => {
    try {
      const acta = raw ? JSON.parse(raw).acta : null;
      return acta?.registradaEl ? { fecha: acta.fecha, hora: acta.hora, numero: acta.numero } : null;
    } catch {
      return null;
    }
  }, [raw]);
}
