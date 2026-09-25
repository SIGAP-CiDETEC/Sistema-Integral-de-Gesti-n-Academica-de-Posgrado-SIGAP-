"use client";

import { ETAPAS, indiceEtapa, type Aviso, type SolicitudAdmision } from "@/lib/admision";
import { PROGRAMA } from "@/lib/config";
import { documentosDeFase, esRequerido } from "@/lib/documentos";
import { useConfigEvaluacion } from "@/lib/evaluacion-config";
import { useEstadoAdmision, useRevisionDocs } from "@/lib/posgrado/revision";
import { useExpediente } from "./ExpedienteProvider";
import { VistaAdmision } from "./VistaAdmision";

const fecha = (f: string) => new Date(`${f}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short" });

/** Estado real de la solicitud del aspirante, a partir de lo que registró el personal (RF-13). */
export function MiAdmisionVivo() {
  const v = useEstadoAdmision();
  const revision = useRevisionDocs();
  const { registro, documentos, evaluacion, capturas, cargado } = useExpediente();
  const { modalidades } = useConfigEvaluacion();
  if (!cargado) return null;

  const requeridos = documentosDeFase("documentos", registro).filter((d) => esRequerido(d, registro));
  const aprobados = requeridos.filter((d) => revision[d.id]?.estado === "aprobado").length;
  const subidos = requeridos.filter((d) => documentos[d.id]).length;
  const observados = requeridos.filter((d) => revision[d.id]?.estado === "observado" && documentos[d.id]);
  const prorrogas = requeridos.filter((d) => revision[d.id]?.estado === "prorroga");

  const etapa = !v.hayDatos && subidos < requeridos.length ? "registro" : v.etapa;
  const acreditada = !!(v.evaluacion.examen?.acreditado || v.evaluacion.propedeutico?.acreditado);
  const avisos: Aviso[] = [];
  if (observados.length) avisos.push({ tipo: "alerta", titulo: "Documentos con observaciones", texto: observados.map((d) => `${d.nombre}: ${revision[d.id].observacion ?? "revísalo"}`).join(" · ") });
  prorrogas.forEach((d) => avisos.push({ tipo: "info", titulo: `Prórroga: ${d.nombre}`, texto: `Puedes continuar tu proceso; entrégalo antes del ${fecha(revision[d.id].prorrogaHasta!)}.` }));
  if (v.entrevista && !v.resultadoEntrevista)
    avisos.push({ tipo: "info", titulo: "Entrevista programada", texto: `${fecha(v.entrevista.fecha)}, ${v.entrevista.hora} h · ${v.entrevista.sala}.` });
  if (v.resultadoEntrevista && v.resultadoEntrevista !== "Rechazado") avisos.push({ tipo: "exito", titulo: "Entrevista aprobada", texto: "Ya puedes elegir tu modalidad de evaluación." });
  if (v.evaluacion.propedeutico && !v.evaluacion.propedeutico.acreditado && !v.evaluacion.examen)
    avisos.push({ tipo: "alerta", titulo: "Segunda oportunidad", texto: `Puedes presentar el examen de admisión el ${modalidades.examen.fechas} (RN-08).` });
  if (acreditada) avisos.push({ tipo: "exito", titulo: "Evaluación acreditada", texto: "Tu resultado pasa a la Comisión de Admisión del Colegio de Profesores." });
  if (v.resolucion && v.resolucion !== "No aceptado") avisos.push({ tipo: "exito", titulo: "¡Fuiste admitido!", texto: "Control Escolar (UTEyCV) prepara tu dictamen SIP-04 y tu inscripción." });
  if (!avisos.length) avisos.push({ tipo: "info", titulo: "Sin novedades", texto: "Te avisaremos por correo y aquí cuando haya cambios en tu solicitud." });

  const proxima: SolicitudAdmision["proximaActividad"] =
    v.entrevista && !v.resultadoEntrevista
      ? { fecha: fecha(v.entrevista.fecha), descripcion: "Entrevista colegiada" }
      : etapa === "evaluacion" && evaluacion.modalidad
        ? { fecha: modalidades[evaluacion.modalidad].fechas.split(" al ")[0].replace(/ de 20\d\d$/, ""), descripcion: modalidades[evaluacion.modalidad].titulo }
        : null;

  const siguiente: Record<string, SolicitudAdmision["siguientePaso"]> = {
    registro: { titulo: "Sube tus documentos", texto: "Carga tus documentos obligatorios en PDF.", href: "/aspirante/documentos", accion: "Ir a documentos" },
    documentos: observados.length
      ? { titulo: "Atiende las observaciones", texto: "Reemplaza los documentos observados.", href: "/aspirante/documentos", accion: "Ver observaciones" }
      : null,
    entrevista: { titulo: "Prepárate para tu entrevista", texto: "Consulta tu cita y llena tus datos del acta.", href: "/aspirante/entrevista", accion: "Ver entrevista" },
    evaluacion: evaluacion.confirmadaEl ? null : { titulo: "Elige tu modalidad de evaluación", texto: "Curso propedéutico o examen de admisión.", href: "/aspirante/evaluacion", accion: "Elegir modalidad" },
    dictamen: { titulo: "Revisa tu dictamen", texto: "Confirma tus datos del SIP-04.", href: "/aspirante/formatos/sip-04", accion: "Revisar SIP-04" },
    matricula: { titulo: "Completa tu matrícula", texto: "Sube tu foto, tu SIP-01 y tu programa individual.", href: "/aspirante/matricula", accion: "Ir a matrícula" },
  };

  const solicitud: SolicitudAdmision = {
    idTemporal: "ASP-2026-001",
    programa: PROGRAMA,
    etapa,
    modalidad: evaluacion.modalidad ? modalidades[evaluacion.modalidad].titulo : "Por definir",
    documentos: { validados: aprobados, total: requeridos.length },
    proximaActividad: v.concluido ? null : proxima,
    avisos: v.concluido ? [{ tipo: "info", titulo: "Proceso concluido", texto: "Revisa tus notificaciones. Gracias por tu interés en el programa." }] : avisos,
    siguientePaso: v.concluido ? null : siguiente[etapa],
  };
  const dedicacion = capturas.estatus === "Tiempo completo" || capturas.estatus === "Tiempo parcial" ? String(capturas.estatus) : "";
  // RF-21 / RF-68: al aprobar la evaluación pasa de Aspirante a Admitido (tiempo completo o parcial)
  const tipo = acreditada && v.resolucion !== "No aceptado" ? `Admitido${dedicacion ? ` (${dedicacion.toLowerCase()})` : ""}` : "Aspirante";

  return <VistaAdmision solicitud={solicitud} estado={v.concluido ? "Proceso concluido" : ETAPAS[indiceEtapa(etapa)].estado} tipoAlumno={tipo} />;
}
