import { AREAS_EVAL, MINIMA_AREA, bandejaDe, horaFin, nombreProfesor, pasoEntrevista, type AreaEvalId, type AspiranteP, type DocAspirante, type ResolucionColegio } from "./posgrado/datos";
import { faseSubdireccion, nombreFase } from "./subdireccion";
import { descargarCsv, fechaArchivo, type CeldaCsv } from "./csv";
import type { Respuestas } from "./registro-form";

/** Dictamen final del proceso de admisión (resolución del Colegio de Profesores). */
export type DictamenFinal = "Aceptado" | "Condicionado" | "No aceptado";
export const DICTAMEN_FINAL: Record<ResolucionColegio, DictamenFinal> = {
  Aceptado: "Aceptado",
  "Con reservas": "Condicionado",
  "No aceptado": "No aceptado",
};
/** Texto del dictamen tal como aparece en los "Resultados finales del proceso de admisión" de CIDETEC. */
export const TEXTO_DICTAMEN_FINAL: Record<ResolucionColegio, string> = {
  Aceptado: "Aceptado.",
  "Con reservas": "Condicionado al cumplimiento documental para proceder a su aceptación.",
  "No aceptado": "No aceptado. Invitado a participar en los siguientes procesos de Admisión.",
};
export const TONO_DICTAMEN: Record<DictamenFinal, string> = {
  Aceptado: "bg-emerald-50 text-emerald-700",
  Condicionado: "bg-amber-50 text-amber-800",
  "No aceptado": "bg-red-50 text-red-700",
};
export const dictamenFinal = (a: AspiranteP): DictamenFinal | undefined => (a.resolucion ? DICTAMEN_FINAL[a.resolucion] : undefined);

/**
 * Separa la procedencia en institución y unidad académica / escuela.
 * "IPN — ESCOM" → IPN · ESCOM; "UAM Azcapotzalco" → UAM · Unidad Azcapotzalco; "BUAP" → BUAP · —.
 * Con backend vienen como dos campos del registro (institución y unidad).
 */
export function procedenciaSeparada(p: string): { institucion: string; unidad: string } {
  const [inst, ...resto] = p.split(" — ");
  if (resto.length) return { institucion: inst.trim(), unidad: resto.join(" — ").trim() };
  const uam = /^UAM\s+(.+)$/.exec(p.trim());
  if (uam) return { institucion: "UAM", unidad: `Unidad ${uam[1]}` };
  return { institucion: p.trim(), unidad: "" };
}

const num = (s?: string) => {
  const n = Number(s);
  return s && !Number.isNaN(n) ? n : s;
};
const redondear = (n: number) => Math.round(n * 100) / 100;

/**
 * Calificación de cada curso propedéutico (Matemáticas Discretas y Continuas y Programación) y su promedio.
 * Toma el resultado integrado o, si aún no se integra, lo que ya capturó cada docente.
 */
export function calificacionesPropedeutico(a: AspiranteP): Partial<Record<AreaEvalId, number>> & { promedio?: number } {
  const e = a.evaluacion;
  const out: Partial<Record<AreaEvalId, number>> & { promedio?: number } = {};
  for (const { id } of AREAS_EVAL) {
    const v = e.propedeutico?.areas?.[id]?.calificacion ?? e.capturas?.propedeutico?.[id]?.calificacion;
    if (v !== undefined) out[id] = v;
  }
  const vals = AREAS_EVAL.map(({ id }) => out[id]).filter((v): v is number => v !== undefined);
  if (vals.length === AREAS_EVAL.length) out.promedio = redondear(vals.reduce((t, v) => t + v, 0) / vals.length);
  return out;
}

/** Calificación del examen de admisión (o de las áreas no acreditadas) por área y su promedio. */
export function calificacionesExamen(a: AspiranteP): Partial<Record<AreaEvalId, number>> & { promedio?: number } {
  const e = a.evaluacion;
  const out: Partial<Record<AreaEvalId, number>> & { promedio?: number } = {};
  for (const { id } of AREAS_EVAL) {
    const v = e.examen?.areas?.[id]?.calificacion ?? e.capturas?.examen?.[id]?.calificacion;
    if (v !== undefined) out[id] = v;
  }
  const vals = AREAS_EVAL.map(({ id }) => out[id]).filter((v): v is number => v !== undefined);
  if (vals.length) out.promedio = redondear(vals.reduce((t, v) => t + v, 0) / vals.length);
  else if (e.examen) out.promedio = e.examen.calificacion;
  return out;
}

/**
 * Conserva las áreas aprobadas en propedéutico y sustituye únicamente las reprobadas por el examen.
 * Si reprobó ambas, usa las dos notas del examen; si solo presentó examen, usa su promedio.
 * No calcula un promedio final mientras falte una nota necesaria.
 */
