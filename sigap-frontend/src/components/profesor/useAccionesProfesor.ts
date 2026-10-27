"use client";

import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { MODO_API, api } from "@/lib/api";
import { mensajeDe, notificar } from "@/lib/avisos-ui";
import {
  fechaCorta,
  horarioEntrevista,
  integrarResultado,
  evaluacionEnCaptura,
  puedeEditarCaptura,
  nombreArea,
  lugaresLibres,
  nombreProfesor,
  type ActaEntrevista,
  type AreaEvalId,
  type AspiranteP,
} from "@/lib/posgrado/datos";

const FIRMA = "\n\nAtentamente,\nDepartamento de Posgrado · CIDETEC";

/** Archivo que sube el profesor (en el navegador basta el nombre; con el servidor se envía el PDF). */
type ArchivoActa = File | { name: string };

/** Acciones del profesor sobre el proceso de admisión (acta MTC-EC y calificaciones). */
export function useAccionesProfesor() {
  const { actualizar, enviarAviso, recargar } = usePosgrado();

  /** Con el servidor real: llama a la API, avisa el resultado y recarga. Devuelve si salió bien. */
  const enServidor = async (ruta: string, opciones: Parameters<typeof api>[1], exito?: string) => {
    try {
      await api(ruta, opciones);
      if (exito) notificar(exito, "exito");
      return true;
    } catch (e) {
      notificar(mensajeDe(e));
      return false;
    } finally {
      await recargar();
    }
  };

  /** Con el acta firmada por los 3 el dictamen surte efecto (RF-12, RN-05). */
  const aplicarDictamen = (a: AspiranteP, acta: ActaEntrevista) => {
    const res = acta.resolucion;
    const comentarios = [acta.observaciones, acta.motivo].filter((x) => x.trim()).join(" · ");
    actualizar(
      a.id,
      {
        actaEntrevista: acta,
        dictamen: { resolucion: res, comentarios, registradoEl: new Date().toISOString() },
        ...(res === "Rechazado" ? { concluido: "Rechazado en la entrevista colegiada" } : { etapa: "evaluacion" as const }),
        formatos: { ...a.formatos, "mtc-ec": true },
      },
      `${nombreProfesor(acta.firmada?.subidaPor ?? "")} subió el acta MTC-EC firmada por los 3 profesores entrevistadores (${acta.firmada?.archivo}). Dictamen de entrevista: ${res}${
        res === "Rechazado" ? ". El proceso queda concluido" : "; pasa a evaluación"
      }`,
    );
    const nombre = a.nombre.split(" ")[0];
    if (res === "Rechazado")
      enviarAviso([a.id], "ambos", "Resultado de tu proceso de admisión", `Estimado(a) ${nombre}:\n\nAgradecemos tu interés en la Maestría en Tecnología de Cómputo. Te informamos que tu proceso de admisión en esta convocatoria ha concluido.${FIRMA}`);
    else
      enviarAviso([a.id], "ambos", "Tu entrevista colegiada fue aprobada", `Estimado(a) ${nombre}:\n\nTu entrevista colegiada fue aprobada. Ingresa a SIGAP (fase 4 · Evaluación) para elegir tu modalidad de evaluación.${FIRMA}`);
  };

  /**
   * Guarda el acta. Es una cola: solo la llena el primer profesor entrevistador; si otro ya la llenó, no se sobrescribe
   * (solo quien la llenó puede corregirla mientras no se suba firmada).
   */
  const guardarActa = async (a: AspiranteP, acta: ActaEntrevista, profesor: string): Promise<boolean> => {
    if (MODO_API) {
      const { hoja1, criterios, proyeccion, observaciones, resolucion, motivo } = acta;
      return enServidor(`/aspirantes/${a.id}/acta`, { metodo: "PUT", cuerpo: { hoja1, criterios, proyeccion, observaciones, resolucion, motivo } }, "Acta guardada");
    }
    const previa = a.actaEntrevista;
    if (previa?.firmada || (previa && previa.capturadaPor !== profesor)) return false;
    actualizar(
      a.id,
      { actaEntrevista: { ...acta, capturadaPor: profesor, firmada: undefined } },
      `${nombreProfesor(profesor)} ${previa ? "corrigió" : "llenó"} el acta de entrevista colegiada (MTC-EC); queda lista para imprimirse, firmarse y subirse`,
    );
    return true;
  };

  /** El primer profesor entrevistador que sube el acta firmada por los 3 aplica el dictamen; a los demás se les bloquea la subida. */
  const subirActaFirmada = async (a: AspiranteP, archivo: ArchivoActa, profesor: string): Promise<boolean> => {
    if (MODO_API) {
      if (!(archivo instanceof File)) return false;
      const formulario = new FormData();
      formulario.append("archivo", archivo, archivo.name);
      return enServidor(`/aspirantes/${a.id}/acta/firmada`, { formulario }, "Acta firmada recibida: el dictamen quedó aplicado");
    }
    const acta = a.actaEntrevista;
    if (!acta || acta.firmada || a.dictamen) return false;
    aplicarDictamen(a, { ...acta, firmada: { archivo: archivo.name, subidaPor: profesor, el: new Date().toISOString() } });
    return true;
  };

  /**
   * Captura (o corrige, hasta una semana después de la primera captura y antes de que se publique) la calificación
   * de un área. Con todas las áreas, el resultado queda listo para que Posgrado lo publique.
   */
  const capturar = (a: AspiranteP, area: AreaEvalId, calificacion: number, profesor: string) => {
    const pend = evaluacionEnCaptura(a.evaluacion);
    if (!pend) return false;
    const e = a.evaluacion;
    const previa = e.capturas?.[pend.tipo]?.[area];
    if (previa && !puedeEditarCaptura(previa, false)) return false;
    const ahora = new Date().toISOString();
    const delTipo = { ...(e.capturas?.[pend.tipo] ?? {}), [area]: { calificacion, por: profesor, el: ahora, primeraEl: previa?.primeraEl ?? previa?.el ?? ahora } };
    const capturas = { ...(e.capturas ?? {}), [pend.tipo]: delTipo };
    const resultado = integrarResultado(delTipo, pend.areas);
    const nombreEval = pend.tipo === "propedeutico" ? "curso propedéutico" : pend.esSegunda ? "examen de áreas no acreditadas" : "examen de admisión";
    actualizar(
      a.id,
      { evaluacion: { ...e, capturas, ...(resultado ? { [pend.tipo]: resultado } : {}) } },
      `${previa ? `Corrigió ${nombreArea(area)} del ${nombreEval}: ${previa.calificacion} → ${calificacion}` : `Capturó ${nombreArea(area)} del ${nombreEval}: ${calificacion}`}${
        resultado ? ". Calificaciones completas; listas para que Posgrado las publique" : ""
      }`,
    );
    return true;
  };

  /** El profesor elige una entrevista con lugar libre y se integra a los profesores entrevistadores. */
  const elegirEntrevista = (a: AspiranteP, profesor: string) => {
    if (MODO_API) return void enServidor(`/aspirantes/${a.id}/entrevista/elegir`, { metodo: "POST" }, "Te integraste a la entrevista");
    const e = a.entrevista;
    if (!e || e.sinodo.includes(profesor) || lugaresLibres(e) === 0) return;
    const nueva = { ...e, sinodo: [...e.sinodo, profesor] };
    const libres = lugaresLibres(nueva);
    actualizar(
      a.id,
      { entrevista: nueva },
      `${nombreProfesor(profesor)} eligió la entrevista del ${fechaCorta(e.fecha)} de ${horarioEntrevista(e)} · profesores entrevistadores ${nueva.sinodo.length} de 3${libres ? "" : " (completo)"}`,
    );
  };

  /** El profesor deja su lugar (solo antes de que se llene el acta). */
  const dejarLugar = (a: AspiranteP, profesor: string) => {
    if (MODO_API) return void enServidor(`/aspirantes/${a.id}/entrevista/dejar`, { metodo: "POST" }, "Dejaste tu lugar en la entrevista");
    const e = a.entrevista;
    if (!e || !e.sinodo.includes(profesor) || a.actaEntrevista) return;
    const nueva = { ...e, sinodo: e.sinodo.filter((p) => p !== profesor) };
    actualizar(a.id, { entrevista: nueva }, `${nombreProfesor(profesor)} dejó su lugar en la entrevista del ${fechaCorta(e.fecha)} de ${horarioEntrevista(e)} · profesores entrevistadores ${nueva.sinodo.length} de 3`);
  };

  return { guardarActa, subirActaFirmada, capturar, elegirEntrevista, dejarLugar };
}
