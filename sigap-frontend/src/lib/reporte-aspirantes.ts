import { AREAS_EVAL, bandejaDe, type AreaEvalId, type AspiranteP, type ResolucionColegio } from "./posgrado/datos";
import { faseSubdireccion, nombreFase } from "./subdireccion";
import { descargarCsv, fechaArchivo, type CeldaCsv } from "./csv";

/** Dictamen final del proceso de admisión (resolución del Colegio de Profesores). */
export type DictamenFinal = "Favorable" | "Condicionado" | "No favorable";
export const DICTAMEN_FINAL: Record<ResolucionColegio, DictamenFinal> = {
  Aceptado: "Favorable",
  Condicionado: "Condicionado",
  "No aceptado": "No favorable",
};
export const TONO_DICTAMEN: Record<DictamenFinal, string> = {
  Favorable: "bg-emerald-50 text-emerald-700",
  Condicionado: "bg-amber-50 text-amber-800",
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

/** Calificación del examen de admisión (o de las áreas no acreditadas) por área y promedio. */
export function calificacionesExamen(a: AspiranteP): Partial<Record<AreaEvalId, number>> & { promedio?: number } {
  const e = a.evaluacion;
  const out: Partial<Record<AreaEvalId, number>> & { promedio?: number } = {};
  for (const { id } of AREAS_EVAL) {
    const v = e.examen?.areas?.[id]?.calificacion ?? e.capturas?.examen?.[id]?.calificacion;
    if (v !== undefined) out[id] = v;
  }
  if (e.examen) out.promedio = e.examen.calificacion;
  return out;
}

const ENCABEZADOS = [
  "ID temporal",
  "Número de registro (SICEP)",
  "Nombre",
  "CURP",
  "Correo",
  "Teléfono",
  "Institución de procedencia",
  "Unidad académica / escuela",
  "Egresado(a) del IPN",
  "Promedio de licenciatura",
  "Fecha de registro",
  "Fase",
  "Estado",
  "Entrevista colegiada",
  "Modalidad de evaluación",
  ...AREAS_EVAL.map((x) => `Propedéutico: ${x.nombre}`),
  "Promedio de los 2 cursos propedéuticos",
  "Calificación del examen",
  "Dictamen",
  "Motivo de conclusión",
];

export function filaReporte(a: AspiranteP): CeldaCsv[] {
  const { institucion, unidad } = procedenciaSeparada(a.procedencia);
  const prope = calificacionesPropedeutico(a);
  const examen = calificacionesExamen(a);
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
    a.registradoEl.slice(0, 10),
    nombreFase(faseSubdireccion(a)),
    bandejaDe(a),
    a.dictamen?.resolucion ?? "",
    a.evaluacion.modalidad === "propedeutico" ? "Propedéutico" : a.evaluacion.modalidad === "examen" ? "Examen" : "",
    ...AREAS_EVAL.map((x) => prope[x.id] ?? ""),
    prope.promedio ?? "",
    examen.promedio ?? "",
    dictamenFinal(a) ?? "",
    a.concluido ?? "",
  ];
}

/** Descarga el CSV de aspirantes (lo usan Subdirección Académica y el Departamento de Posgrado). */
export function descargarReporteAspirantes(lista: AspiranteP[]) {
  const orden = [...lista].sort((a, b) => a.registradoEl.localeCompare(b.registradoEl));
  descargarCsv(`Aspirantes_SIGAP_${fechaArchivo()}.csv`, ENCABEZADOS, orden.map(filaReporte));
}
