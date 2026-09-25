import type { EtapaId } from "../admision";
import type { ModalidadId } from "../evaluacion";

/**
 * Datos del Departamento de Posgrado — EJEMPLO (solo cascarón).
 * Con backend: GET /admision/aspirantes, /profesores?colegiado=true, etc.
 * Los nombres de aspirantes y profesores NO son reales.
 */

/**
 * aval = constancia de inglés que no es de CELEX/CENLEX: UTEyCV la envió a la DFLE para su aval (RF-53, RN-09).
 * prorroga = Posgrado le dio más tiempo para entregarlo; el proceso sigue mientras tanto.
 */
export type EstadoDoc = "falta" | "pendiente" | "aprobado" | "observado" | "aval" | "prorroga";
export type DocAspirante = {
  id: string;
  nombre: string;
  archivo?: string;
  estado: EstadoDoc;
  observacion?: string;
  opcional?: boolean;
  /** Fecha límite (AAAA-MM-DD) cuando tiene prórroga */
  prorrogaHasta?: string;
};

export type Entrevista = {
  fecha: string; // AAAA-MM-DD
  hora: string;
  modalidad: "Presencial" | "En línea";
  sala: string;
  sinodo: string[]; // ids de profesor
  notificadaEl: string;
};

export type Resolucion = "Aprobado" | "Con reservas" | "Rechazado";
export type Puntajes = { trayectoria: number; proyecto: number; conocimientos: number; motivacion: number };
export const MAX_PUNTAJE: Record<keyof Puntajes, number> = { trayectoria: 30, proyecto: 30, conocimientos: 25, motivacion: 15 };
export const ETIQUETA_PUNTAJE: Record<keyof Puntajes, string> = {
  trayectoria: "Trayectoria académica",
  proyecto: "Proyecto",
  conocimientos: "Conocimientos",
  motivacion: "Motivación",
};

export type DictamenEntrevista = { puntajes: Puntajes; resolucion: Resolucion; comentarios: string; registradoEl: string };

export type ResultadoEval = { calificacion: number; acreditado: boolean; registradoEl: string };
export type EvaluacionP = {
  modalidad?: ModalidadId;
  grupos: Record<string, string>;
  propedeutico?: ResultadoEval;
  examen?: ResultadoEval;
};

export type ResolucionColegio = "Aceptado" | "Condicionado" | "No aceptado";

export type Prioridad = "Alta" | "Media" | "Normal";
export type Dedicacion = "Tiempo completo" | "Tiempo parcial";

/** Trabajo de Control Escolar (UTEyCV) sobre el aspirante: aval DFLE, cartas, SIP-04, SIP-08 y matrícula. */
export type UteycvP = {
  /** Oficio con el que se envió la constancia de inglés a la DFLE */
  avalEnviadoEl?: string;
  avalOficio?: string;
  cartasValidadasEl?: string;
  /** SIP-04: fecha y hora de la sesión del Colegio que dictaminó */
  fechaSesion?: string;
  horaSesion?: string;
  sip04ElaboradoEl?: string;
  /** El aspirante revisó y confirmó sus datos del SIP-04 */
  confirmoSip04?: boolean;
  firmasEl?: string;
  sip04PublicadoEl?: string;
  sip04Archivo?: string;
  /** SIP-08 que preparó el asesor, publicado para que el aspirante lo firme */
  sip08PublicadoEl?: string;
  sip01Firmado?: boolean;
  sip08Firmado?: boolean;
  foto?: boolean;
  sicep?: string;
  formalizadoEl?: string;
};

/** Fecha ISO de hace n días (para que los ejemplos tengan tiempos de espera realistas). */
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
  promedio: string;
  registradoEl: string;
  /** Último movimiento en su expediente (lo actualiza cualquier acción de Posgrado o del aspirante) */
  ultimoMovimiento: string;
  etapa: EtapaId;
  /** Motivo por el que el proceso terminó sin admisión (RN-05, RN-08) */
  concluido?: string;
  documentos: DocAspirante[];
  entrevista?: Entrevista;
  dictamen?: DictamenEntrevista;
  evaluacion: EvaluacionP;
  resolucion?: ResolucionColegio;
  /** Fecha en que se turnó a UTEyCV para SIP-04 y matrícula */
  turnadoUteycv?: string;
  /** Formatos firmados recibidos (SIP-02, SIP-05…) */
  formatos: Record<string, boolean>;
  /** true = es el aspirante que se llenó en este navegador */
  enVivo?: boolean;
  /** Dedicación que ELIGIÓ el aspirante en su carta protesta (SIP-05); UTEyCV solo la usa en el SIP-04 y en SICEP */
  dedicacion?: Dedicacion;
  /** Lo que registra Control Escolar (UTEyCV) */
  uteycv?: UteycvP;
};

