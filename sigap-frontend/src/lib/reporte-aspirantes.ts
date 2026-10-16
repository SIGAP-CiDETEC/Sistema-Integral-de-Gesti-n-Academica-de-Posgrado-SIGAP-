import { AREAS_EVAL, bandejaDe, nombreProfesor, pasoEntrevista, type AreaEvalId, type AspiranteP, type DocAspirante, type ResolucionColegio } from "./posgrado/datos";
import { faseSubdireccion, nombreFase } from "./subdireccion";
import { descargarCsv, fechaArchivo, type CeldaCsv } from "./csv";

/** Dictamen final del proceso de admisión (resolución del Colegio de Profesores). */
export type DictamenFinal = "Favorable" | "Con reservas" | "No favorable";
export const DICTAMEN_FINAL: Record<ResolucionColegio, DictamenFinal> = {
  Aceptado: "Favorable",
  "Con reservas": "Con reservas",
  "No aceptado": "No favorable",
};
export const TONO_DICTAMEN: Record<DictamenFinal, string> = {
  Favorable: "bg-emerald-50 text-emerald-700",
  "Con reservas": "bg-amber-50 text-amber-800",
  "No favorable": "bg-red-50 text-red-700",
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
  if (e.examen) out.promedio = e.examen.calificacion;
  else if (vals.length) out.promedio = redondear(vals.reduce((t, v) => t + v, 0) / vals.length);
  return out;
}

/**
 * Promedio final de la evaluación: por área, la calificación del examen sustituye a la del propedéutico
 * (segunda oportunidad o solo examen); es el promedio de las 2 áreas resultantes.
 */
export function promedioFinal(a: AspiranteP): number | undefined {
  const p = calificacionesPropedeutico(a);
  const x = calificacionesExamen(a);
  const vals = AREAS_EVAL.map(({ id }) => x[id] ?? p[id]);
  if (vals.some((v) => v === undefined)) return undefined;
  return redondear((vals as number[]).reduce((t, v) => t + v, 0) / vals.length);
}

/** Columnas de documentos del expediente (los ids cambian entre los de ejemplo y el aspirante en vivo). */
const DOCS_REPORTE: { col: string; ids: string[] }[] = [
  { col: "Título de licenciatura", ids: ["titulo", "constancia-titulacion"] },
  { col: "Cédula profesional", ids: ["cedula"] },
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
  "Nombre",
  "CURP",
  "Correo",
  "Teléfono",
  "Institución de procedencia",
  "Unidad académica / escuela",
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
  "3. Horario de entrevista",
  "3. Estado de la entrevista",
  "3. Sínodo",
  "3. Acta MTC-EC",
  "3. Dictamen de entrevista",
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
  "6. Resolución del Colegio",
  "6. Dictamen final",
  "6. Resultado publicado el",
  // Situación actual
  "Fase actual",
  "Estado",
  "Motivo de conclusión",
];

export function filaReporte(a: AspiranteP): CeldaCsv[] {
  const { institucion, unidad } = procedenciaSeparada(a.procedencia);
  const prope = calificacionesPropedeutico(a);
  const examen = calificacionesExamen(a);
  const e = a.entrevista;
  const acta = a.actaEntrevista;
  const ev = a.evaluacion;
  const publicada = (r?: { publicadoEl?: string }) => (r?.publicadoEl ? `publicado ${r.publicadoEl.slice(0, 10)}` : "sin publicar");
  const resultados = [ev.propedeutico && `Propedéutico ${publicada(ev.propedeutico)}`, ev.examen && `Examen ${publicada(ev.examen)}`].filter(Boolean).join(" · ");
  return [
    a.id,
    a.uteycv?.sicep ?? "",
    a.nombre,
    a.curp,
    a.correo,
    a.telefono,
    institucion,
    unidad,
    institucion === "IPN" ? "Sí" : "No",
    num(a.promedio),
    num(a.promedioValidado) ?? "",
    a.registradoEl.slice(0, 10),
    a.etapa === "registro" ? "Pendiente" : "Completo",
    a.formatos["sip-02"] ? "Entregado firmado" : "Pendiente",
    ...DOCS_REPORTE.map((col) => estadoDocumentoReporte(a.documentos.find((d) => col.ids.includes(d.id)))),
    paso(a, "documentos") ? "Aprobado" : a.etapa === "documentos" ? "En revisión" : "Pendiente",
    e ? `${e.fecha} ${e.hora} h · ${e.modalidad} · ${e.sala}` : "",
    e ? pasoEntrevista(e) : a.etapa === "entrevista" ? "Sin horario" : "",
    e ? e.sinodo.map(nombreProfesor).join("; ") : "",
    acta?.firmada ? `Firmada y subida por ${nombreProfesor(acta.firmada.subidaPor)}` : acta ? `Llenada por ${nombreProfesor(acta.capturadaPor)} · falta subirla firmada` : a.dictamen ? "Registrada" : "",
    a.dictamen?.resolucion ?? "",
    ev.modalidad === "propedeutico" ? "Propedéutico" : ev.modalidad === "examen" ? "Examen" : "",
    ...AREAS_EVAL.map((x) => (ev.modalidad === "propedeutico" ? (ev.grupos[x.id] ?? "") : "")),
    ...AREAS_EVAL.map((x) => prope[x.id] ?? ""),
    prope.promedio ?? "",
    ...AREAS_EVAL.map((x) => examen[x.id] ?? ""),
    examen.promedio ?? "",
    promedioFinal(a) ?? "",
    resultados,
    a.resolucion ?? "",
    dictamenFinal(a) ?? "",
    a.turnadoUteycv?.slice(0, 10) ?? "",
    nombreFase(faseSubdireccion(a)),
    bandejaDe(a),
    a.concluido ?? "",
  ];
}

/** Descarga el CSV de aspirantes (lo usan Subdirección Académica y el Departamento de Posgrado). */
export function descargarReporteAspirantes(lista: AspiranteP[]) {
  const orden = [...lista].sort((a, b) => a.registradoEl.localeCompare(b.registradoEl));
  descargarCsv(`Aspirantes_SIGAP_${fechaArchivo()}.csv`, ENCABEZADOS, orden.map(filaReporte));
}