export function promedioFinal(a: AspiranteP): number | undefined {
  const p = calificacionesPropedeutico(a);
  const x = calificacionesExamen(a);
  if (!a.evaluacion.modalidad) return undefined;
  const soloExamen = a.evaluacion.modalidad === "examen";
  const vals = AREAS_EVAL.map(({ id }) => {
    if (soloExamen) return x[id];
    const curso = p[id];
    if (curso === undefined) return undefined;
    return curso >= MINIMA_AREA ? curso : x[id];
  });
  if (vals.some((v) => v === undefined || !Number.isFinite(v))) {
    // Compatibilidad con registros anteriores que solo guardaban el resultado global.
    const global = soloExamen ? a.evaluacion.examen : a.evaluacion.propedeutico;
    const sinNotas = AREAS_EVAL.every(({ id }) => (soloExamen ? x[id] : p[id]) === undefined);
    if (sinNotas && global && !global.areas && (soloExamen || global.acreditado)) return global.calificacion;
    return undefined;
  }
  return redondear((vals as number[]).reduce((t, v) => t + v, 0) / vals.length);
}

/** Fechas y horas institucionales en columnas distintas; una fecha sin hora conserva la hora vacía. */
export function fechaHoraReporte(valor?: string): { fecha: string; hora: string } {
  if (!valor) return { fecha: "", hora: "" };
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return { fecha: valor, hora: "" };
  const local = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(valor);
  if (local) return { fecha: local[1], hora: local[2] };
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return { fecha: "", hora: "" };
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(fecha);
  const parte = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  return { fecha: `${parte("year")}-${parte("month")}-${parte("day")}`, hora: `${parte("hour")}:${parte("minute")}` };
}

/** Columnas de documentos del expediente (los ids cambian entre los de ejemplo y el aspirante en vivo). */
const DOCS_REPORTE: { col: string; ids: string[] }[] = [
  { col: "Título de licenciatura", ids: ["titulo", "constancia-titulacion"] },
  { col: "Certificado de estudios", ids: ["certificado"] },
  { col: "Constancia de inglés", ids: ["ingles"] },
  { col: "CURP", ids: ["curp"] },
  { col: "Acta de nacimiento", ids: ["acta", "acta-nacimiento"] },
  { col: "Identificación oficial", ids: ["identificacion"] },
  { col: "Documentos extranjeros apostillados", ids: ["extranjero"] },
];

/** Estado de un documento para el reporte: quién tiene la siguiente acción. */
export function estadoDocumentoReporte(d?: DocAspirante): string {
  if (!d) return "No aplica";
  switch (d.estado) {
    case "falta":
      return d.opcional ? "No subido (opcional)" : "No subido";
    case "pendiente":
      return d.resubido ? "Resubido · pendiente de validación" : "Subido · pendiente de validación";
    case "aprobado":
      return "Validado por Posgrado";
    case "observado":
      return `Con observación${d.observacion ? `: ${d.observacion}` : ""}`;
    case "prorroga":
      return `En prórroga hasta ${d.prorrogaHasta ?? "—"}${d.archivo ? " · subido, pendiente de validación" : ""}`;
  }
}

const ORDEN_ETAPA = ["registro", "documentos", "entrevista", "evaluacion", "dictamen"];
const paso = (a: AspiranteP, etapa: string) => ORDEN_ETAPA.indexOf(a.etapa) > ORDEN_ETAPA.indexOf(etapa);

const ENCABEZADOS = [
  // Datos del aspirante
  "ID temporal",
  "Número de registro (SICEP)",
  "Nombre(s)",
  "Apellido materno",
  "Apellido paterno",
  "CURP",
  "Correo",
  "Teléfono",
  "Institución de procedencia",
  "Unidad académica / escuela",
  "Carrera de procedencia",
  "Línea de investigación 1 (mayor interés)",
  "Línea de investigación 2",
  "Línea de investigación 3 (menor interés)",
  "Egresado(a) del IPN",
  "Promedio de licenciatura (declarado)",
  "Promedio de licenciatura (validado por Posgrado)",
  "Fecha de registro",
  // 1 · Registro
  "1. Registro",
  "1. Currículum SIP-02",
  // 2 · Documentos
  ...DOCS_REPORTE.map((d) => `2. ${d.col}`),
  "2. Expediente",
  // 3 · Entrevista colegiada
  "3. Día de entrevista",
  "3. Horario de entrevista",
  "3. Modalidad de entrevista",
  "3. Sala o enlace de entrevista",
  "3. Estado de la entrevista",
  "3. Profesores entrevistadores",
  "3. Acta MTC-EC",
  "3. Dictamen de entrevista",
  "3. Motivo de las reservas",
  "¿Solicitará beca SECIHTI?",
  "¿Continuaría sin beca?",
  // 4 · Evaluación
  "4. Modalidad de evaluación",
  ...AREAS_EVAL.map((x) => `4. Grupo de ${x.nombre}`),
  ...AREAS_EVAL.map((x) => `4. Propedéutico: ${x.nombre}`),
  "4. Promedio del propedéutico",
  ...AREAS_EVAL.map((x) => `4. Examen: ${x.nombre}`),
  "4. Promedio del examen",
  "4. Promedio final de la evaluación",
  // 5 · Resultados de la evaluación
  "5. Resultados de la evaluación",
  // 6 · Dictamen final
  "6. Dictamen final",
  "6. Resolución del Colegio",
  "6. Con reservas",
  "6. Motivo de las reservas",
  "6. Día de publicación del resultado",
  "6. Hora de publicación del resultado",
  // Situación actual
  "Fase actual",
  "Estado",
  "Motivo de conclusión",
];