// ---------- Profesores para el sínodo (RN-07: 3 colegiados vigentes) ----------

export type ProfesorP = { id: string; nombre: string; colegiado: boolean; vigencia: string; linea: string };

export const PROFESORES_SINODO: ProfesorP[] = [
  { id: "lh", nombre: "Dra. Laura Hernández Ruiz", colegiado: true, vigencia: "2027", linea: "Computación inteligente" },
  { id: "mt", nombre: "Dr. Miguel Torres Díaz", colegiado: true, vigencia: "2026", linea: "Redes de computadoras" },
  { id: "er", nombre: "Dra. Elena Ruiz Campos", colegiado: true, vigencia: "2028", linea: "Realidad virtual" },
  { id: "ac", nombre: "Dra. Adriana Castillo Ramos", colegiado: true, vigencia: "2027", linea: "Procesamiento paralelo" },
  { id: "rm", nombre: "Dr. Ricardo Morales Vega", colegiado: true, vigencia: "2029", linea: "Computación inteligente" },
  { id: "jp", nombre: "Dr. Jorge Pérez Luna", colegiado: false, vigencia: "Vencida", linea: "Mecatrónica" },
  { id: "js", nombre: "Dr. Jorge Salinas Ortega", colegiado: false, vigencia: "Asignatura", linea: "Seguridad informática" },
];

export const profesorValido = (p: ProfesorP) => p.colegiado && /^\d{4}$/.test(p.vigencia) && Number(p.vigencia) >= 2026;
export const nombreProfesor = (id: string) => PROFESORES_SINODO.find((p) => p.id === id)?.nombre ?? id;

// ---------- Documentos ----------

const DOCS_BASE: { id: string; nombre: string; opcional?: boolean }[] = [
  { id: "titulo", nombre: "Título de licenciatura" },
  { id: "cedula", nombre: "Cédula profesional", opcional: true },
  { id: "certificado", nombre: "Certificado de estudios" },
  { id: "ingles", nombre: "Constancia de inglés" },
  { id: "curp", nombre: "CURP" },
  { id: "acta", nombre: "Acta de nacimiento" },
  { id: "identificacion", nombre: "Identificación oficial" },
];

