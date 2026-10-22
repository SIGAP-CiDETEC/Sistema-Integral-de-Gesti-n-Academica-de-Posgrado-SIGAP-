import type { EtapaId } from "../admision";
import type { ModalidadId } from "../evaluacion";

/**
 * Datos del Departamento de Posgrado — EJEMPLO (solo cascarón).
 * Con backend: GET /admision/aspirantes, /profesores?colegiado=true, etc.
 * Los nombres de aspirantes y profesores NO son reales.
 */

/**
 * prorroga = Posgrado le dio más tiempo para entregarlo; el proceso sigue mientras tanto.
 */
export type EstadoDoc = "falta" | "pendiente" | "aprobado" | "observado" | "prorroga";
export type DocAspirante = {
  id: string;
  nombre: string;
  archivo?: string;
  estado: EstadoDoc;
  observacion?: string;
  opcional?: boolean;
  /** Fecha límite (AAAA-MM-DD) cuando tiene prórroga */
  prorrogaHasta?: string;
  /** El aspirante lo volvió a subir después de una observación (queda pendiente de validar otra vez) */
  resubido?: boolean;
};

export type Entrevista = {
  fecha: string; // AAAA-MM-DD
  hora: string;
  modalidad: "Presencial" | "En línea";
  sala: string;
  sinodo: string[]; // ids de profesor
  /** Cuándo Posgrado publicó el horario a los profesores para que lo elijan (vacío = borrador) */
  horarioPublicadoEl?: string;
  /** Cuándo Posgrado publicó la entrevista al aspirante (vacío = el aspirante aún no la ve) */
  notificadaEl: string;
};

export type Resolucion = "Aprobado" | "Con reservas" | "Rechazado";
/** La entrevista colegiada no lleva ponderación: solo Aprobado, Con reservas o Rechazado (RF-12). */
export type DictamenEntrevista = { resolucion: Resolucion; comentarios: string; registradoEl: string };

/** Calificación cualitativa de la hoja de Conclusiones del acta MTC-EC. */
export type Valoracion = "MB" | "B" | "R" | "M" | "NA";
export const VALORACION_TEXTO: Record<Valoracion, string> = { MB: "Muy buena", B: "Buena", R: "Regular", M: "Mala", NA: "No aplica" };
/** Criterios de la hoja 2 del acta MTC-EC (campo del PDF, texto y si admite "No aplica"). */
export const CRITERIOS_ACTA = [
  { id: "formacion", pdf: "formación académica", grupo: "Consideraciones académicas", t: "Congruencia de formación académica" },
  { id: "programa", pdf: "conocimiento programa", grupo: "Consideraciones académicas", t: "Motivación y conocimiento del programa" },
  { id: "experiencia", pdf: "experiencias profesionales", grupo: "Consideraciones laborales", t: "Congruencia de experiencias profesionales", na: true },
  { id: "laborales", pdf: "continuar estudios", grupo: "Consideraciones laborales", t: "Condiciones laborales para continuar los estudios", na: true },
  { id: "personales", pdf: "condiciones personales", grupo: "Consideraciones personales", t: "Condiciones personales (actitudes, anímicas, emocionales)" },
  { id: "familiar", pdf: "entorno familiar", grupo: "Consideraciones personales", t: "Condiciones del entorno familiar" },
] as const;
export type CriterioActa = (typeof CRITERIOS_ACTA)[number]["id"];

/**
 * Acta de entrevista colegiada (MTC-EC) que llenan los profesores entrevistadores en la sesión de Profesor.
 * Hoja 1: lo que responde el aspirante en la entrevista. Hoja 2: conclusiones de los profesores entrevistadores.
 * Funciona como una cola: el primer profesor entrevistador que la llena la bloquea para los demás; todos la descargan,
 * la imprimen y la firman en papel; el primero que sube el PDF firmado por los 3 aplica el dictamen y bloquea la subida.
 */
export type ActaEntrevista = {
  hoja1: {
    areas: string[];
    becaSecihti?: "Sí" | "No";
    sinBeca?: "Sí" | "No";
    profesorInteres?: "Sí" | "No";
    profesorNombre?: string;
    horario?: "Matutino" | "Vespertino" | "Indistinto";
    ingles2?: "Sí" | "No";
    inglesSituacion?: string;
    certificado?: "Sí" | "No";
    certificadoSituacion?: string;
    argumentacion?: string;
  };
  criterios: Partial<Record<CriterioActa, Valoracion>>;
  proyeccion: string;
  observaciones: string;
  resolucion: Resolucion;
  motivo: string;
  capturadaPor: string;
  capturadaEl: string;
  /** Acta impresa y firmada por los 3 profesores entrevistadores que subió uno de ellos (con esto se aplica el dictamen) */
  firmada?: { archivo: string; subidaPor: string; el: string };
  /** Firmas en el sistema de versiones anteriores del cascarón (ya no se usan) */
  firmas?: Record<string, string>;
};
/** La entrevista requiere 3 profesores entrevistadores; los lugares libres los eligen los propios profesores. */
export const LUGARES_SINODO = 3;
export const lugaresLibres = (e?: Entrevista) => (e ? Math.max(0, LUGARES_SINODO - e.sinodo.length) : 0);
export const sinodoCompleto = (e?: Entrevista) => !!e && e.sinodo.length >= LUGARES_SINODO;
/** Paso en que va la entrevista: Posgrado publica el horario → los profesores lo eligen → Posgrado la publica al aspirante. */
export type PasoEntrevista = "Horario sin publicar" | "Esperando profesores" | "Lista para publicar" | "Publicada al aspirante";
export const pasoEntrevista = (e: Entrevista): PasoEntrevista =>
  e.notificadaEl ? "Publicada al aspirante" : !e.horarioPublicadoEl ? "Horario sin publicar" : sinodoCompleto(e) ? "Lista para publicar" : "Esperando profesores";
