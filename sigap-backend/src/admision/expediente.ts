/**
 * Expediente que el aspirante entrega desde su portal: documentos escaneados (y el SIP-02 firmado, solo quienes se
 * registraron en línea). Reglas:
 * - Puede subir un documento que falta, uno con observaciones de Posgrado o uno en prórroga.
 * - Uno que ya mandó (por revisar) o que ya se aprobó queda bloqueado: solo Posgrado lo cambia.
 * - Le falten o no documentos, sigue con su proceso (los necesitará para inscribirse).
 */

/** Documentos escaneados del expediente, en el orden en que se muestran. */
export const DOCUMENTOS_EXPEDIENTE = ['titulo', 'constancia-titulacion', 'cedula', 'certificado', 'ingles', 'curp', 'acta', 'identificacion', 'extranjero'];

/** Catálogo de documentos (los que aún no existían se agregan al registrarse el primer aspirante en línea). */
export const CATALOGO_EXPEDIENTE: Record<string, { nombre: string; obligatorio: boolean; descripcion?: string }> = {
  titulo: { nombre: 'Título de licenciatura', obligatorio: true },
  'constancia-titulacion': { nombre: 'Constancia de trámite de titulación o acta de examen profesional', obligatorio: false },
  certificado: { nombre: 'Certificado de estudios', obligatorio: true },
  ingles: { nombre: 'Constancia de dominio de inglés', obligatorio: true },
  curp: { nombre: 'CURP', obligatorio: false },
  acta: { nombre: 'Acta de nacimiento', obligatorio: true },
  identificacion: { nombre: 'Identificación oficial', obligatorio: true },
  extranjero: { nombre: 'Documentos extranjeros apostillados y traducción', obligatorio: false },
  'sip-02': { nombre: 'Currículum vitae (SIP-02)', obligatorio: true },
};

export type EstadoDocAspirante = 'falta' | 'revision' | 'aprobado' | 'observado' | 'prorroga';

export function estadoParaAspirante(d: { estado: string; nombreArchivo: string | null }): EstadoDocAspirante {
  if (d.estado === 'APROBADO') return 'aprobado';
  if (d.estado === 'OBSERVADO') return 'observado';
  if (d.estado === 'PRORROGA') return 'prorroga';
  return d.nombreArchivo ? 'revision' : 'falta';
}

export const puedeSubir = (e: EstadoDocAspirante) => e === 'falta' || e === 'observado' || e === 'prorroga';

/** Datos que el aspirante guarda desde su portal (Postulacion.expediente). */
export type ExpedienteAspirante = {
  /** Se registró con el formulario en línea de SIGAP (los cargados desde el Excel no) */
  enLinea?: boolean;
  registradoEl?: string;
  /** Confirmó que sus datos son correctos */
  verificadoEl?: string;
  /** Última vez que abrió sus notificaciones */
  notificacionesVistasEl?: string;
  /** Posgrado generó su contraseña temporal */
  accesoGeneradoEl?: string;
  [k: string]: unknown;
};

/** Convocatorias por fechas (las define Posgrado; mismas fechas por omisión que el front). */
export type ConfigConvocatorias = Record<'A' | 'B', { nombre: string; inicio: string; cierre: string }> & { limiteMB?: number };
export const CONVOCATORIAS_DEFECTO: ConfigConvocatorias = {
  A: { nombre: 'Convocatoria de admisión A-27', inicio: '2026-10-05', cierre: '2026-11-20' },
  B: { nombre: 'Convocatoria de admisión B-27', inicio: '2027-04-05', cierre: '2027-05-21' },
  limiteMB: 5,
};

export function convocatorias(valor: unknown): ConfigConvocatorias {
  const g = (valor ?? {}) as Partial<ConfigConvocatorias>;
  const d = CONVOCATORIAS_DEFECTO;
  return { A: { ...d.A, ...g.A }, B: { ...d.B, ...g.B }, limiteMB: g.limiteMB ?? d.limiteMB };
}

/** Fecha de hoy en la Ciudad de México (AAAA-MM-DD). */
export const hoyMexico = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Mexico_City' });

export const esPdf = (b: Buffer) => b.subarray(0, 5).toString() === '%PDF-';
