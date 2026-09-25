import { PROGRAMA_INDIVIDUAL_DEMO } from "./programa-individual";

/**
 * Datos del alumno inscrito — EJEMPLO (solo cascarón).
 * Con backend: GET /alumnos/me, /alumnos/me/horario, /alumnos/me/tesis.
 * Nombres de profesores, horarios y salones NO son reales.
 */

export const ALUMNO_DEMO = {
  semestre: 1,
  periodoActual: "B26 (agosto 2026 – enero 2027)",
  dedicacion: "Tiempo completo",
};

export const REINSCRIPCION = {
  periodo: "A27 (febrero – julio 2027)",
  abre: "18 de enero de 2027",
  cierra: "22 de enero de 2027",
  inicioClases: "1 de febrero de 2027",
  estado: "proxima" as "proxima" | "abierta" | "cerrada",
  requisitos: [
    "Haber aprobado las unidades de aprendizaje del periodo actual (sin adeudos).",
    "Solicitud de reinscripción SIP-10 con las materias del siguiente periodo, firmada por ti y por tu asesor (RF-70).",
    "Reporte de actividades del semestre avalado por tu asesor o director de tesis.",
    "Si tienes beca SECIHTI: mantener promedio mínimo de 8.0 y dedicación de tiempo completo.",
  ],
  pasos: [
    { titulo: "Revisa tus calificaciones", texto: "Cuando el profesor asiente las actas, confirma que todo esté aprobado." },
    { titulo: "Acuerda tus materias con tu asesor", texto: "Se toman de tu programa individual (SIP-08), periodo B." },
    { titulo: "Llena y firma tu SIP-10", texto: "El sistema lo llenará con tus datos; lo imprimes, firmas y subes." },
    { titulo: "UTEyCV valida tu reinscripción", texto: "Recibirás tu confirmación y tu nuevo horario." },
  ],
  fechas: [
    { fecha: "11 dic 2026", evento: "Fin de clases del periodo B26" },
    { fecha: "15 dic 2026", evento: "Límite para asentar calificaciones" },
    { fecha: "18–22 ene 2027", evento: "Reinscripción al periodo A27" },
    { fecha: "1 feb 2027", evento: "Inicio de clases" },
  ],
};

export type Profesor = { id: string; nombre: string; correo: string; cubiculo: string; asesorias: string };

export const PROFESORES: Profesor[] = [
  { id: "rm", nombre: "Dr. Ricardo Morales Vega", correo: "rmorales@ipn.mx", cubiculo: "Edificio A, cubículo 12", asesorias: "Martes 13:00–14:00" },
  { id: "ac", nombre: "Dra. Adriana Castillo Ramos", correo: "acastillo@ipn.mx", cubiculo: "Laboratorio de Cómputo Paralelo", asesorias: "Jueves 12:00–13:00" },
  { id: "lh", nombre: "Dra. Laura Hernández Ruiz", correo: "lhernandez@ipn.mx", cubiculo: "Edificio B, cubículo 4", asesorias: "Viernes 11:00–12:00" },
];

export const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] as const;
export type Dia = (typeof DIAS)[number];

export type Clase = { dia: Dia; inicio: string; fin: string; salon: string };

/** Materias del periodo actual: las del periodo A del programa individual (SIP-08). */
const CLASES: Record<string, { profesor: string; grupo: string; clases: Clase[] }> = {
  "MTC-0101": {
    profesor: "rm",
    grupo: "1MTC1",
    clases: [
      { dia: "Lunes", inicio: "09:00", fin: "11:00", salon: "Aula 3" },
      { dia: "Miércoles", inicio: "09:00", fin: "11:00", salon: "Aula 3" },
    ],
  },
  "MTC-0102": {
    profesor: "ac",
    grupo: "1MTC1",
    clases: [
      { dia: "Martes", inicio: "10:00", fin: "12:00", salon: "Lab. Cómputo" },
      { dia: "Jueves", inicio: "10:00", fin: "12:00", salon: "Lab. Cómputo" },
    ],
  },
  "MTC-0103": {
    profesor: "lh",
    grupo: "1MTC1",
    clases: [{ dia: "Viernes", inicio: "09:00", fin: "11:00", salon: "Auditorio" }],
  },
};

export const MATERIAS_ACTUALES = PROGRAMA_INDIVIDUAL_DEMO.materias
  .filter((m) => m.periodo === "A")
  .map((m) => ({ ...m, ...CLASES[m.clave], profesor: PROFESORES.find((p) => p.id === CLASES[m.clave]?.profesor) }));

export const TESIS = {
  tema: "Planificación de tareas en arquitecturas heterogéneas CPU-GPU para procesamiento de datos a gran escala",
  estado: "Propuesta" as "Propuesta" | "Registrado",
  nota: "Se registra formalmente con el MTC-01 y el SIP-13 (registro de tema y director/es) ante el Colegio de Profesores.",
  directores: [
    {
      rol: "Director de tesis",
      nombre: "Dra. Adriana Castillo Ramos",
      correo: "acastillo@ipn.mx",
      linea: "Procesamiento paralelo",
      adscripcion: "CIDETEC-IPN",
    },
    {
      rol: "Codirector de tesis",
      nombre: "Dr. Ricardo Morales Vega",
      correo: "rmorales@ipn.mx",
      linea: "Computación inteligente",
      adscripcion: "CIDETEC-IPN",
    },
  ],
  comite: [
    { nombre: "Dra. Adriana Castillo Ramos", papel: "Directora" },
    { nombre: "Dr. Ricardo Morales Vega", papel: "Codirector" },
    { nombre: "Dra. Laura Hernández Ruiz", papel: "Asesora académica" },
    { nombre: "Dr. Jorge Salinas Ortega", papel: "Integrante" },
    { nombre: "Dr. Ernesto Ríos Mendoza", papel: "Integrante externo (ESCOM)" },
  ],
  hitos: [
    { titulo: "Asignación de director(es)", hecho: true },
    { titulo: "Registro de tema de tesis (MTC-01 / SIP-13)", hecho: false },
    { titulo: "Registro de comité tutorial (SIP-19)", hecho: false },
    { titulo: "Defensa de protocolo (MTC-02)", hecho: false },
  ],
};
