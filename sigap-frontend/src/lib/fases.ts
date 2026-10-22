import type { EtapaId } from "./admision";
import type { Area } from "./config";

/** Qué pasa en cada fase del proceso, desde el punto de vista del aspirante. */
/** Fases que ve el aspirante: las etapas del proceso más la publicación de resultados (entre evaluación y dictamen). */
export type FaseId = EtapaId | "resultados" | "inscripcion";
export type Fase = {
  id: FaseId;
  numero: number;
  titulo: string;
  href: string;
  resumen: string;
  tuHaces: string[];
  /** Lo que hace cada área de CIDETEC en esta fase */
  areasHacen: { area: Area; texto: string }[];
  requisito?: string;
  /** Proceso aparte del de admisión (no aparece en la barra de fases de admisión) */
  aparte?: boolean;
};

export const FASES: Fase[] = [
  {
    id: "registro",
    numero: 1,
    titulo: "Registro",
    href: "/aspirante/registro",
    resumen: "Tu registro inicial genera tu ID temporal y alimenta todos tus formatos.",
    tuHaces: ["Llenar el formulario de registro", "Completar tu currículum (SIP-02), imprimirlo, firmarlo y subirlo (lo encuentras hasta el final de esta página)"],
    areasHacen: [
      { area: "posgrado", texto: "Revisa tu registro inicial" },
      { area: "posgrado", texto: "Te envía instrucciones, fechas e instructivos" },
      { area: "posgrado", texto: "Recibe tu currículum firmado (SIP-02)" },
    ],
  },
  {
    id: "documentos",
    numero: 2,
    titulo: "Documentos",
    href: "/aspirante/documentos",
    resumen: "Subes tus documentos oficiales escaneados para que el Departamento de Posgrado los revise.",
    tuHaces: ["Subir tus documentos en PDF (con el límite de tamaño de la convocatoria)", "Atender observaciones, si las hay"],
    areasHacen: [
      { area: "posgrado", texto: "Valida cada documento o registra observaciones" },
      { area: "posgrado", texto: "Valida tu constancia de inglés" },
      { area: "posgrado", texto: "Puede darte prórroga para entregar tu constancia de inglés o tu título y que sigas con tu proceso" },
    ],
  },
  {
    id: "entrevista",
    numero: 3,
    titulo: "Entrevista",
    href: "/aspirante/entrevista",
    resumen: "Entrevista colegiada con 3 profesores.",
    tuHaces: ["Consultar tu cita y presentarte a tu entrevista"],
    areasHacen: [
      { area: "posgrado", texto: "Programa la fecha, hora y sala de tu cita" },
      { area: "profesores", texto: "Los profesores (colegiados o de asignatura) eligen las entrevistas en las que participan; participan 3 profesores entrevistadores" },
      { area: "profesores", texto: "Los profesores entrevistadores llenan el acta de entrevista (MTC-EC) y la firman los 3 profesores" },
      { area: "profesores", texto: "Con las 3 firmas queda el dictamen: Aprobado, Con reservas o Rechazado" },
    ],
    requisito: "Se habilita cuando tu expediente está validado.",
  },
  {
    id: "evaluacion",
    numero: 4,
    titulo: "Evaluación",
    href: "/aspirante/evaluacion",
    resumen: "Eliges cursos propedéuticos (con opción a examen) o solo examen.",
    tuHaces: ["Elegir cursos propedéuticos o solo examen", "Si eliges propedéutico, elegir tu grupo en cada curso"],
    areasHacen: [
      { area: "posgrado", texto: "Te envía fechas y horarios por correo y en tus notificaciones" },
      { area: "posgrado", texto: "Si eliges examen, te envía recordatorios 3 recordatorios: una semana antes, un día antes y el mismo día" },
      { area: "profesores", texto: "El docente de cada curso propedéutico registra tus calificaciones" },
      { area: "posgrado", texto: "La Jefatura de Posgrado registra la calificación del examen de admisión" },
    ],
    requisito: "Se habilita si tu entrevista fue aprobada.",
  },
  {
    id: "resultados",
    numero: 5,
    titulo: "Resultados",
    href: "/aspirante/resultados",
    resumen: "Publicación de resultados del curso propedéutico o del examen de admisión.",
    tuHaces: [
      "Consultar tus resultados por área cuando se publiquen",
      "Si no acreditaste una o las dos áreas del propedéutico, decidir si presentas el examen de esas áreas",
    ],
    areasHacen: [
      { area: "posgrado", texto: "Publica los resultados del curso propedéutico" },
      { area: "posgrado", texto: "Publica los resultados del examen de admisión" },
      { area: "posgrado", texto: "Si presentas examen, te envía recordatorios 3 recordatorios: una semana antes, un día antes y el mismo día" },
    ],
    requisito: "Se habilita cuando Posgrado publica tus resultados.",
  },
  {
    id: "dictamen",
    numero: 6,
    titulo: "Dictamen final",
    href: "/aspirante/dictamen",
    resumen: "Aquí se publica tu resultado del proceso de admisión (resolución del Colegio de Profesores). Con él concluye tu proceso de admisión.",
    tuHaces: ["Consultar dónde y cuándo se publican los resultados", "Ver tu resultado cuando se publique"],
    areasHacen: [
      { area: "posgrado", texto: "Genera el informe de la comisión" },
      { area: "posgrado", texto: "Registra la resolución del Colegio de Profesores y publica los resultados en SIGAP" },
    ],
    requisito: "Se habilita al acreditar tu evaluación.",
  },
  {
    id: "inscripcion",
    numero: 7,
    titulo: "Inscripción",
    href: "/aspirante/inscripcion",
    resumen: "Proceso posterior a tu admisión: integras tu expediente de inscripción y Control Escolar te asigna tu número de registro.",
    tuHaces: [
      "Subir tu fotografía",
      "Llenar, imprimir, firmar y subir tu SIP-01 (con tus materias), SIP-05 y SIP-06",
      "Llenar tu dictamen SIP-04 con tu dedicación, imprimirlo, recabar las firmas y subirlo",
      "Firmar y subir tu programa individual (SIP-08) cuando Control Escolar lo publique",
      "Actualizar tu currículum (SIP-02) si cambió algo",
    ],
    areasHacen: [
      { area: "uteycv", texto: "Elabora y publica tu programa individual (SIP-08)" },
      { area: "uteycv", texto: "Revisa tu expediente de inscripción y carga las versiones con todas las firmas" },
      { area: "uteycv", texto: "Registra tu número SICEP; con él inicias sesión como alumno" },
    ],
    requisito: "Se habilita cuando se publica tu resultado de admisión (Aceptado o Con reservas) y no te falta ningún documento.",
    aparte: true,
  },
];

export const faseDe = (id: FaseId) => FASES.find((f) => f.id === id)!;