export function filaReporte(a: AspiranteP, registro: Respuestas = {}): CeldaCsv[] {
  const { institucion, unidad } = procedenciaSeparada(a.procedencia);
  const prope = calificacionesPropedeutico(a);
  const examen = calificacionesExamen(a);
  const e = a.entrevista;
  const acta = a.actaEntrevista;
  const ev = a.evaluacion;
  const texto = (id: string, defecto = "") => typeof registro[id] === "string" ? String(registro[id]) : defecto;
  const areas = Array.isArray(registro.areasInteres) ? registro.areasInteres : [];
  const registroFecha = fechaHoraReporte(a.registradoEl);
  const resultadoPublicado = fechaHoraReporte(a.turnadoUteycv);
  const publicada = (r?: { publicadoEl?: string }) => r?.publicadoEl ? "publicado" : "sin publicar";
  const resultados = [ev.propedeutico && `Propedéutico ${publicada(ev.propedeutico)}`, ev.examen && `Examen ${publicada(ev.examen)}`].filter(Boolean).join(" · ");
  return [
    a.id,
    a.uteycv?.sicep ?? "",
    texto("nombre", a.nombre),
    texto("apellidoMaterno"),
    texto("apellidoPaterno"),
    a.curp,
    a.correo,
    a.telefono,
    institucion,
    unidad,
    texto("ultimosEstudios"),
    areas[0] ?? "", areas[1] ?? "", areas[2] ?? "",
    institucion === "IPN" ? "Sí" : "No",
    num(a.promedio),
    num(a.promedioValidado) ?? "",
    registroFecha.fecha,
    a.etapa === "registro" ? "Pendiente" : "Completo",
    a.formatos["sip-02"] ? "Entregado firmado" : "Pendiente",
    ...DOCS_REPORTE.map((col) => estadoDocumentoReporte(a.documentos.find((d) => col.ids.includes(d.id)))),
    paso(a, "documentos") ? "Aprobado" : a.etapa === "documentos" ? "En revisión" : "Pendiente",
    e?.fecha ?? "", e ? `${e.hora} a ${horaFin(e)}` : "", e?.modalidad ?? "", e?.sala ?? "",
    e ? pasoEntrevista(e) : a.etapa === "entrevista" ? "Sin horario" : "",
    e ? e.sinodo.map(nombreProfesor).join("; ") : "",
    acta?.firmada ? `Firmada y subida por ${nombreProfesor(acta.firmada.subidaPor)}` : acta ? `Llenada por ${nombreProfesor(acta.capturadaPor)} · falta subirla firmada` : a.dictamen ? "Registrada" : "",
    a.dictamen?.resolucion ?? "",
    a.dictamen?.resolucion === "Con reservas" ? acta?.motivo || a.dictamen.comentarios : "",
    texto("becaSecihti", acta?.hoja1.becaSecihti ?? ""),
    texto("sinBeca", acta?.hoja1.sinBeca ?? ""),
    ev.modalidad === "propedeutico" ? "Propedéutico" : ev.modalidad === "examen" ? "Examen" : "",
    ...AREAS_EVAL.map((x) => (ev.modalidad === "propedeutico" ? (ev.grupos[x.id] ?? "") : "")),
    ...AREAS_EVAL.map((x) => prope[x.id] ?? ""),
    prope.promedio ?? "",
    ...AREAS_EVAL.map((x) => examen[x.id] ?? ""),
    examen.promedio ?? "",
    promedioFinal(a) ?? "",
    resultados,
    a.resolucion ? TEXTO_DICTAMEN_FINAL[a.resolucion] : "",
    dictamenFinal(a) ?? "",
    a.resolucion ? (a.resolucion === "Con reservas" ? "Sí" : "No") : "",
    a.resolucion === "Con reservas" ? a.motivoReservas ?? "" : "",
    resultadoPublicado.fecha, resultadoPublicado.hora,
    nombreFase(faseSubdireccion(a)),
    bandejaDe(a),
    a.concluido ?? "",
  ];
}

/** Descarga el CSV de aspirantes (lo usan Subdirección Académica y el Departamento de Posgrado). */
export function descargarReporteAspirantes(lista: AspiranteP[], registroDe?: (id: string) => Respuestas) {
  const orden = [...lista].sort((a, b) => a.registradoEl.localeCompare(b.registradoEl));
  descargarCsv(`Aspirantes_SIGAP_${fechaArchivo()}.csv`, ENCABEZADOS, orden.map((a) => filaReporte(a, registroDe?.(a.id))));
}
