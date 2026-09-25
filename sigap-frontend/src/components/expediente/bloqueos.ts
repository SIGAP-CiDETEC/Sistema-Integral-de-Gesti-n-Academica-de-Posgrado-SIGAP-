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
 * - RN-11: SIP-01, SIP-05 y SIP-06 bloqueados mientras falten documentos.
 * - RF-22: el SIP-04 solo se habilita a quien acreditó la evaluación.
 */
export function useBloqueoFormato(clave: string): string | null {
  const faltan = useDocumentosFaltantes();
  const estado = useEstadoAdmision();
  if (["sip-01", "sip-05", "sip-06"].includes(clave) && faltan.length)
    return `Se habilita cuando subas todos tus documentos obligatorios (RN-11). Faltan: ${faltan.map((d) => d.nombre.toLowerCase()).join(", ")}.`;
  if (clave === "sip-04" && !["dictamen", "matricula"].includes(estado.etapa))
    return "Se habilita cuando acredites tu evaluación (RF-22).";
  return null;
}
