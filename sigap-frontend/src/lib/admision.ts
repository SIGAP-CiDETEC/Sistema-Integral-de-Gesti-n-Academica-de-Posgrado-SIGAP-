import { PROGRAMA } from "./config";

/**
 * Etapas del proceso de admisión que ve el aspirante.
 * Cuando exista el backend, la etapa actual vendrá de la máquina de estados
 * (XState) del aspirante; aquí solo hay datos de ejemplo por etapa.
 */

export const ETAPAS = [
  { id: "registro", label: "Registro", estado: "Registro incompleto" },
  { id: "documentos", label: "Documentos", estado: "Documentación en revisión" },
  { id: "entrevista", label: "Entrevista", estado: "Entrevista programada" },
  { id: "evaluacion", label: "Evaluación", estado: "En evaluación" },
  { id: "dictamen", label: "Dictamen final", estado: "En dictamen final" },
  { id: "matricula", label: "Matrícula", estado: "Inscrito" },
] as const;

export type EtapaId = (typeof ETAPAS)[number]["id"];

export type TipoAviso = "info" | "alerta" | "exito";

export type Aviso = { tipo: TipoAviso; titulo: string; texto: string };

export type SolicitudAdmision = {
  idTemporal: string;
  programa: string;
  etapa: EtapaId;
  modalidad: string;
  documentos: { validados: number; total: number };
  proximaActividad: { fecha: string; descripcion: string } | null;
  avisos: Aviso[];
  siguientePaso: { titulo: string; texto: string; href: string; accion: string } | null;
};

const base = { idTemporal: "ASP-2026-001", programa: PROGRAMA, modalidad: "Presencial" };

/** Un ejemplo de solicitud por cada etapa (para navegar el cascarón). */
export const SOLICITUDES_DEMO: Record<EtapaId, SolicitudAdmision> = {
  registro: {
    ...base,
    etapa: "registro",
    modalidad: "Por definir",
    documentos: { validados: 0, total: 5 },
    proximaActividad: { fecha: "3 mar", descripcion: "Fecha límite de documentos" },
    avisos: [
      { tipo: "alerta", titulo: "Expediente incompleto", texto: "Aún no cargas tus documentos de admisión." },
    ],
    siguientePaso: {
      titulo: "Carga tu expediente digital",
      texto: "Sube tus documentos en PDF (máximo 5 MB cada uno) y envíalos a revisión.",
      href: "/aspirante/documentos",
      accion: "Ir a documentos",
    },
  },
  documentos: {
    ...base,
    etapa: "documentos",
    modalidad: "Por definir",
    documentos: { validados: 2, total: 5 },
    proximaActividad: { fecha: "3 mar", descripcion: "Fecha límite de documentos" },
    avisos: [
      { tipo: "info", titulo: "Expediente en revisión", texto: "El Departamento de Posgrado está revisando tus documentos." },
      { tipo: "alerta", titulo: "Documento por subsanar", texto: "El certificado de estudios requiere el reverso legible." },
    ],
    siguientePaso: {
      titulo: "Atiende las observaciones",
      texto: "Reemplaza los documentos con observaciones para continuar a la entrevista.",
      href: "/aspirante/documentos",
      accion: "Ver observaciones",
    },
  },
  entrevista: {
    ...base,
    etapa: "entrevista",
    documentos: { validados: 3, total: 5 },
    proximaActividad: { fecha: "18 mar", descripcion: "Entrevista colegiada" },
    avisos: [
      { tipo: "info", titulo: "Entrevista confirmada", texto: "18 de marzo, 10:30 h. Sala de juntas CIDETEC." },
      { tipo: "alerta", titulo: "Documento por subsanar", texto: "El certificado de estudios requiere el reverso legible." },
    ],
    siguientePaso: {
      titulo: "Prepárate para tu entrevista",
      texto: "Consulta la fecha, el lugar y los integrantes de tu sínodo.",
      href: "/aspirante/entrevista",
      accion: "Ver detalle de entrevista",
    },
  },
  evaluacion: {
    ...base,
    etapa: "evaluacion",
    documentos: { validados: 5, total: 5 },
    proximaActividad: { fecha: "27 abr", descripcion: "Inicio de cursos propedéuticos" },
    avisos: [
      { tipo: "exito", titulo: "Entrevista aprobada", texto: "Ya puedes elegir tu modalidad de evaluación." },
    ],
    siguientePaso: {
      titulo: "Elige tu modalidad de evaluación",
      texto: "Curso propedéutico o examen de admisión directo.",
      href: "/aspirante/evaluacion",
      accion: "Elegir modalidad",
    },
  },
  dictamen: {
    ...base,
    etapa: "dictamen",
    documentos: { validados: 5, total: 5 },
    proximaActividad: { fecha: "30 abr", descripcion: "Publicación de resultados" },
    avisos: [
      { tipo: "exito", titulo: "Evaluación acreditada", texto: "Tu resultado pasa a la Comisión de Admisión del Colegio de Profesores." },
    ],
    siguientePaso: null,
  },
  matricula: {
    ...base,
    etapa: "matricula",
    documentos: { validados: 5, total: 5 },
    proximaActividad: { fecha: "4 may", descripcion: "Inicio de inscripciones" },
    avisos: [
      {
        tipo: "exito",
        titulo: "¡Fuiste admitido!",
        texto: "Tu boleta definitiva es B260842. Úsala para iniciar sesión a partir de ahora.",
      },
    ],
    siguientePaso: null,
  },
};

export const indiceEtapa = (id: EtapaId) => ETAPAS.findIndex((e) => e.id === id);

export const esEtapa = (v: unknown): v is EtapaId => ETAPAS.some((e) => e.id === v);