const docs = (estados: Partial<Record<string, EstadoDoc>>, obs: Record<string, string> = {}, prorroga: Record<string, string> = {}): DocAspirante[] =>
  DOCS_BASE.map((d) => {
    const estado = estados[d.id] ?? "aprobado";
    return {
      ...d,
      estado,
      archivo: estado === "falta" || estado === "prorroga" ? undefined : `${d.id}.pdf`,
      observacion: obs[d.id],
      prorrogaHasta: prorroga[d.id],
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
  notificadaEl: "2026-03-10T10:00:00",
});

const dictamenDe = (p: Puntajes, resolucion: Resolucion, comentarios: string): DictamenEntrevista => ({
  puntajes: p,
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
    documentos: docs({ certificado: "observado", ingles: "prorroga", cedula: "pendiente" }, { certificado: "El reverso no es legible.", ingles: "Aún no tiene constancia CELEX/CENLEX." }, { ingles: enDias(3) }),
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
    documentos: docs({ titulo: "pendiente", certificado: "pendiente", ingles: "aval", acta: "falta" }, { ingles: "Constancia de institución particular; enviada a la DFLE." }),
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
    entrevista: entrevistaDe("2026-03-18", "12:00", ["mt", "er", "ac"]),
    evaluacion: { grupos: {} },
    formatos: F(["sip-02", "sip-05", "sip-06", "mtc-ec"]),
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
    dictamen: dictamenDe({ trayectoria: 28, proyecto: 27, conocimientos: 23, motivacion: 14 }, "Aprobado", "Perfil sólido; se recomienda fortalecer metodología."),
    evaluacion: { modalidad: "propedeutico", grupos: PROPEDEUTICO_AB },
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
    dictamen: dictamenDe({ trayectoria: 22, proyecto: 20, conocimientos: 18, motivacion: 12 }, "Con reservas", "Debe reforzar programación."),
    evaluacion: {
      modalidad: "propedeutico",
      grupos: { matematicas: "B", programacion: "B", seminario: "Único" },
      propedeutico: { calificacion: 6.8, acreditado: false, registradoEl: "2026-05-30T12:00:00" },
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
    dictamen: dictamenDe({ trayectoria: 29, proyecto: 28, conocimientos: 24, motivacion: 14 }, "Aprobado", "Excelente perfil de investigación."),
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
    dictamen: dictamenDe({ trayectoria: 25, proyecto: 26, conocimientos: 21, motivacion: 13 }, "Aprobado", "Buen dominio técnico."),
    evaluacion: {
      modalidad: "propedeutico",
      grupos: PROPEDEUTICO_AB,
      propedeutico: { calificacion: 8.9, acreditado: true, registradoEl: "2026-05-30T12:00:00" },
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
    dictamen: dictamenDe({ trayectoria: 27, proyecto: 25, conocimientos: 22, motivacion: 15 }, "Aprobado", "Muy motivada; proyecto viable."),
    evaluacion: { modalidad: "examen", grupos: {}, examen: { calificacion: 8.4, acreditado: true, registradoEl: "2026-06-08T14:00:00" } },
    formatos: F(["sip-02", "sip-05", "sip-06", "mtc-ec"]),
  },
  {
    id: "ASP-2026-040",
    nombre: "Héctor Ramírez Gil",
    curp: "RAGH970128HDFMLC07",
    correo: "hector.ramirez@correo.mx",
    telefono: "5533331111",
    procedencia: "UPIICSA",
    promedio: "7.9",
    ultimoMovimiento: hace(20),
    dedicacion: "Tiempo completo",
    registradoEl: "2026-02-20",
    etapa: "entrevista",
    concluido: "Rechazado en la entrevista colegiada (RN-05)",
    documentos: docs({}),
    entrevista: entrevistaDe("2026-03-17", "17:30", ["lh", "mt", "er"]),
    dictamen: dictamenDe({ trayectoria: 15, proyecto: 12, conocimientos: 10, motivacion: 9 }, "Rechazado", "No cumple el perfil de ingreso."),
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
    etapa: "matricula",
    documentos: docs({}),
    entrevista: entrevistaDe("2026-03-17", "09:00"),
    dictamen: dictamenDe({ trayectoria: 26, proyecto: 27, conocimientos: 22, motivacion: 14 }, "Aprobado", "Perfil adecuado."),
    evaluacion: { modalidad: "propedeutico", grupos: PROPEDEUTICO_AB, propedeutico: { calificacion: 9.1, acreditado: true, registradoEl: "2026-05-30T12:00:00" } },
    resolucion: "Aceptado",
    turnadoUteycv: hace(5),
    formatos: F(["sip-02", "sip-05", "sip-06", "mtc-ec"]),
    uteycv: { cartasValidadasEl: hace(20), fechaSesion: "2026-06-20", horaSesion: "12:00", sip04ElaboradoEl: hace(4), confirmoSip04: true },
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
    etapa: "matricula",
    documentos: docs({}),
    entrevista: entrevistaDe("2026-03-18", "09:00", ["mt", "er", "rm"]),
    dictamen: dictamenDe({ trayectoria: 24, proyecto: 25, conocimientos: 21, motivacion: 13 }, "Aprobado", "Buen proyecto."),
    evaluacion: { modalidad: "examen", grupos: {}, examen: { calificacion: 8.7, acreditado: true, registradoEl: "2026-06-08T14:00:00" } },
    resolucion: "Condicionado",
    turnadoUteycv: hace(9),
    formatos: F(["sip-02", "sip-05", "sip-06", "mtc-ec"]),
    uteycv: {
      cartasValidadasEl: hace(25),
      fechaSesion: "2026-06-20",
      horaSesion: "12:00",
      sip04ElaboradoEl: hace(8),
      confirmoSip04: true,
      firmasEl: hace(6),
      sip04PublicadoEl: hace(5),
      sip04Archivo: "SIP-04_MEDINA_firmado.pdf",
      sip08PublicadoEl: hace(4),
      sip01Firmado: true,
      sip08Firmado: true,
      foto: true,
    },
  },
];

// ---------- Estado de bandeja y progreso ----------

export type Bandeja =
  | "Registro incompleto"
  | "Por revisar"
  | "Con observaciones"
  | "Pendiente aval DFLE"
  | "Sin cita"
  | "Entrevista programada"
  | "En evaluación"
  | "Segunda oportunidad"
  | "Esperando resolución del Colegio"
  | "Turnado a UTEyCV"
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
  if (!a.concluido && a.etapa !== "matricula" && a.documentos.some((d) => d.estado === "pendiente")) return true;
  if (b === "Registro incompleto" || b === "Con observaciones" || b === "Pendiente aval DFLE" || b === "Turnado a UTEyCV" || b === "No admitido") return false;
  if (b === "En evaluación" && !a.evaluacion.modalidad) return false;
  if (b === "Entrevista programada") return !!a.entrevista && diasPara(a.entrevista.fecha) < 0;
  return true;
}

/**
 * Prioridad calculada (no se captura a mano):
 * - Alta: una prórroga vence en 3 días o menos (o ya venció), o el expediente lleva 5+ días esperando a Posgrado.
 * - Media: lleva de 2 a 4 días esperando a Posgrado.
 * - Normal: se atendió hace menos de 2 días, o la siguiente acción es del aspirante o de otra área (p. ej. aval DFLE en UTEyCV).
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
      if (a.documentos.some((d) => d.estado === "aval")) return "Pendiente aval DFLE";
      return "Por revisar";
    case "entrevista":
      return a.entrevista ? "Entrevista programada" : "Sin cita";
    case "evaluacion":
      return a.evaluacion.propedeutico && !a.evaluacion.propedeutico.acreditado ? "Segunda oportunidad" : "En evaluación";
    case "dictamen":
      return "Esperando resolución del Colegio";
    case "matricula":
      return "Turnado a UTEyCV";
  }
}

export const TONO_BANDEJA: Record<Bandeja, string> = {
  "Registro incompleto": "bg-gray-100 text-gray-700",
  "Por revisar": "bg-amber-50 text-amber-800",
  "Con observaciones": "bg-orange-50 text-orange-800",
  "Pendiente aval DFLE": "bg-yellow-50 text-yellow-800",
  "Sin cita": "bg-indigo-50 text-primary",
  "Entrevista programada": "bg-indigo-50 text-primary",
  "En evaluación": "bg-sky-50 text-sky-800",
  "Segunda oportunidad": "bg-amber-50 text-amber-800",
  "Esperando resolución del Colegio": "bg-violet-50 text-violet-800",
  "Turnado a UTEyCV": "bg-emerald-50 text-emerald-800",
  "No admitido": "bg-red-50 text-red-700",
};

const PESO: Record<EtapaId, number> = { registro: 10, documentos: 25, entrevista: 45, evaluacion: 65, dictamen: 85, matricula: 100 };

export function progresoDe(a: AspiranteP) {
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
    matricula: "Matrícula",
  };
  return { pct: PESO[a.etapa], texto: texto[a.etapa] };
}

export const totalPuntaje = (p: Puntajes) => p.trayectoria + p.proyecto + p.conocimientos + p.motivacion;

/** Resultado vigente de la evaluación (el examen, si lo hubo, manda sobre el propedéutico). */
export function resultadoFinal(e: EvaluacionP): ResultadoEval | undefined {
  return e.examen ?? e.propedeutico;
}

// ---------- Control Escolar (UTEyCV) ----------

export type EstadoUteycv = "SIP-04 por elaborar" | "Esperando confirmación" | "Recabando firmas" | "Por publicar SIP-04" | "Integrando expediente" | "Listo para formalizar" | "Matrícula formalizada";

export const TONO_UTEYCV: Record<EstadoUteycv, string> = {
  "SIP-04 por elaborar": "bg-amber-50 text-amber-800",
  "Esperando confirmación": "bg-gray-100 text-gray-700",
  "Recabando firmas": "bg-indigo-50 text-primary",
  "Por publicar SIP-04": "bg-amber-50 text-amber-800",
  "Integrando expediente": "bg-sky-50 text-sky-800",
  "Listo para formalizar": "bg-violet-50 text-violet-800",
  "Matrícula formalizada": "bg-emerald-50 text-emerald-700",
};

/** Qué falta para formalizar la matrícula de un aspirante turnado. */
export function pendientesMatricula(a: AspiranteP) {
  const u = a.uteycv ?? {};
  return [
    { t: "SIP-04 publicado", ok: !!u.sip04PublicadoEl },
    { t: "SIP-08 del asesor publicado", ok: !!u.sip08PublicadoEl },
    { t: "Fotografía", ok: !!u.foto },
    { t: "SIP-01 firmado", ok: !!u.sip01Firmado },
    { t: "SIP-08 firmado", ok: !!u.sip08Firmado },
    { t: "Dedicación elegida por el aspirante (SIP-05)", ok: !!a.dedicacion },
  ];
}

export function estadoUteycv(a: AspiranteP): EstadoUteycv {
  const u = a.uteycv ?? {};
  if (u.formalizadoEl) return "Matrícula formalizada";
  if (!u.sip04ElaboradoEl) return "SIP-04 por elaborar";
  if (!u.confirmoSip04) return "Esperando confirmación";
  if (!u.firmasEl) return "Recabando firmas";
  if (!u.sip04PublicadoEl) return "Por publicar SIP-04";
  return pendientesMatricula(a).every((p) => p.ok) ? "Listo para formalizar" : "Integrando expediente";
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
