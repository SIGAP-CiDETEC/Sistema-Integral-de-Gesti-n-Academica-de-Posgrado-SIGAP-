"use client";

import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import {
  firmasActa,
  integrarResultado,
  evaluacionPendiente,
  nombreArea,
  nombreProfesor,
  type ActaEntrevista,
  type AreaEvalId,
  type AspiranteP,
} from "@/lib/posgrado/datos";

const FIRMA = "\n\nAtentamente,\nDepartamento de Posgrado · CIDETEC";

/** Acciones del profesor sobre el proceso de admisión (acta MTC-EC y calificaciones). */
export function useAccionesProfesor() {
  const { actualizar, enviarAviso } = usePosgrado();

  /** Con las 3 firmas el acta surte efecto: se registra el dictamen de la entrevista (RF-12, RN-05). */
  const aplicarDictamen = (a: AspiranteP, acta: ActaEntrevista) => {
    const res = acta.resolucion;
    const comentarios = [acta.observaciones, acta.motivo].filter((x) => x.trim()).join(" · ");
    actualizar(
      a.id,
      {
        actaEntrevista: acta,
        dictamen: { resolucion: res, comentarios, registradoEl: new Date().toISOString() },
        ...(res === "Rechazado" ? { concluido: "Rechazado en la entrevista colegiada (RN-05)" } : { etapa: "evaluacion" as const }),
        formatos: { ...a.formatos, "mtc-ec": true },
      },
      `Acta MTC-EC firmada por los 3 sinodales. Dictamen de entrevista: ${res}${res === "Rechazado" ? ". El proceso queda concluido" : "; pasa a evaluación"}`,
    );
    const nombre = a.nombre.split(" ")[0];
    if (res === "Rechazado")
      enviarAviso([a.id], "ambos", "Resultado de tu proceso de admisión", `Estimado(a) ${nombre}:\n\nAgradecemos tu interés en la Maestría en Tecnología de Cómputo. Te informamos que tu proceso de admisión en esta convocatoria ha concluido.${FIRMA}`);
    else
      enviarAviso([a.id], "ambos", "Tu entrevista colegiada fue aprobada", `Estimado(a) ${nombre}:\n\nTu entrevista colegiada fue aprobada. Ingresa a SIGAP (fase 4 · Evaluación) para elegir tu modalidad de evaluación.${FIRMA}`);
  };

  /** Guarda el acta (la firma quien la llena) o agrega la firma de otro sinodal. */
  const firmar = (a: AspiranteP, acta: ActaEntrevista, profesor: string, nueva: boolean) => {
    const firmada: ActaEntrevista = { ...acta, firmas: { ...acta.firmas, [profesor]: new Date().toISOString() } };
    const n = firmasActa({ entrevista: a.entrevista, actaEntrevista: firmada });
    const total = a.entrevista?.sinodo.length ?? 3;
    if (n >= total) {
      if (nueva) actualizar(a.id, { actaEntrevista: { ...firmada, firmas: acta.firmas } }, "Llenó el acta de entrevista colegiada (MTC-EC)");
      aplicarDictamen(a, firmada);
      return;
    }
    actualizar(
      a.id,
      { actaEntrevista: firmada },
      nueva
        ? `Llenó y firmó el acta de entrevista colegiada (MTC-EC) · ${n} de ${total} firmas`
        : `Firmó el acta de entrevista colegiada (MTC-EC) · ${n} de ${total} firmas`,
    );
  };

  /** Solo cascarón: firman los sinodales que faltan. */
  const simularFirmasRestantes = (a: AspiranteP) => {
    const acta = a.actaEntrevista;
    if (!acta || !a.entrevista) return;
    const faltan = a.entrevista.sinodo.filter((p) => !acta.firmas[p]);
    const ahora = new Date().toISOString();
    const firmada: ActaEntrevista = { ...acta, firmas: { ...acta.firmas, ...Object.fromEntries(faltan.map((p) => [p, ahora])) } };
    actualizar(a.id, { actaEntrevista: firmada }, `Firmaron el acta MTC-EC (simulado): ${faltan.map(nombreProfesor).join(", ")}`);
    aplicarDictamen(a, firmada);
  };

  /** Captura la calificación de un área; con todas las áreas, el resultado queda listo para que Posgrado lo publique. */
  const capturar = (a: AspiranteP, area: AreaEvalId, calificacion: number, profesor: string) => {
    const pend = evaluacionPendiente(a.evaluacion);
    if (!pend) return;
    const e = a.evaluacion;
    const delTipo = { ...(e.capturas?.[pend.tipo] ?? {}), [area]: { calificacion, por: profesor, el: new Date().toISOString() } };
    const capturas = { ...(e.capturas ?? {}), [pend.tipo]: delTipo };
    const resultado = integrarResultado(delTipo, pend.areas);
    const nombreEval = pend.tipo === "propedeutico" ? "curso propedéutico" : pend.esSegunda ? "examen de áreas no acreditadas" : "examen de admisión";
    actualizar(
      a.id,
      { evaluacion: { ...e, capturas, ...(resultado ? { [pend.tipo]: resultado } : {}) } },
      `Capturó ${nombreArea(area)} del ${nombreEval}: ${calificacion}${resultado ? ". Calificaciones completas; listas para que Posgrado las publique" : ""}`,
    );
  };

  return { firmar, simularFirmasRestantes, capturar };
}
