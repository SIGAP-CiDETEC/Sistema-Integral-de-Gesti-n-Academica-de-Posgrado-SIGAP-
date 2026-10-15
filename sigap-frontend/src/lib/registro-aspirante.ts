import { REGISTRO_DEMO } from "./aspirante-datos";
import { procedenciaSeparada } from "./reporte-aspirantes";
import { AREAS_INVESTIGACION, UNIDADES_IPN, type Respuestas } from "./registro-form";
import { type ActaEntrevista, type AspiranteP } from "./posgrado/datos";

/**
 * Respuestas del registro (primer formulario) de un aspirante de ejemplo.
 * SOLO CASCARÓN: los aspirantes de ejemplo no llenaron el registro en este navegador, así que se arma
 * con sus datos (nombre, CURP, procedencia…) sobre las respuestas de ejemplo. Con backend: GET /aspirantes/:id/registro.
 */
export function registroSintetico(a: AspiranteP): Respuestas {
  const [nombre, ...apellidos] = a.nombre.split(" ");
  const { institucion, unidad } = procedenciaSeparada(a.procedencia);
  const inst = ["IPN", "UNAM", "UAM"].includes(institucion) ? institucion : "Otros";
  const unidadIpn = inst === "IPN" ? (UNIDADES_IPN.find((u) => u.split(" — ")[0] === unidad) ?? "Otra unidad del IPN") : undefined;
  const r: Respuestas = {
    ...REGISTRO_DEMO,
    nombre,
    apellidoPaterno: apellidos.slice(0, -1).join(" ") || apellidos[0] || "",
    apellidoMaterno: apellidos.length > 1 ? apellidos.at(-1)! : "",
    curp: a.curp,
    correo: a.correo,
    telefono: a.telefono,
    promedio: a.promedio,
    institucion: inst,
  };
  if (unidadIpn) r.unidadIpn = unidadIpn;
  else delete r.unidadIpn;
  if (inst !== "IPN" || unidadIpn === "Otra unidad del IPN") r.unidadNombre = unidad || institucion;
  return r;
}

/**
 * Hoja 1 del acta MTC-EC prellenada con lo que el aspirante ya dio en su registro, su expediente
 * y (si lo llenó) su parte del formato MTC-EC. El sínodo solo confirma o completa durante la entrevista.
 */
export function hoja1Prellenada(a: AspiranteP, r: Respuestas, capturas: Record<string, unknown> = {}): ActaEntrevista["hoja1"] {
  const sn = (v: unknown) => (v === "Sí" || v === "No" ? v : undefined);
  const txt = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const areasCap = Array.isArray(capturas.areasRanking) ? (capturas.areasRanking as string[]) : undefined;
  const areasReg = Array.isArray(r.areasInteres) ? (r.areasInteres as string[]) : [];
  const ingles = a.documentos.find((d) => d.id === "ingles");
  const horario = capturas.horario;
  return {
    areas: (areasCap ?? areasReg).filter((x) => AREAS_INVESTIGACION.includes(x)).slice(0, 3),
    becaSecihti: sn(capturas.becaSecihti),
    sinBeca: sn(capturas.sinBeca),
    profesorInteres: sn(capturas.profesorInteres),
    profesorNombre: txt(capturas.profesorNombre),
    horario: horario === "Matutino" || horario === "Vespertino" || horario === "Indistinto" ? horario : undefined,
    ingles2: ingles?.estado === "aprobado" ? "Sí" : ingles ? "No" : undefined,
    inglesSituacion:
      txt(capturas.inglesSituacion) ??
      (ingles?.estado === "aprobado"
        ? "Constancia validada por Posgrado"
        : ingles?.estado === "prorroga"
          ? `En prórroga${ingles.prorrogaHasta ? ` hasta ${ingles.prorrogaHasta}` : ""}`
          : ingles
            ? "Constancia en revisión"
            : undefined),
    certificado: sn(r.certificado),
    certificadoSituacion: txt(r.causaNoCertificado),
    argumentacion: txt(capturas.argumentacion),
  };
}

/** Acta MTC-EC con solo la hoja 1 prellenada (para imprimir o revisar antes de la entrevista). */
export const actaPrellenada = (hoja1: ActaEntrevista["hoja1"]): ActaEntrevista => ({
  hoja1,
  criterios: {},
  proyeccion: "",
  observaciones: "",
  resolucion: "" as ActaEntrevista["resolucion"],
  motivo: "",
  capturadaPor: "",
  capturadaEl: "",
  firmas: {},
});

