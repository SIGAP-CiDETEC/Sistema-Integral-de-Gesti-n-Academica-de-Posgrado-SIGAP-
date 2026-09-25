import type { Respuestas } from "./registro-form";
import type { EtapaId } from "./admision";

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
  fase: EtapaId;
  /** true = siempre; función = depende de las respuestas del registro */
  requerido: boolean | ((r: Respuestas) => boolean);
  /** Si devuelve false, el documento no aplica y no se muestra */
  aplica?: (r: Respuestas) => boolean;
  formatos: "pdf" | "imagen";
  maxMB: number;
  nota?: string;
  fuente: string;
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
    fuente: "RF-52 · REP Art. 7-I",
  },
  {
    id: "cedula",
    nombre: "Cédula profesional",
    descripcion: "Si aún está en trámite, sube el comprobante del trámite.",
    fase: "documentos",
    requerido: false,
    aplica: (r) => r.titulado !== "No",
    formatos: "pdf",
    maxMB: 5,
    fuente: "CU-ADM-02",
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
    fuente: "REP Art. 7-I",
  },
  {
    id: "certificado",
    nombre: "Certificado de estudios de licenciatura",
    descripcion: "Total, con promedio general. Anverso y reverso legibles.",
    fase: "documentos",
    requerido: true,
    formatos: "pdf",
    maxMB: 5,
    fuente: "RF-52 · REP Art. 7-I",
  },
  {
    id: "ingles",
    nombre: "Constancia de inglés",
    descripcion: "Nivel B1 en dos habilidades con calificación mínima de 8.",
    fase: "documentos",
    requerido: true,
    formatos: "pdf",
    maxMB: 5,
    nota: "Requiere aval de la DFLE, que gestiona Control Escolar (UTEyCV), salvo constancias de CELEX o CENLEX (RF-53, RN-09). Si aún no la tienes, Posgrado puede darte prórroga para entregarla y seguir con tu proceso.",
    fuente: "RF-09 · RN-09 · REP Art. 7-IV",
  },
  {
    id: "curp",
    nombre: "CURP",
    descripcion: "Formato actualizado descargado de gob.mx.",
    fase: "documentos",
    requerido: true,
    formatos: "pdf",
    maxMB: 5,
    fuente: "RF-52",
  },
  {
    id: "acta-nacimiento",
    nombre: "Acta de nacimiento",
    descripcion: "Copia legible.",
    fase: "documentos",
    requerido: true,
    formatos: "pdf",
    maxMB: 5,
    fuente: "RF-52",
  },
  {
    id: "identificacion",
    nombre: "Identificación oficial",
    descripcion: "INE por ambos lados. Extranjeros: tarjeta de residente (FM3) o visa.",
    fase: "documentos",
    requerido: true,
    formatos: "pdf",
    maxMB: 5,
    fuente: "RF-52",
  },
  {
    id: "extranjero",
    nombre: "Documentos extranjeros apostillados y traducción",
    descripcion: "Solo si tus estudios son de una institución fuera de México.",
    fase: "documentos",
    requerido: false,
    formatos: "pdf",
    maxMB: 5,
    fuente: "REP Art. 11",
  },
  {
    id: "foto",
    nombre: "Fotografía tamaño infantil",
    descripcion: "Fondo blanco, de frente. Se coloca automáticamente en tu SIP-01.",
    fase: "matricula",
    requerido: true,
    formatos: "imagen",
    maxMB: 2,
    fuente: "SIP-01",
  },
];

export const documentosDeFase = (fase: EtapaId, r: Respuestas) =>
  DOCUMENTOS.filter((d) => d.fase === fase && (d.aplica ? d.aplica(r) : true));

export const esRequerido = (d: Documento, r: Respuestas) =>
  typeof d.requerido === "function" ? d.requerido(r) : d.requerido;
