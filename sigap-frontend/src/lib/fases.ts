import type { EtapaId } from "./admision";
import type { Area } from "./config";

/** Qué pasa en cada fase del proceso, desde el punto de vista del aspirante. */
/** Fases que ve el aspirante: las etapas del proceso más la publicación de resultados (entre evaluación y dictamen). */
export type FaseId = EtapaId | "resultados";
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
  fuente: string;
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
      { area: "posgrado", texto: "Revisa tu registro inicial (RF-49)" },
      { area: "posgrado", texto: "Te envía instrucciones, fechas e instructivos (RF-50, RF-51)" },
      { area: "posgrado", texto: "Recibe tu currículum firmado (SIP-02)" },
    ],
    fuente: "CU-ADM-01 · RF-01, RF-02, RF-25",
  },
  {
    id: "documentos",
    numero: 2,
    titulo: "Documentos",
    href: "/aspirante/documentos",
    resumen: "Subes tus documentos oficiales escaneados para que el Departamento de Posgrado los revise.",
    tuHaces: ["Subir tus documentos en PDF (con el límite de tamaño de la convocatoria)", "Atender observaciones, si las hay"],
    areasHacen: [
      { area: "posgrado", texto: "Valida cada documento o registra observaciones (RF-05, RF-06, RF-52)" },
      { area: "posgrado", texto: "Valida tu constancia de inglés (RF-53, RN-09)" },
      { area: "posgrado", texto: "Puede darte prórroga para entregar tu constancia de inglés o tu título y que sigas con tu proceso" },
    ],
    fuente: "CU-ADM-02, CU-ADM-03 · RF-03 a RF-07, RF-52",
  },
  {
    id: "entrevista",
    numero: 3,
    titulo: "Entrevista",
    href: "/aspirante/entrevista",
    resumen: "Entrevista colegiada con 3 profesores.",
    tuHaces: ["Consultar tu cita y presentarte a tu entrevista"],
    areasHacen: [
      { area: "posgrado", texto: "Programa la cita y el sínodo de 3 profesores (RF-55, RF-56, RN-07)" },
      { area: "posgrado", texto: "Los profesores del sínodo llenan el acta de entrevista (MTC-EC)" },
      { area: "posgrado", texto: "Registra el dictamen: Aprobado, Con reservas o Rechazado (RF-12)" },
    ],
    requisito: "Se habilita cuando tu expediente está validado.",
    fuente: "CU-ADM-04, CU-ADM-05 · RF-10 a RF-12, RN-07",
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
      { area: "posgrado", texto: "Si eliges examen, te envía recordatorios cada 5 días, un día antes y el mismo día" },
      { area: "posgrado", texto: "Registra tus calificaciones por área (RF-16)" },
    ],
    requisito: "Se habilita si tu entrevista fue aprobada.",
    fuente: "CU-ADM-06 · RF-15 a RF-18, RN-08",
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
      { area: "posgrado", texto: "Si presentas examen, te envía recordatorios cada 5 días, un día antes y el mismo día" },
    ],
    requisito: "Se habilita cuando Posgrado publica tus resultados.",
    fuente: "RF-16, RF-17, RN-08",
  },
  {
    id: "dictamen",
    numero: 6,
    titulo: "Dictamen final",
    href: "/aspirante/dictamen",
    resumen: "La Comisión de Admisión emite tu dictamen (SIP-04). Con él concluye tu proceso de admisión.",
    tuHaces: ["Confirmar tus datos del dictamen", "Descargar tu dictamen firmado"],
    areasHacen: [
      { area: "posgrado", texto: "Genera el informe de la comisión (RF-57)" },
      { area: "posgrado", texto: "Registra la resolución del Colegio de Profesores (RF-59)" },
      { area: "uteycv", texto: "Elabora tu dictamen (SIP-04), recaba las firmas y lo publica" },
    ],
    requisito: "Se habilita al acreditar tu evaluación.",
    fuente: "CU-ADM-07 · RF-22, RF-57 a RF-59",
  },
];

export const faseDe = (id: FaseId) => FASES.find((f) => f.id === id)!;
