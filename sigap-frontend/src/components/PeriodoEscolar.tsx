"use client";

import { useSyncExternalStore } from "react";
import { PERIODO_ESCOLAR, periodoEscolar } from "@/lib/config";

const nada = () => () => {};

/** Periodo escolar de la admisión en curso (A-27, B-27…): cambia solo el 1 de enero y el 1 de julio, sin volver a desplegar. */
export function PeriodoEscolar() {
  return <>{useSyncExternalStore(nada, () => periodoEscolar(), () => PERIODO_ESCOLAR)}</>;
}
