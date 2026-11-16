"use client";

import { ResultadosServidor } from "@/components/portal/ResultadosServidor";
import { DEMO_ASPIRANTES, MODO_API } from "@/lib/api";
import { ConPestana } from "@/components/portal/PortalComun";
import { FaseEncabezado } from "@/components/expediente/FaseEncabezado";
import { ResultadosAspirante } from "@/components/expediente/ResultadosAspirante";

export default function FaseResultados() {
  // Con el servidor real: solo lo que Posgrado publicó
  if (MODO_API && !DEMO_ASPIRANTES) return <ConPestana id="resultados">{() => <ResultadosServidor />}</ConPestana>;
  return (
    <>
      <FaseEncabezado id="resultados" />
      <ResultadosAspirante />
    </>
  );
}
