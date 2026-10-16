"use client";

import { documentosDeFase, esRequerido } from "@/lib/documentos";
import { useEstadoAdmision, useRevisionDocs } from "@/lib/posgrado/revision";
import { useExpediente } from "./ExpedienteProvider";

/** Documentos obligatorios que faltan (los que tienen prórroga de Posgrado no cuentan como faltantes). */
export function useDocumentosFaltantes() {
  const { registro, documentos } = useExpediente();
  const revision = useRevisionDocs();
  return documentosDeFase("documentos", registro).filter(
    (d) => esRequerido(d, registro) && !documentos[d.id] && revision[d.id]?.estado !== "prorroga",
  );
}

/**
 * Por qué un formato todavía no se puede llenar (null = habilitado).
 * - RF-22: el SIP-04 (y los demás formatos de inscripción) solo se habilita a quien fue admitido por el Colegio.
 * - RN-11: los formatos de inscripción (SIP-01, SIP-04, SIP-05 y SIP-06) bloqueados mientras falten documentos.
 */
export function useBloqueoFormato(clave: string): string | null {
  const faltan = useDocumentosFaltantes();
  const estado = useEstadoAdmision();
  const admitido = !estado.concluido && (estado.resolucion === "Aceptado" || estado.resolucion === "Con reservas");
  if (clave === "sip-04" && !admitido) return "Se habilita cuando se publique tu resultado de admisión y seas admitido(a) por el Colegio de Profesores (RF-22).";
  if (["sip-01", "sip-04", "sip-05", "sip-06"].includes(clave) && faltan.length)
    return `Se habilita cuando subas todos tus documentos obligatorios (RN-11). Faltan: ${faltan.map((d) => d.nombre.toLowerCase()).join(", ")}.`;
  return null;
}
