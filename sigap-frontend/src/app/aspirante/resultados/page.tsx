"use client";

import { ResultadosServidor } from "@/components/portal/ResultadosServidor";
import { DEMO_ASPIRANTES, MODO_API } from "@/lib/api";
import { FaseEncabezado } from "@/components/expediente/FaseEncabezado";
import { ResultadosAspirante } from "@/components/expediente/ResultadosAspirante";

export default function FaseResultados() {
  // Con el servidor real: solo lo que Posgrado publicó
  if (MODO_API && !DEMO_ASPIRANTES) return <ResultadosServidor />;
  return (
    <>
      <FaseEncabezado id="resultados" />
      <ResultadosAspirante />
    </>
  );
}
