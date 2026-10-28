"use client";

import { useSyncExternalStore } from "react";
import { PERIODO_ESCOLAR, periodoEscolar } from "@/lib/config";

const nada = () => () => {};

/** Periodo escolar vigente (2026-B…): cambia solo al iniciar enero y julio, sin volver a desplegar. */
export function PeriodoEscolar() {
  return <>{useSyncExternalStore(nada, () => periodoEscolar(), () => PERIODO_ESCOLAR)}</>;
}
