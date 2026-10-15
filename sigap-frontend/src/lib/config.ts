/**
 * Datos de ejemplo (mock) del cascarón.
 * Cuando exista el backend en NestJS, estos valores vendrán de la API
 * (p. ej. GET /convocatorias/activa).
 */

export const PERIODO_ESCOLAR = "2025-A";

/** Programa único ofertado en la convocatoria de admisión. */
export const PROGRAMA = "Maestría en Tecnología de Cómputo";

/**
 * Áreas de CIDETEC que intervienen en la admisión.
 * - Departamento de Posgrado: registro, validación de documentos, entrevistas, evaluación, comisión.
 * - UTEyCV (Unidad de Tecnología Educativa y Campus Virtual): Control Escolar — inscripción de los admitidos
 *   (SIP-01, SIP-04, SIP-05, SIP-06 y SIP-08). El proceso de admisión termina con la resolución del Colegio.
 * - La constancia de inglés la valida solo el Departamento de Posgrado.
 */
export const AREAS = {
  posgrado: { corto: "Posgrado", nombre: "Departamento de Posgrado" },
  uteycv: { corto: "UTEyCV", nombre: "Control Escolar (UTEyCV)" },
  profesores: { corto: "Profesores", nombre: "Profesores del Colegio (sínodo y evaluación)" },
} as const;
export type Area = keyof typeof AREAS;

/** Correo de contacto del Departamento de Posgrado. */
export const CORREO_POSGRADO = "posgrado.cidetec@ipn.mx";

/** Correo de Control Escolar (UTEyCV). GENÉRICO: reemplazar por el oficial cuando se conozca. */
export const CORREO_UTEYCV = "uteycv.cidetec@ipn.mx";

/** Correo del área que recibe/emite un formato, según su destino. */
export const correoDeArea = (destino: string) => (destino.includes("UTEyCV") ? CORREO_UTEYCV : CORREO_POSGRADO);

export type Convocatoria = {
  nombre: string;
  programas: string;
  activa: boolean;
  inicio: string;
  cierre: string;
  requisitos: string[];
};

/** Datos fijos de las dos convocatorias por ciclo: A (enero–junio) y B (agosto–diciembre). */
export type IdConvocatoria = "A" | "B";
export const CONVOCATORIAS_INFO: Record<IdConvocatoria, { periodo: string; semestre: string }> = {
  A: {
    periodo: "Enero – junio 2027",
    semestre: "A27 (enero – junio 2027)",
  },
  B: {
    periodo: "Agosto – diciembre 2027",
    semestre: "B27 (agosto – diciembre 2027)",
  },
};

export const convocatoriaActual: Convocatoria = {
  nombre: "Convocatoria de admisión A-27",
  programas: PROGRAMA,
  activa: true,
  inicio: "12 ene",
  cierre: "27 feb 2026",
  requisitos: [
    "Título (deseable)",
    "CURP (no mayor a 3 meses)",
    "INE",
    "Acta de nacimiento",
    "Certificado total de estudios",
    "Inglés B1 (2 habilidades)",
  ],
};

