"use client";

import { ETAPAS, indiceEtapa, type Aviso, type SolicitudAdmision } from "@/lib/admision";
import { PROGRAMA } from "@/lib/config";
import { documentosDeFase, esRequerido } from "@/lib/documentos";
import { useConfigEvaluacion } from "@/lib/evaluacion-config";
import { areasReprobadas, nombreArea } from "@/lib/posgrado/datos";
import { useEstadoAdmision, useRevisionDocs } from "@/lib/posgrado/revision";
import { useExpediente } from "./ExpedienteProvider";
import { DeshacerConclusion } from "./BloqueoProceso";
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
  // Solo cuentan los resultados que Posgrado ya publicó
  const pro = v.evaluacion.propedeutico?.publicadoEl ? v.evaluacion.propedeutico : undefined;
  const exa = v.evaluacion.examen?.publicadoEl ? v.evaluacion.examen : undefined;
  const acreditada = !!(exa?.acreditado || pro?.acreditado);
  const so = evaluacion.segundaOportunidad;
  // El proceso de admisión termina cuando se publica la resolución del Colegio (6 · Dictamen final)
  const dictamenPublicado = etapa === "dictamen" && !v.concluido && (v.resolucion === "Aceptado" || v.resolucion === "Condicionado");
  const avisos: Aviso[] = [];
  if (observados.length) avisos.push({ tipo: "alerta", titulo: "Documentos con observaciones", texto: observados.map((d) => `${d.nombre}: ${revision[d.id].observacion ?? "revísalo"}`).join(" · ") });
  prorrogas.forEach((d) => avisos.push({ tipo: "info", titulo: `Prórroga: ${d.nombre}`, texto: `Puedes continuar tu proceso; entrégalo antes del ${fecha(revision[d.id].prorrogaHasta!)}.` }));
  if (v.entrevista && !v.resultadoEntrevista)
    avisos.push({ tipo: "info", titulo: "Entrevista programada", texto: `${fecha(v.entrevista.fecha)}, ${v.entrevista.hora} h · ${v.entrevista.sala}.` });
  if (v.resultadoEntrevista && v.resultadoEntrevista !== "Rechazado") avisos.push({ tipo: "exito", titulo: "Entrevista aprobada", texto: "Ya puedes elegir tu modalidad de evaluación." });
  if (pro && !pro.acreditado && !exa && !so)
    avisos.push({ tipo: "alerta", titulo: "Resultados del propedéutico publicados", texto: `No acreditaste ${areasReprobadas(pro).map(nombreArea).join(" y ")}. Indica en 5 · Resultados si presentas el examen de ${areasReprobadas(pro).length > 1 ? "esas áreas" : "esa área"} (${modalidades.examen.fechas}).` });
  if (so?.decision === "examen" && !exa)
    avisos.push({ tipo: "info", titulo: "Examen de áreas no acreditadas", texto: `Presentarás ${so.areas.map(nombreArea).join(" y ")} el ${modalidades.examen.fechas}. Te enviaremos recordatorios.` });
  if (acreditada) avisos.push({ tipo: "exito", titulo: "Evaluación acreditada", texto: "Tu resultado pasa a la Comisión de Admisión del Colegio de Profesores." });
  if (dictamenPublicado)
    avisos.push({ tipo: "exito", titulo: "¡Fuiste admitido(a)!", texto: "Se publicó tu resultado (6 · Dictamen final) y con él concluye tu proceso de admisión. Sigue tu inscripción." });
  if (!avisos.length) avisos.push({ tipo: "info", titulo: "Sin novedades", texto: "Te avisaremos por correo y aquí cuando haya cambios en tu solicitud." });

  const concluido = v.concluido ?? (so?.decision === "no" ? "Decidió no presentar el examen" : undefined);
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
    entrevista: { titulo: "Prepárate para tu entrevista", texto: "Consulta la fecha, hora y lugar de tu cita.", href: "/aspirante/entrevista", accion: "Ver entrevista" },
    evaluacion: !evaluacion.confirmadaEl
      ? { titulo: "Elige tu modalidad de evaluación", texto: "Curso propedéutico o examen de admisión.", href: "/aspirante/evaluacion", accion: "Elegir modalidad" }
      : pro && !pro.acreditado && !so
        ? { titulo: "Decide si presentas el examen", texto: "De las áreas que no acreditaste en el propedéutico.", href: "/aspirante/resultados", accion: "Ver resultados" }
        : { titulo: "Consulta tus resultados", texto: "Se publican al terminar el propedéutico o el examen.", href: "/aspirante/resultados", accion: "Ir a resultados" },
    dictamen: dictamenPublicado
      ? { titulo: "Inicia tu inscripción", texto: "Tu dictamen ya está publicado: integra tu expediente de inscripción.", href: "/aspirante/inscripcion", accion: "Ir a inscripción" }
      : { titulo: "Espera la publicación de tu resultado", texto: "Consulta dónde y cuándo se publica.", href: "/aspirante/dictamen", accion: "Ver publicación" },
  };

  const solicitud: SolicitudAdmision = {
    idTemporal: "ASP-2026-001",
    programa: PROGRAMA,
    etapa,
    modalidad: evaluacion.modalidad ? modalidades[evaluacion.modalidad].titulo : "Por definir",
    documentos: { validados: aprobados, total: requeridos.length },
    proximaActividad: concluido ? null : proxima,
    avisos: concluido ? [{ tipo: "info", titulo: "Proceso concluido", texto: "Revisa tus notificaciones. Gracias por tu interés en el programa." }] : avisos,
    siguientePaso: concluido ? null : siguiente[etapa],
  };
  const dedicacion = capturas.estatus === "Tiempo completo" || capturas.estatus === "Tiempo parcial" ? String(capturas.estatus) : "";
  // RF-21 / RF-68: al aprobar la evaluación pasa de Aspirante a Admitido (tiempo completo o parcial)
  const tipo = acreditada && v.resolucion !== "No aceptado" ? `Admitido${dedicacion ? ` (${dedicacion.toLowerCase()})` : ""}` : "Aspirante";

  return (
    <>
      <VistaAdmision solicitud={solicitud} estado={concluido ? "Proceso concluido" : dictamenPublicado ? "Proceso de admisión concluido" : ETAPAS[indiceEtapa(etapa)].estado} tipoAlumno={tipo} />
      {concluido && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white px-5 pb-4">
          <DeshacerConclusion />
        </div>
      )}
    </>
  );
}
