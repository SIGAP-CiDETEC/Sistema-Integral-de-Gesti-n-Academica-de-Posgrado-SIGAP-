"use client";

import { AREAS_INVESTIGACION } from "../registro-form";
import { CRITERIOS_ACTA, nombreProfesor, type ActaEntrevista, type AspiranteP } from "../posgrado/datos";
import { convocatoriaActual } from "../config";
import { rellenarPdf } from "./rellenar";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Genera el acta MTC-EC (2 hojas) con lo que capturó el sínodo. Devuelve una URL del PDF. */
export async function generarActaMtcEc(a: AspiranteP, acta: ActaEntrevista): Promise<string> {
  const h = acta.hoja1;
  const [anio, mes, dia] = (a.entrevista?.fecha ?? "").split("-").map(Number);
  const ipn = a.procedencia.startsWith("IPN");
  const valores: Record<string, string | string[]> = {
    semestreIngreso: convocatoriaActual.nombre.split(" ").pop() ?? "",
    fechaEntrevista: anio ? `${dia} de ${MESES[mes - 1]} de ${anio}` : "",
    nombreCompleto: a.nombre,
    areasRanking: h.areas.filter((x) => AREAS_INVESTIGACION.includes(x)),
    becaSecihti: h.becaSecihti ?? "",
    sinBeca: h.sinBeca ?? "",
    profesorInteres: h.profesorInteres ?? "",
    profesorNombre: h.profesorNombre ?? "",
    horario: h.horario ?? "",
    ingles2: h.ingles2 ?? "",
    inglesSituacion: h.inglesSituacion ?? "",
    promedio: a.promedio,
    certificadoTiene: h.certificado ?? "",
    certificadoSituacion: h.certificadoSituacion ?? "",
    escuelaOrigen: ipn ? "IPN" : "Externo",
    escuelaNombre: ipn ? a.procedencia.replace(/^IPN\s*—\s*/, "") : a.procedencia,
    argumentacion: h.argumentacion ?? "",
    ...Object.fromEntries(CRITERIOS_ACTA.map((c) => [`c_${c.id}`, acta.criterios[c.id] ?? ""])),
    proyeccion: acta.proyeccion,
    observaciones: acta.observaciones,
    continuar: acta.resolucion,
    motivo: acta.motivo,
    ...Object.fromEntries((a.entrevista?.sinodo ?? []).map((p, i) => [`prof${i + 1}`, nombreProfesor(p)])),
  };
  const bytes = await (await fetch("/formatos/mtc-ec.pdf")).arrayBuffer();
  const pdf = await rellenarPdf("mtc-ec", bytes, { valores, hoy: new Date() });
  return URL.createObjectURL(new Blob([pdf as BlobPart], { type: "application/pdf" }));
}
