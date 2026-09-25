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
 * - UTEyCV (Unidad de Tecnología Educativa y Campus Virtual): Control Escolar — SIP-01, 04, 05, 06, 08,
 *   aval del inglés con la DFLE, número SICEP e inscripción (RF-53, Módulo 19).
 */
export const AREAS = {
  posgrado: { corto: "Posgrado", nombre: "Departamento de Posgrado" },
  uteycv: { corto: "UTEyCV", nombre: "Control Escolar (UTEyCV)" },
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
  fechasClave: { etiqueta: string; fecha: string }[];
};

export const convocatoriaActual: Convocatoria = {
  nombre: "Convocatoria de admisión 2026-A",
  programas: PROGRAMA,
  activa: true,
  inicio: "12 ene",
  cierre: "27 feb 2026",
  requisitos: [
    "Título y cédula profesional",
    "Certificado de estudios y CURP",
    "Certificado de inglés con aval DFLE o de CELEX/CENLEX",
    "Promedio mínimo conforme al programa",
  ],
  fechasClave: [
    { etiqueta: "Documentos", fecha: "3 mar" },
    { etiqueta: "Entrevistas", fecha: "16–20 mar" },
    { etiqueta: "Resultados", fecha: "30 abr" },
    { etiqueta: "Matrícula", fecha: "4–8 may" },
  ],
};

/** Tarjetas informativas (RF-08: fechas, instructivos, certificación de idiomas). */
export const recursosAspirante = [
  {
    titulo: "Calendario IPN",
    texto: "Periodos escolares, registro, exámenes y resultados del IPN.",
    accion: "Consultar calendario",
    href: "#",
  },
  {
    titulo: "Convocatorias",
    texto: "Convocatorias vigentes, requisitos y fechas importantes.",
    accion: "Ver convocatorias",
    href: "#convocatoria",
  },
  {
    titulo: "Lugares para liberar el inglés",
    texto: "Centros autorizados para acreditar o liberar el inglés.",
    accion: "Ver centros",
    href: "#",
  },
  {
    titulo: "CELEX / CENLEX",
    texto: "Cursos, sedes, horarios e inscripción disponibles.",
    accion: "Más información",
    href: "#",
  },
];
