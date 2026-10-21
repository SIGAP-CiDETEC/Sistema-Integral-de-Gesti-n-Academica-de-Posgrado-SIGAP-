import { convocatoriaActual } from "./config";
import { docenteDe, type Materia } from "./evaluacion";
import { AREAS_EVAL, nombreProfesor, type AreaEvalId, type AspiranteP } from "./posgrado/datos";
import { calificacionesPropedeutico } from "./reporte-aspirantes";

/**
 * SIP-12 · Acta grupal de evaluación de cursos propedéuticos.
 * Flujo: el sistema la genera con las calificaciones del grupo → el docente la imprime, la firma y la sube
 * (se le envía un correo de confirmación) → el Coordinador del programa la firma y sube la versión firmada.
 * SOLO CASCARÓN: los archivos solo guardan su nombre. Con backend: POST /actas-sip12/:clave/firmada.
 */

/** Clave oficial de cada curso propedéutico (de los formatos SIP-12 de CIDETEC). */
export const CLAVE_CURSO: Record<AreaEvalId, string> = { matematicas: "CPRO-017-23", programacion: "CPRO-048-24" };
export const COORDINADOR_PROGRAMA = "Dr. Mario Aldape Pérez";
export const DIRECTOR_CENTRO = "Dr. Mario Aldape Pérez";
/** Semestre al que corresponde el propedéutico (la convocatoria vigente, p. ej. A-27). */
export const SEMESTRE_ACTA = convocatoriaActual.nombre.split(" ").pop() ?? "";

export type ArchivoActa = { archivo: string; el: string; por: string };
/** Lo que ya pasó con el acta de un grupo. */
export type ActaSip12 = {
  /** PDF firmado por el docente */
  docente?: ArchivoActa & { correo: string };
  /** PDF con la firma del Coordinador del programa */
  coordinador?: ArchivoActa;
};

export type EstadoSip12 = "Calificaciones pendientes" | "Por firmar (docente)" | "Por firmar (Coordinador)" | "Firmada";
export const TONO_SIP12: Record<EstadoSip12, string> = {
  "Calificaciones pendientes": "bg-gray-100 text-gray-600",
  "Por firmar (docente)": "bg-indigo-50 text-primary",
  "Por firmar (Coordinador)": "bg-amber-50 text-amber-800",
  Firmada: "bg-emerald-50 text-emerald-700",
};

export const claveActa = (materia: string, grupo: string) => `${materia}-${grupo}`;

export type FilaSip12 = { a: AspiranteP; calificacion?: number };
export type GrupoSip12 = {
  clave: string;
  materia: AreaEvalId;
  nombreCurso: string;
  grupo: string;
  docente?: string;
  filas: FilaSip12[];
  completa: boolean;
};

/** Grupos del propedéutico (Matemáticas y Programación) con sus inscritos y la calificación de cada uno. */
export function gruposSip12(aspirantes: AspiranteP[], materias: Materia[]): GrupoSip12[] {
  return AREAS_EVAL.flatMap(({ id, nombre }) => {
    const materia = materias.find((m) => m.id === id);
    return (materia?.grupos ?? []).map((g) => {
      const filas = aspirantes
        .filter((a) => a.evaluacion.modalidad === "propedeutico" && a.evaluacion.grupos[id] === g.id)
        .sort((x, y) => x.nombre.localeCompare(y.nombre, "es"))
        .map((a) => ({ a, calificacion: calificacionesPropedeutico(a)[id] }));
      return {
        clave: claveActa(id, g.id),
        materia: id,
        nombreCurso: nombre,
        grupo: g.id,
        docente: docenteDe(id, g.id, materias),
        filas,
        completa: filas.length > 0 && filas.every((f) => f.calificacion !== undefined),
      };
    });
  });
}

export function estadoSip12(g: GrupoSip12, acta?: ActaSip12): EstadoSip12 {
  if (acta?.coordinador) return "Firmada";
  if (acta?.docente) return "Por firmar (Coordinador)";
  return g.completa ? "Por firmar (docente)" : "Calificaciones pendientes";
}

export const nombreDocente = (g: GrupoSip12) => (g.docente ? nombreProfesor(g.docente) : "Sin docente asignado");

const UNIDADES = ["CERO", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE", "DIEZ"];
/** Calificación con letra, como se escribe en las actas: 8 → "OCHO", 8.5 → "OCHO PUNTO CINCO". */
export function calificacionEnLetra(n?: number): string {
  if (n === undefined || !Number.isFinite(n)) return "";
  const r = Math.round(n * 10) / 10;
  const entero = Math.trunc(r);
  const decimal = Math.round((r - entero) * 10);
  return decimal ? `${UNIDADES[entero]} PUNTO ${UNIDADES[decimal]}` : UNIDADES[entero];
}
export const calificacionNumero = (n?: number) => (n === undefined ? "" : Number.isInteger(n) ? String(n) : n.toFixed(1));