export const TONO_PASO_ENTREVISTA: Record<PasoEntrevista, string> = {
  "Horario sin publicar": "bg-gray-100 text-gray-700",
  "Esperando profesores": "bg-amber-50 text-amber-800",
  "Lista para publicar": "bg-sky-50 text-sky-800",
  "Publicada al aspirante": "bg-emerald-50 text-emerald-700",
};
/** Estado del acta MTC-EC: sin llenar → llenada (por subir firmada) → firmada (dictamen aplicado). */
export type EstadoActa = "Sin llenar" | "Por subir firmada" | "Firmada";
export const estadoActa = (a: { actaEntrevista?: ActaEntrevista }): EstadoActa =>
  !a.actaEntrevista ? "Sin llenar" : a.actaEntrevista.firmada ? "Firmada" : "Por subir firmada";

/** Áreas que se califican en el propedéutico y en el examen de admisión. */
export type AreaEvalId = "matematicas" | "programacion";
export const AREAS_EVAL: { id: AreaEvalId; nombre: string }[] = [
  { id: "matematicas", nombre: "Matemáticas Discretas y Continuas" },
  { id: "programacion", nombre: "Programación" },
];
export const nombreArea = (id: AreaEvalId) => AREAS_EVAL.find((a) => a.id === id)?.nombre ?? id;
export type ResultadoArea = { calificacion: number; acreditado: boolean };
export type ResultadoEval = {
  /** Promedio de las áreas evaluadas */
  calificacion: number;
  /** true si acreditó TODAS las áreas evaluadas */
  acreditado: boolean;
  registradoEl: string;
  areas?: Partial<Record<AreaEvalId, ResultadoArea>>;
  /** Fecha en que Posgrado publicó el resultado al aspirante (antes no lo ve) */
  publicadoEl?: string;
};
/** Decisión del aspirante que no acreditó una o las dos áreas del propedéutico (RN-08). */
export type SegundaOportunidad = { decision: "examen" | "no"; areas: AreaEvalId[]; el: string };
export type EvaluacionP = {
  modalidad?: ModalidadId;
  grupos: Record<string, string>;
  propedeutico?: ResultadoEval;
  examen?: ResultadoEval;
  segundaOportunidad?: SegundaOportunidad;
  /** Calificaciones que captura cada profesor por área antes de integrar el resultado */
  capturas?: Partial<Record<"propedeutico" | "examen", Partial<Record<AreaEvalId, CapturaArea>>>>;
};
/** el = última captura; primeraEl = primera captura (desde ahí corre la semana para poder corregirla). */
export type CapturaArea = { calificacion: number; por: string; el: string; primeraEl?: string };

/** Días que tiene quien captura para corregir una calificación (desde la primera captura). */
export const DIAS_EDICION_CALIFICACION = 7;
export const limiteEdicion = (c: CapturaArea) => new Date(new Date(c.primeraEl ?? c.el).getTime() + DIAS_EDICION_CALIFICACION * 86_400_000);
/** Se puede corregir hasta una semana después de la primera captura y mientras el resultado no se publique. */
export const puedeEditarCaptura = (c: CapturaArea | undefined, publicado: boolean, ahora = new Date()) => !!c && !publicado && ahora <= limiteEdicion(c);

/** Calificación mínima aprobatoria por área (ejemplo; se configura por convocatoria). */
export const MINIMA_AREA = 8;

/** Qué evaluación falta calificar y de qué áreas (null = nada pendiente de captura). */
export function evaluacionPendiente(e: EvaluacionP): { tipo: "propedeutico" | "examen"; areas: AreaEvalId[]; esSegunda: boolean } | null {
  if (!e.modalidad) return null;
  if (e.modalidad === "propedeutico" && !e.propedeutico) return { tipo: "propedeutico", areas: AREAS_EVAL.map((x) => x.id), esSegunda: false };
  if (e.modalidad === "examen" && !e.examen) return { tipo: "examen", areas: AREAS_EVAL.map((x) => x.id), esSegunda: false };
  if (e.segundaOportunidad?.decision === "examen" && !e.examen) return { tipo: "examen", areas: e.segundaOportunidad.areas, esSegunda: true };
  return null;
}

/**
 * Evaluación cuyas calificaciones se capturan o todavía se pueden corregir: la pendiente o, si ya se integró
 * el resultado, la que aún no publica Posgrado.
 */
export function evaluacionEnCaptura(e: EvaluacionP): { tipo: "propedeutico" | "examen"; areas: AreaEvalId[]; esSegunda: boolean } | null {
  const pend = evaluacionPendiente(e);
  if (pend) return pend;
  if (e.examen && !e.examen.publicadoEl)
    return { tipo: "examen", areas: (Object.keys(e.examen.areas ?? {}) as AreaEvalId[]).filter(Boolean), esSegunda: e.segundaOportunidad?.decision === "examen" };
  if (e.propedeutico && !e.propedeutico.publicadoEl && !e.examen) return { tipo: "propedeutico", areas: AREAS_EVAL.map((x) => x.id), esSegunda: false };
  return null;
}

/** Integra el resultado cuando ya se capturaron todas las áreas pendientes. */
export function integrarResultado(capturas: Partial<Record<AreaEvalId, CapturaArea>>, areas: AreaEvalId[]): ResultadoEval | null {
  if (!areas.every((id) => capturas[id])) return null;
  const vals = areas.map((id) => ({ id, v: capturas[id]!.calificacion }));
  return {
    calificacion: Math.round((vals.reduce((t, x) => t + x.v, 0) / vals.length) * 10) / 10,
    acreditado: vals.every((x) => x.v >= MINIMA_AREA),
    registradoEl: new Date().toISOString(),
    areas: Object.fromEntries(vals.map((x) => [x.id, { calificacion: x.v, acreditado: x.v >= MINIMA_AREA }])) as ResultadoEval["areas"],
  };
}

