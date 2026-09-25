import type { EtapaId } from "./admision";
import type { Area } from "./config";

/** Qué pasa en cada fase del proceso, desde el punto de vista del aspirante. */
export type Fase = {
  id: EtapaId;
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
    tuHaces: ["Llenar el formulario de registro", "Completar tu currículum (SIP-02), imprimirlo, firmarlo y subirlo"],
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
    resumen: "Subes tus documentos oficiales y las cartas que el sistema redacta por ti, ya firmadas.",
    tuHaces: ["Subir tus documentos en PDF (con el límite de tamaño de la convocatoria)", "Descargar SIP-05 y SIP-06, firmarlos a mano y subirlos", "Atender observaciones, si las hay"],
    areasHacen: [
      { area: "posgrado", texto: "Valida cada documento o registra observaciones (RF-05, RF-06, RF-52)" },
      { area: "uteycv", texto: "Envía tu constancia de inglés a la DFLE para su aval, salvo que sea de CELEX o CENLEX (RF-53, RN-09)" },
      { area: "posgrado", texto: "Puede darte prórroga para entregar tu constancia de inglés o tu título y que sigas con tu proceso" },
      { area: "uteycv", texto: "Recibe tus cartas firmadas (SIP-05 y SIP-06)" },
    ],
    fuente: "CU-ADM-02, CU-ADM-03 · RF-03 a RF-07, RF-52",
  },
  {
    id: "entrevista",
    numero: 3,
    titulo: "Entrevista",
    href: "/aspirante/entrevista",
    resumen: "Entrevista colegiada con 3 profesores. Llegas con tus datos del acta ya capturados.",
    tuHaces: ["Consultar tu cita", "Llenar tus datos para el acta de entrevista (MTC-EC)"],
    areasHacen: [
      { area: "posgrado", texto: "Programa la cita y el sínodo de 3 profesores (RF-55, RF-56, RN-07)" },
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
      { area: "posgrado", texto: "Registra tu resultado (RF-16)" },
      { area: "posgrado", texto: "Si repruebas el propedéutico, habilita el examen como segunda oportunidad (RN-08)" },
    ],
    requisito: "Se habilita si tu entrevista fue aprobada.",
    fuente: "CU-ADM-06 · RF-15 a RF-18, RN-08",
  },
  {
    id: "dictamen",
    numero: 5,
    titulo: "Dictamen final",
    href: "/aspirante/dictamen",
    resumen: "La Comisión de Admisión emite tu dictamen (SIP-04).",
    tuHaces: ["Consultar y descargar tu dictamen"],
    areasHacen: [
      { area: "posgrado", texto: "Genera el informe de la comisión (RF-57)" },
      { area: "posgrado", texto: "Registra la resolución del Colegio de Profesores (RF-59)" },
      { area: "uteycv", texto: "Elabora tu dictamen (SIP-04), recaba las firmas y lo publica" },
    ],
    requisito: "Se habilita al acreditar tu evaluación.",
    fuente: "CU-ADM-07 · RF-22, RF-57 a RF-59",
  },
  {
    id: "matricula",
    numero: 6,
    titulo: "Matrícula",
    href: "/aspirante/matricula",
    resumen: "Formalizas tu inscripción y recibes tu boleta definitiva.",
    tuHaces: ["Subir tu fotografía", "Descargar tu SIP-01, firmarlo y subirlo", "Firmar y subir tu programa individual (SIP-08)"],
    areasHacen: [
      { area: "uteycv", texto: "Recibe tu solicitud de inscripción (SIP-01) y tu programa individual (SIP-08)" },
      { area: "uteycv", texto: "Registra en SICEP la dedicación que elegiste en tu carta protesta (SIP-05) (RF-68, RN-10)" },
      { area: "uteycv", texto: "Registra tu número SICEP; tu boleta reemplaza al ID temporal (RF-29, RF-30)" },
    ],
    requisito: "Se habilita con dictamen favorable.",
    fuente: "CU-ADM-08 · RF-21, RF-24, RF-29 a RF-31, RN-10, RN-12",
  },
];

export const faseDe = (id: EtapaId) => FASES.find((f) => f.id === id)!;
