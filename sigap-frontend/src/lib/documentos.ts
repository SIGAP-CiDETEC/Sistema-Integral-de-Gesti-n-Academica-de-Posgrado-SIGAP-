import type { Respuestas } from "./registro-form";
import type { FaseId } from "./fases";

/**
 * Documentos que el aspirante SUBE (escaneados). Los formatos SIP que el sistema
 * llena por él están en formatos.ts — así se evita pedir archivos que el sistema
 * puede generar.
 *
 * Fuentes: RF-52, CU-ADM-02, RN-09, Reglamento de Estudios de Posgrado (Art. 7 y 11).
 */

export type Documento = {
  id: string;
  nombre: string;
  descripcion: string;
  fase: FaseId;
  /** true = siempre; función = depende de las respuestas del registro */
  requerido: boolean | ((r: Respuestas) => boolean);
  /** Si devuelve false, el documento no aplica y no se muestra */
  aplica?: (r: Respuestas) => boolean;
  formatos: "pdf" | "imagen";
  maxMB: number;
  nota?: string;
};

export const DOCUMENTOS: Documento[] = [
  {
    id: "titulo",
    nombre: "Título de licenciatura",
    descripcion: "Anverso y reverso en un solo PDF.",
    fase: "documentos",
    requerido: true,
    aplica: (r) => r.titulado !== "No",
    formatos: "pdf",
    maxMB: 5,
    nota: "Si tu título está en trámite, Posgrado puede darte prórroga para entregarlo y seguir con tu proceso.",
  },
  {
    id: "constancia-titulacion",
    nombre: "Constancia de trámite de titulación o acta de examen profesional",
    descripcion: "Como indicaste que aún no te titulas, el certificado de estudios acredita la licenciatura (REP Art. 7-I).",
    fase: "documentos",
    requerido: false,
    aplica: (r) => r.titulado === "No",
    formatos: "pdf",
    maxMB: 5,
  },
  {
    id: "certificado",
    nombre: "Certificado de estudios de licenciatura",
    descripcion: "Total, con promedio general. Anverso y reverso legibles.",
    fase: "documentos",
    requerido: true,
    formatos: "pdf",
    maxMB: 5,
    nota: "Si tu título está en trámite, Posgrado puede darte prórroga para entregarlo y seguir con tu proceso.",
  },
  {
    id: "ingles",
    nombre: "Constancia de dominio de inglés",
    descripcion: "Nivel B1 en dos habilidades con calificación mínima de 8.",
    fase: "documentos",
    requerido: true,
    formatos: "pdf",
    maxMB: 5,
    nota: "La validación corresponde al Departamento de Posgrado. Si la constancia es distinta a la del CENLEX, Posgrado validará ante la DFLE; este trámite puede tardar más de 40 días.",
  },
  {
    id: "curp",
    nombre: "CURP",
    descripcion: "Solo si tu nacionalidad es mexicana. Formato actualizado descargado de gob.mx dentro de los últimos 3 meses.",
    fase: "documentos",
    requerido: false,
    formatos: "pdf",
    maxMB: 5,
  },
  {
    id: "acta-nacimiento",
    nombre: "Acta de nacimiento",
    descripcion: "Copia legible.",
    fase: "documentos",
    requerido: true,
    formatos: "pdf",
    maxMB: 5,
  },
  {
    id: "identificacion",
    nombre: "Identificación oficial",
    descripcion: "INE por ambos lados. Extranjeros: tarjeta de residente (FM3) o visa o pasaporte.",
    fase: "documentos",
    requerido: true,
    formatos: "pdf",
    maxMB: 5,
  },
  {
    id: "extranjero",
    nombre: "Documentos extranjeros apostillados y traducción",
    descripcion: "Solo si tus estudios son de una institución fuera de México.",
    fase: "documentos",
    requerido: false,
    formatos: "pdf",
    maxMB: 5,
  },
  {
    id: "foto",
    nombre: "Fotografía tamaño infantil",
    descripcion: "A color, de frente, con fondo blanco. Se coloca automáticamente en tu SIP-01.",
    fase: "inscripcion",
    requerido: true,
    formatos: "imagen",
    maxMB: 2,
    nota: "Rostro descubierto: sin lentes, gorra, sombrero ni accesorios que cubran la cara, y con orejas y frente visibles. Imagen JPG o PNG de máximo 2 MB.",
  },
];

export const documentosDeFase = (fase: FaseId, r: Respuestas) =>
  DOCUMENTOS.filter((d) => d.fase === fase && (d.aplica ? d.aplica(r) : true));

export const esRequerido = (d: Documento, r: Respuestas) =>
  typeof d.requerido === "function" ? d.requerido(r) : d.requerido;