/** En qué punto va la evaluación de un aspirante (vista de Posgrado). */
export function estadoEvaluacion(e: EvaluacionP): { t: string; tono: string } {
  const so = e.segundaOportunidad;
  if (!e.modalidad) return { t: "Sin elegir", tono: "bg-gray-100 text-gray-600" };
  if (e.examen && !e.examen.publicadoEl) return { t: "Resultados del examen por publicar", tono: "bg-violet-50 text-violet-800" };
  if (e.examen) return { t: e.examen.acreditado ? "Examen acreditado" : "Examen no acreditado", tono: e.examen.acreditado ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700" };
  if (e.modalidad === "examen") return { t: "Presentará examen", tono: "bg-sky-50 text-sky-800" };
  if (!e.propedeutico) return { t: "Cursando propedéutico", tono: "bg-sky-50 text-sky-800" };
  if (!e.propedeutico.publicadoEl) return { t: "Resultados del propedéutico por publicar", tono: "bg-violet-50 text-violet-800" };
  if (e.propedeutico.acreditado) return { t: "Propedéutico acreditado", tono: "bg-emerald-50 text-emerald-700" };
  if (!so) return { t: "Esperando decisión del aspirante", tono: "bg-amber-50 text-amber-800" };
  return so.decision === "examen" ? { t: "Presentará examen de áreas no acreditadas", tono: "bg-amber-50 text-amber-800" } : { t: "Decidió no presentar el examen", tono: "bg-red-50 text-red-700" };
}

/** Áreas no acreditadas de un resultado. */
export const areasReprobadas = (r?: ResultadoEval): AreaEvalId[] =>
  r?.areas ? (Object.entries(r.areas) as [AreaEvalId, ResultadoArea][]).filter(([, x]) => !x.acreditado).map(([k]) => k) : r && !r.acreditado ? AREAS_EVAL.map((a) => a.id) : [];

export type ResolucionColegio = "Aceptado" | "Con reservas" | "No aceptado";

export type Prioridad = "Alta" | "Media" | "Normal";
export type Dedicacion = "Tiempo completo" | "Tiempo parcial";

/**
 * Trabajo de Control Escolar (UTEyCV) sobre el admitido: su inscripción.
 * El proceso de admisión termina con la resolución del Colegio; el SIP-04 lo llena el admitido en su inscripción.
 */
export type UteycvP = {
  // ---- Inscripción (proceso posterior a la admisión; Módulos 6, 7, 8 y 19) ----
  /** SIP-08 que elaboró Control Escolar, publicado para que el admitido lo firme */
  sip08PublicadoEl?: string;
  foto?: boolean;
  sip01Firmado?: boolean;
  sip04Firmado?: boolean;
  sip05Firmado?: boolean;
  sip06Firmado?: boolean;
  sip08Firmado?: boolean;
  /** RF-28: versiones con todas las firmas físicas que carga Control Escolar (por clave de formato) */
  firmadosFinales?: Record<string, { nombre: string; el: string }>;
  /** RF-29: número de registro asignado por SICEP */
  sicep?: string;
  formalizadoEl?: string;
};

/** Fecha ISO de hace n días (para que los ejemplos tengan tiempos de espera realistas). */
/** Aspirante de ejemplo con un documento observado (perfil aparte para mostrar el bloqueo de los demás documentos). */
export const ID_EJEMPLO_OBSERVACION = "ASP-2026-050";
export const OBSERVACION_EJEMPLO = "Falta la segunda hoja del certificado, donde aparece el promedio general. Escanea el certificado completo en un solo PDF.";

const hace = (dias: number) => new Date(Date.now() - dias * 86_400_000).toISOString();
/** Fecha AAAA-MM-DD dentro de n días. */
export const enDias = (dias: number) => {
  const d = new Date(Date.now() + dias * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export type AspiranteP = {
  id: string;
  nombre: string;
  curp: string;
  correo: string;
  telefono: string;
  procedencia: string;
  /** Promedio que declaró el aspirante en su registro */
  promedio: string;
  /** Promedio final de la carrera que captura Posgrado al aprobar el certificado de estudios */
  promedioValidado?: string;
  registradoEl: string;
  /** Último movimiento en su expediente (lo actualiza cualquier acción de Posgrado o del aspirante) */
  ultimoMovimiento: string;
  etapa: EtapaId;
  /** Motivo por el que el proceso terminó sin admisión (RN-05, RN-08) */
  concluido?: string;
  documentos: DocAspirante[];
  entrevista?: Entrevista;
  dictamen?: DictamenEntrevista;
  /** Acta MTC-EC que llenan y firman los profesores entrevistadores (módulo de Profesores) */
  actaEntrevista?: ActaEntrevista;
  evaluacion: EvaluacionP;
  resolucion?: ResolucionColegio;
  motivoReservas?: string;
  /** Fecha en que pasó a inscripción (UTEyCV) al registrarse la resolución del Colegio */
  turnadoUteycv?: string;
  /** Formatos firmados recibidos (SIP-02, SIP-05…) */
  formatos: Record<string, boolean>;
  /** true = es el aspirante que se llenó en este navegador */
  enVivo?: boolean;
  /** Dedicación que ELIGIÓ el admitido al llenar su SIP-04 (RN-10) */
  dedicacion?: Dedicacion;
  /** Lo que registra Control Escolar (UTEyCV) */
  uteycv?: UteycvP;
};

// ---------- Profesores entrevistadores (RN-07: 3 profesores, colegiados vigentes o de asignatura) ----------

export type ProfesorP = { id: string; nombre: string; correo: string; colegiado: boolean; vigencia: string; linea: string };

export const PROFESORES_SINODO: ProfesorP[] = [
  { id: "lh", nombre: "Dra. Laura Hernández Ruiz", correo: "lhernandez@ipn.mx", colegiado: true, vigencia: "2027", linea: "Computación inteligente" },
  { id: "mt", nombre: "Dr. Miguel Torres Díaz", correo: "mtorres@ipn.mx", colegiado: true, vigencia: "2026", linea: "Redes de computadoras" },
  { id: "er", nombre: "Dra. Elena Ruiz Campos", correo: "eruiz@ipn.mx", colegiado: true, vigencia: "2028", linea: "Realidad virtual" },
  { id: "ac", nombre: "Dra. Adriana Castillo Ramos", correo: "acastillo@ipn.mx", colegiado: true, vigencia: "2027", linea: "Procesamiento paralelo" },
  { id: "rm", nombre: "Dr. Ricardo Morales Vega", correo: "rmorales@ipn.mx", colegiado: true, vigencia: "2029", linea: "Computación inteligente" },
  { id: "jp", nombre: "Dr. Jorge Pérez Luna", correo: "jperez@ipn.mx", colegiado: false, vigencia: "Vencida", linea: "Mecatrónica" },
  { id: "js", nombre: "Dr. Jorge Salinas Ortega", correo: "jsalinas@ipn.mx", colegiado: false, vigencia: "Asignatura", linea: "Seguridad informática" },
];

const colegiadoVigente = (p: ProfesorP) => p.colegiado && /^\d{4}$/.test(p.vigencia) && Number(p.vigencia) >= 2026;
/** Pueden participar como profesores entrevistadores los profesores colegiados con nombramiento vigente y los profesores de asignatura (RN-07). */
export const profesorValido = (p: ProfesorP) => colegiadoVigente(p) || p.vigencia === "Asignatura";
export const nombramientoDe = (p: ProfesorP) =>
  colegiadoVigente(p) ? `Colegiado · vigente a ${p.vigencia}` : p.vigencia === "Asignatura" ? "De asignatura" : "Nombramiento vencido";
/** Con el servidor real, la lista de profesores viene de la API (reemplaza a la de ejemplo). */
export function fijarProfesores(lista: ProfesorP[]) {
  PROFESORES_SINODO.splice(0, PROFESORES_SINODO.length, ...lista);
}
export const nombreProfesor = (id: string) => PROFESORES_SINODO.find((p) => p.id === id)?.nombre ?? id;

// ---------- Documentos ----------

const DOCS_BASE: { id: string; nombre: string; opcional?: boolean }[] = [
  { id: "titulo", nombre: "Título de licenciatura" },
  { id: "certificado", nombre: "Certificado de estudios" },
  { id: "ingles", nombre: "Constancia de dominio de inglés" },
  { id: "curp", nombre: "CURP", opcional: true },
  { id: "acta", nombre: "Acta de nacimiento" },
  { id: "identificacion", nombre: "Identificación oficial" },
];

const docs = (estados: Partial<Record<string, EstadoDoc>>, obs: Record<string, string> = {}, prorroga: Record<string, string> = {}, resubidos: string[] = []): DocAspirante[] =>
  DOCS_BASE.map((d) => {
    const estado = estados[d.id] ?? "aprobado";
    return {
      ...d,
      estado,
      archivo: estado === "falta" || estado === "prorroga" ? undefined : `${d.id}.pdf`,
      observacion: obs[d.id],
      prorrogaHasta: prorroga[d.id],
      resubido: resubidos.includes(d.id) || undefined,
    };
  });

const todos = (e: EstadoDoc) => Object.fromEntries(DOCS_BASE.map((d) => [d.id, e]));
const F = (ids: string[]) => Object.fromEntries(ids.map((i) => [i, true]));

const entrevistaDe = (fecha: string, hora: string, sinodo = ["lh", "ac", "rm"]): Entrevista => ({
  fecha,
  hora,
  modalidad: "Presencial",
  sala: "Sala de juntas CIDETEC",
  sinodo,
  horarioPublicadoEl: "2026-03-05T10:00:00",
  notificadaEl: sinodo.length >= 3 ? "2026-03-10T10:00:00" : "",
});

const dictamenDe = (resolucion: Resolucion, comentarios: string): DictamenEntrevista => ({
  resolucion,
  comentarios,
  registradoEl: "2026-03-18T14:00:00",
});

const PROPEDEUTICO_AB = { matematicas: "A", programacion: "A", seminario: "Único" };

/** Aspirantes de ejemplo en distintas etapas. ASP-2026-001 se completa con lo llenado en este navegador. */
export const ASPIRANTES_BASE: AspiranteP[] = [
  {
    id: "ASP-2026-001",
    nombre: "María González López",
    curp: "GOLM980412MDFNPR07",
    correo: "maria.gonzalez@correo.mx",
    telefono: "5512345678",
    procedencia: "IPN — ESCOM",
    promedio: "8.7",
    ultimoMovimiento: hace(0),
    registradoEl: "2026-02-14",
    etapa: "documentos",
    documentos: docs(todos("pendiente")),
    evaluacion: { grupos: {} },
    formatos: {},
    enVivo: true,
  },
  {
    id: "ASP-2026-004",
    nombre: "Ana Martínez Soto",
    curp: "MASA990301MDFRTN02",
    correo: "ana.martinez@correo.mx",
    telefono: "5520001111",
    procedencia: "UNAM — Facultad de Ingeniería",
    promedio: "9.1",
    ultimoMovimiento: hace(6),
    registradoEl: "2026-02-10",
    etapa: "documentos",
    documentos: docs({ certificado: "observado", ingles: "prorroga" }, { certificado: "El reverso no es legible.", ingles: "Aún no tiene constancia CELEX/CENLEX." }, { ingles: enDias(3) }),
    evaluacion: { grupos: {} },
    formatos: F(["sip-02"]),
  },
  {
    id: "ASP-2026-009",
    nombre: "Luis Ortega Paredes",
    curp: "OEPL970715HMCRRS05",
    correo: "luis.ortega@correo.mx",
    telefono: "5530002222",
    procedencia: "IPN — ESIME Zacatenco",
    promedio: "8.4",
    ultimoMovimiento: hace(3),
    registradoEl: "2026-02-18",
    etapa: "documentos",
    documentos: docs({ titulo: "pendiente", certificado: "pendiente", ingles: "pendiente", acta: "falta" }, { ingles: "Constancia de institución particular; Posgrado verifica el nivel." }, {}, ["titulo"]),
    evaluacion: { grupos: {} },
    formatos: F(["sip-02"]),
  },
  {
    id: "ASP-2026-012",
    nombre: "Carlos Rivera Núñez",
    curp: "RINC960922HDFVXR09",
    correo: "carlos.rivera@correo.mx",
    telefono: "5540003333",
    procedencia: "UAM Azcapotzalco",
    promedio: "8.0",
    ultimoMovimiento: hace(12),
    registradoEl: "2026-02-25",
    etapa: "registro",
    documentos: docs(todos("falta")),
    evaluacion: { grupos: {} },
    formatos: {},
  },
  {
    id: "ASP-2026-014",
    nombre: "Sara Méndez Cruz",
    curp: "MECS980110MDFNRR04",
    correo: "sara.mendez@correo.mx",
    telefono: "5550004444",
    procedencia: "IPN — UPIITA",
    promedio: "9.3",
    ultimoMovimiento: hace(7),
    dedicacion: "Tiempo completo",
    registradoEl: "2026-02-11",
    etapa: "entrevista",
    documentos: docs({ ingles: "prorroga" }, { ingles: "Constancia en trámite en CENLEX." }, { ingles: enDias(25) }),
    evaluacion: { grupos: {} },
    formatos: F(["sip-02", "sip-05", "sip-06"]),
  },
  {
    id: "ASP-2026-017",
    nombre: "Diego Castañeda Ríos",
    curp: "CARD970503HMCSSG01",
    correo: "diego.castaneda@correo.mx",
    telefono: "5560005555",
    procedencia: "Tecnológico de Monterrey",
    promedio: "8.9",
    ultimoMovimiento: hace(1),
    dedicacion: "Tiempo completo",
    registradoEl: "2026-02-12",
    etapa: "entrevista",
    documentos: docs({}),
    entrevista: entrevistaDe("2026-03-18", "12:00", ["mt", "ac", "rm"]),
    evaluacion: { grupos: {} },
    formatos: F(["sip-02", "sip-05", "sip-06", "mtc-ec"]),
  },
  {
    id: "ASP-2026-043",
    nombre: "Valeria Núñez Ortiz",
    curp: "NUOV990721MDFXRL02",
    correo: "valeria.nunez@correo.mx",
    telefono: "5570007777",
    procedencia: "UNAM — Facultad de Ciencias",
    promedio: "9.0",
    ultimoMovimiento: hace(1),
    dedicacion: "Tiempo completo",
    registradoEl: "2026-02-16",
    etapa: "entrevista",
    documentos: docs({}),
    // Profesores entrevistadores incompletos: quedan 2 lugares para que los profesores los elijan
    entrevista: entrevistaDe("2026-03-19", "11:00", ["lh"]),
    evaluacion: { grupos: {} },
    formatos: F(["sip-02", "sip-05", "sip-06"]),
  },
  {
    // Perfil de ejemplo (entra con ASP-2026-050): un documento observado y los demás aprobados o en revisión
    id: ID_EJEMPLO_OBSERVACION,
    nombre: "Mariana Torres Vidal",
    curp: "TOVM980315MDFRDR04",
    correo: "mariana.torres@correo.mx",
    telefono: "5591234567",
    procedencia: "IPN — UPIITA",
    promedio: "8.9",
    ultimoMovimiento: hace(1),
    registradoEl: "2026-02-20",
    etapa: "documentos",
    documentos: docs({ certificado: "observado", identificacion: "pendiente" }, { certificado: OBSERVACION_EJEMPLO }),
    evaluacion: { grupos: {} },
    formatos: F(["sip-02"]),
  },
  {
    id: "ASP-2026-022",
    nombre: "Paola Jiménez Vargas",
    curp: "JIVP990820MDFMRL06",
    correo: "paola.jimenez@correo.mx",
    telefono: "5570006666",
    procedencia: "IPN — ESCOM",
    promedio: "9.0",
    ultimoMovimiento: hace(2),
    dedicacion: "Tiempo completo",
    registradoEl: "2026-02-09",
    etapa: "evaluacion",
    documentos: docs({}),
    entrevista: entrevistaDe("2026-03-17", "10:30"),
    dictamen: dictamenDe("Aprobado", "Perfil sólido; se recomienda fortalecer metodología."),
    evaluacion: {
      modalidad: "propedeutico",
      grupos: PROPEDEUTICO_AB,
      // La Dra. Castillo ya capturó Matemáticas; falta Programación
      capturas: { propedeutico: { matematicas: { calificacion: 9.0, por: "ac", el: hace(1) } } },
    },
    formatos: F(["sip-02", "sip-05", "sip-06", "mtc-ec"]),
  },
  {
    id: "ASP-2026-025",
    nombre: "Fernando Aguilar Mora",
    curp: "AUMF960214HDFGRR03",
    correo: "fernando.aguilar@correo.mx",
    telefono: "5580007777",
    procedencia: "UAEMéx",
    promedio: "8.2",
    ultimoMovimiento: hace(9),
    dedicacion: "Tiempo parcial",
    registradoEl: "2026-02-15",
    etapa: "evaluacion",
    documentos: docs({}),
    entrevista: entrevistaDe("2026-03-17", "12:00"),
    dictamen: dictamenDe("Con reservas", "Debe reforzar programación."),
    evaluacion: {
      modalidad: "propedeutico",
      grupos: { matematicas: "B", programacion: "B", seminario: "Único" },
      propedeutico: { calificacion: 7.3, acreditado: false, registradoEl: "2026-05-30T12:00:00", publicadoEl: "2026-05-30T13:00:00", areas: { matematicas: { calificacion: 8.4, acreditado: true }, programacion: { calificacion: 6.2, acreditado: false } } },
    },
    formatos: F(["sip-02", "sip-05", "sip-06", "mtc-ec"]),
  },
  {
    id: "ASP-2026-028",
    nombre: "Valeria Domínguez Paz",
    curp: "DOPV980611MDFMZL08",
    correo: "valeria.dominguez@correo.mx",
    telefono: "5590008888",
    procedencia: "IPN — CIC",
    promedio: "9.4",
    ultimoMovimiento: hace(1),
    dedicacion: "Tiempo completo",
    registradoEl: "2026-02-08",
    etapa: "evaluacion",
    documentos: docs({}),
    entrevista: entrevistaDe("2026-03-18", "10:30", ["lh", "er", "rm"]),
    dictamen: dictamenDe("Aprobado", "Excelente perfil de investigación."),
    evaluacion: { modalidad: "examen", grupos: {} },
    formatos: F(["sip-02", "sip-05", "sip-06", "mtc-ec"]),
  },
  {
    id: "ASP-2026-031",
    nombre: "Ricardo Salgado Luna",
    curp: "SALR950304HDFLNC02",
    correo: "ricardo.salgado@correo.mx",
    telefono: "5511119999",
    procedencia: "IPN — ESIME Culhuacán",
    promedio: "8.6",
    ultimoMovimiento: hace(4),
    dedicacion: "Tiempo completo",
    registradoEl: "2026-02-13",
    etapa: "dictamen",
    documentos: docs({}),
    entrevista: entrevistaDe("2026-03-17", "16:00"),
    dictamen: dictamenDe("Aprobado", "Buen dominio técnico."),
    evaluacion: {
      modalidad: "propedeutico",
      grupos: PROPEDEUTICO_AB,
      propedeutico: { calificacion: 8.9, acreditado: true, registradoEl: "2026-05-30T12:00:00", publicadoEl: "2026-05-30T13:00:00", areas: { matematicas: { calificacion: 9.0, acreditado: true }, programacion: { calificacion: 8.8, acreditado: true } } },
    },
    formatos: F(["sip-02", "sip-05", "sip-06", "mtc-ec"]),
  },
  {
    id: "ASP-2026-035",
    nombre: "Andrea Fuentes Olvera",
    curp: "FUOA990909MDFNLN05",
    correo: "andrea.fuentes@correo.mx",
    telefono: "5522220000",
    procedencia: "BUAP",
    promedio: "9.2",
    ultimoMovimiento: hace(6),
    dedicacion: "Tiempo completo",
    registradoEl: "2026-02-16",
    etapa: "dictamen",
    documentos: docs({}),
    entrevista: entrevistaDe("2026-03-18", "16:00", ["mt", "ac", "rm"]),
    dictamen: dictamenDe("Aprobado", "Muy motivada; proyecto viable."),
    evaluacion: { modalidad: "examen", grupos: {}, examen: { calificacion: 8.4, acreditado: true, registradoEl: "2026-06-08T14:00:00", publicadoEl: "2026-06-09T10:00:00", areas: { matematicas: { calificacion: 8.2, acreditado: true }, programacion: { calificacion: 8.6, acreditado: true } } } },
    formatos: F(["sip-02", "sip-05", "sip-06", "mtc-ec"]),
  },
  {
    id: "ASP-2026-040",
    nombre: "Héctor Ramírez Gil",
    curp: "RAGH970128HDFMLC07",
    correo: "hector.ramirez@correo.mx",
    telefono: "5533331111",
    procedencia: "IPN — UPIICSA",
    promedio: "7.9",
    ultimoMovimiento: hace(20),
    dedicacion: "Tiempo completo",
    registradoEl: "2026-02-20",
    etapa: "entrevista",
    concluido: "Rechazado en la entrevista colegiada",
    documentos: docs({}),
    entrevista: entrevistaDe("2026-03-17", "17:30", ["lh", "mt", "er"]),
    dictamen: dictamenDe("Rechazado", "No cumple el perfil de ingreso."),
    evaluacion: { grupos: {} },
    formatos: F(["sip-02", "sip-05", "sip-06", "mtc-ec"]),
  },
  {
    id: "ASP-2026-019",
    nombre: "Laura Pineda Rojas",
    curp: "PIRL980707MDFNJR01",
    correo: "laura.pineda@correo.mx",
    telefono: "5544442222",
    procedencia: "IPN — ESCOM",
    promedio: "9.0",
    ultimoMovimiento: hace(3),
    dedicacion: "Tiempo completo",
    registradoEl: "2026-02-10",
    etapa: "dictamen",
    documentos: docs({}),
    entrevista: entrevistaDe("2026-03-17", "09:00"),
    dictamen: dictamenDe("Aprobado", "Perfil adecuado."),
    evaluacion: { modalidad: "propedeutico", grupos: PROPEDEUTICO_AB, propedeutico: { calificacion: 9.1, acreditado: true, registradoEl: "2026-05-30T12:00:00", publicadoEl: "2026-05-30T13:00:00", areas: { matematicas: { calificacion: 9.3, acreditado: true }, programacion: { calificacion: 8.9, acreditado: true } } } },
    resolucion: "Aceptado",
    turnadoUteycv: hace(5),
    formatos: F(["sip-02", "sip-05", "sip-06", "mtc-ec"]),
    uteycv: {},
  },
  {
    id: "ASP-2026-033",
    nombre: "Óscar Medina Luna",
    curp: "MELO970219HDFDNS06",
    correo: "oscar.medina@correo.mx",
    telefono: "5566663333",
    procedencia: "UAM Iztapalapa",
    promedio: "8.8",
    ultimoMovimiento: hace(2),
    dedicacion: "Tiempo parcial",
    registradoEl: "2026-02-17",
    etapa: "dictamen",
    documentos: docs({}),
    entrevista: entrevistaDe("2026-03-18", "09:00", ["mt", "er", "rm"]),
    dictamen: dictamenDe("Aprobado", "Buen proyecto."),
    evaluacion: { modalidad: "examen", grupos: {}, examen: { calificacion: 8.7, acreditado: true, registradoEl: "2026-06-08T14:00:00", publicadoEl: "2026-06-09T10:00:00", areas: { matematicas: { calificacion: 8.5, acreditado: true }, programacion: { calificacion: 8.9, acreditado: true } } } },
    resolucion: "Con reservas",
    turnadoUteycv: hace(9),
    formatos: F(["sip-02", "sip-05", "sip-06", "mtc-ec"]),
    uteycv: {
      // Ya avanzó con su inscripción: foto, SIP-01 y SIP-04 entregados
      sip08PublicadoEl: hace(3),
      foto: true,
      sip01Firmado: true,
      sip04Firmado: true,
      sip05Firmado: true,
    },
  },
];

// ---------- Estado de bandeja y progreso ----------

export type Bandeja =
  | "Registro incompleto"
  | "Por revisar"
  | "Con observaciones"
  | "Sin cita"
  | "Entrevista programada"
  | "En evaluación"
  | "Segunda oportunidad"
  | "Esperando resolución del Colegio"
  | "Admitido"
  | "No admitido";

/** El expediente se puede aprobar cuando todo lo obligatorio está aprobado y nada queda observado o sin revisar. */
export const expedienteCompleto = (a: AspiranteP) =>
  a.documentos.every((d) => d.estado === "aprobado" || d.estado === "prorroga" || (d.opcional && d.estado === "falta"));

/** Días completos desde una fecha ISO hasta hoy. */
export const diasDesde = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
/** Días que faltan para una fecha AAAA-MM-DD (negativo = ya venció). */
export const diasPara = (fecha: string) => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${fecha}T00:00:00`).getTime() - hoy.getTime()) / 86_400_000);
};

/** Documentos con prórroga que todavía no se entregan. */
export const prorrogasDe = (a: AspiranteP) => a.documentos.filter((d) => d.estado === "prorroga" && d.prorrogaHasta);

/** ¿La siguiente acción le toca a Posgrado? (si le toca al aspirante u otra área, no sube la prioridad) */
export function leTocaAPosgrado(a: AspiranteP): boolean {
  const b = bandejaDe(a);
  // Entregó un documento (p. ej. dentro de su prórroga) que falta revisar
  if (!a.concluido && !a.turnadoUteycv && a.documentos.some((d) => d.estado === "pendiente")) return true;
  if (b === "Registro incompleto" || b === "Con observaciones" || b === "Admitido" || b === "No admitido") return false;
  if (b === "En evaluación" && !a.evaluacion.modalidad) return false;
  // Las calificaciones las capturan los profesores; a Posgrado le toca cuando hay que publicarlas
  if ((b === "En evaluación" || b === "Segunda oportunidad") && evaluacionPendiente(a.evaluacion)) return false;
  // El acta de la entrevista la llenan y firman los profesores entrevistadores (sesión de Profesor)
  if (b === "Entrevista programada") return false;
  return true;
}

/**
 * Prioridad calculada (no se captura a mano):
 * - Alta: una prórroga vence en 3 días o menos (o ya venció), o el expediente lleva 5+ días esperando a Posgrado.
 * - Media: lleva de 2 a 4 días esperando a Posgrado.
 * - Normal: se atendió hace menos de 2 días, o la siguiente acción es del aspirante o de otra área (p. ej. la inscripción en UTEyCV).
 */
export function prioridadDe(a: AspiranteP): { nivel: Prioridad; motivo: string } {
  if (a.concluido) return { nivel: "Normal", motivo: "Proceso concluido" };
  const vence = prorrogasDe(a).find((d) => diasPara(d.prorrogaHasta!) <= 3);
  if (vence) {
    const n = diasPara(vence.prorrogaHasta!);
    return { nivel: "Alta", motivo: n < 0 ? `Prórroga de ${vence.nombre.toLowerCase()} vencida` : `Prórroga de ${vence.nombre.toLowerCase()} vence en ${n} día(s)` };
  }
  const dias = diasDesde(a.ultimoMovimiento);
  if (!leTocaAPosgrado(a)) return { nivel: "Normal", motivo: "Esperando al aspirante u otra área" };
  if (dias >= 5) return { nivel: "Alta", motivo: `${dias} días esperando a Posgrado` };
  if (dias >= 2) return { nivel: "Media", motivo: `${dias} días esperando a Posgrado` };
  return { nivel: "Normal", motivo: dias ? "1 día esperando" : "Atendido hoy" };
}

export function bandejaDe(a: AspiranteP): Bandeja {
  if (a.concluido) return "No admitido";
  switch (a.etapa) {
    case "registro":
      return "Registro incompleto";
    case "documentos":
      if (a.documentos.some((d) => d.estado === "pendiente")) return "Por revisar";
      if (a.documentos.some((d) => d.estado === "observado" || (d.estado === "falta" && !d.opcional))) return "Con observaciones";
      return "Por revisar";
    case "entrevista":
      return a.entrevista ? "Entrevista programada" : "Sin cita";
    case "evaluacion":
      return a.evaluacion.propedeutico && !a.evaluacion.propedeutico.acreditado ? "Segunda oportunidad" : "En evaluación";
    case "dictamen":
      // Con la resolución del Colegio publicada concluye la admisión; la inscripción es otro proceso (UTEyCV)
      return esAdmitido(a) ? "Admitido" : "Esperando resolución del Colegio";
  }
}

export const TONO_BANDEJA: Record<Bandeja, string> = {
  "Registro incompleto": "bg-gray-100 text-gray-700",
  "Por revisar": "bg-amber-50 text-amber-800",
  "Con observaciones": "bg-orange-50 text-orange-800",
  "Sin cita": "bg-indigo-50 text-primary",
  "Entrevista programada": "bg-indigo-50 text-primary",
  "En evaluación": "bg-sky-50 text-sky-800",
  "Segunda oportunidad": "bg-amber-50 text-amber-800",
  "Esperando resolución del Colegio": "bg-violet-50 text-violet-800",
  Admitido: "bg-emerald-50 text-emerald-800",
  "No admitido": "bg-red-50 text-red-700",
};

const PESO: Record<EtapaId, number> = { registro: 10, documentos: 25, entrevista: 45, evaluacion: 65, dictamen: 85 };

export function progresoDe(a: AspiranteP) {
  if (a.etapa === "dictamen" && esAdmitido(a)) return { pct: 100, texto: `Admitido (${a.resolucion?.toLowerCase()})` };
  if (a.etapa === "documentos") {
    const ok = a.documentos.filter((d) => d.estado === "aprobado").length;
    return { pct: Math.round(15 + (ok / a.documentos.length) * 20), texto: `Documentos ${ok}/${a.documentos.length}` };
  }
  const texto: Record<EtapaId, string> = {
    registro: "Registro",
    documentos: "Documentos",
    entrevista: "Entrevista",
    evaluacion: "Evaluación",
    dictamen: "Comisión",
  };
  return { pct: PESO[a.etapa], texto: texto[a.etapa] };
}

/** Resultado vigente de la evaluación (el examen, si lo hubo, manda sobre el propedéutico). */
export function resultadoFinal(e: EvaluacionP): ResultadoEval | undefined {
  return e.examen ?? e.propedeutico;
}

/** Admitido por el Colegio (Aceptado o Con reservas): con eso concluye su proceso de admisión. */
export const esAdmitido = (a: Pick<AspiranteP, "resolucion" | "concluido">) => !a.concluido && (a.resolucion === "Aceptado" || a.resolucion === "Con reservas");

// ---------- Inscripción (Control Escolar) ----------

/** Formatos de inscripción que el admitido entrega firmados (RF-22, RF-24, RF-26). */
export const FORMATOS_INSCRIPCION = [
  { clave: "sip-01", t: "SIP-01 · Solicitud de inscripción", campo: "sip01Firmado" },
  { clave: "sip-04", t: "SIP-04 · Dictamen del proceso de admisión", campo: "sip04Firmado" },
  { clave: "sip-05", t: "SIP-05 · Carta protesta", campo: "sip05Firmado" },
  { clave: "sip-06", t: "SIP-06 · Exposición de motivos", campo: "sip06Firmado" },
  { clave: "sip-08", t: "SIP-08 · Programa individual", campo: "sip08Firmado" },
] as const;

/** Admitidos por el Colegio (resultado publicado): pueden inscribirse. */
export const puedeInscribirse = (a: AspiranteP) => esAdmitido(a);

/** Qué falta para formalizar la inscripción. */
export function pendientesInscripcion(a: AspiranteP) {
  const u = a.uteycv ?? {};
  return [
    { t: "Fotografía", ok: !!u.foto },
    ...FORMATOS_INSCRIPCION.map((f) => ({ t: `${f.t.split(" · ")[0]} firmado`, ok: !!u[f.campo] || !!u.firmadosFinales?.[f.clave] })),
    { t: "Dedicación elegida", ok: !!a.dedicacion },
  ];
}

export type EstadoInscripcion = "Pendiente de resultado" | "SIP-08 por publicar" | "Integrando expediente" | "Listo para formalizar" | "Inscrito";
export const TONO_INSCRIPCION: Record<EstadoInscripcion, string> = {
  "Pendiente de resultado": "bg-gray-100 text-gray-600",
  "SIP-08 por publicar": "bg-amber-50 text-amber-800",
  "Integrando expediente": "bg-sky-50 text-sky-800",
  "Listo para formalizar": "bg-violet-50 text-violet-800",
  Inscrito: "bg-emerald-50 text-emerald-700",
};
export function estadoInscripcion(a: AspiranteP): EstadoInscripcion {
  const u = a.uteycv ?? {};
  if (!puedeInscribirse(a)) return "Pendiente de resultado";
  if (u.formalizadoEl) return "Inscrito";
  if (!u.sip08PublicadoEl) return "SIP-08 por publicar";
  return pendientesInscripcion(a).every((p) => p.ok) ? "Listo para formalizar" : "Integrando expediente";
}

/** Separa "Nombre(s) Paterno Materno" (para los formatos de los aspirantes de ejemplo). */
export function partesNombre(nombre: string) {
  const w = nombre.trim().split(/\s+/);
  return { nombre: w.slice(0, -2).join(" ") || w[0], paterno: w.at(-2) ?? "", materno: w.at(-1) ?? "" };
}

export const fechaCorta = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
export const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
