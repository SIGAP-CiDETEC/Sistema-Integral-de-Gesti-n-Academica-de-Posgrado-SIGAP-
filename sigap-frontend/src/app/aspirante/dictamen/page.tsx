"use client";

import { DictamenServidor } from "@/components/portal/ResultadosServidor";
import { DEMO_ASPIRANTES, MODO_API } from "@/lib/api";
import { FaseEncabezado } from "@/components/expediente/FaseEncabezado";
import { PublicacionResultados } from "@/components/expediente/PublicacionResultados";

/** 6 · Dictamen final: dónde se publican los resultados y, ya publicados, el resultado del aspirante. */
export default function FaseDictamen() {
  // Con el servidor real: solo lo que Posgrado publicó
  if (MODO_API && !DEMO_ASPIRANTES) return <DictamenServidor />;
  return (
    <>
      <FaseEncabezado id="dictamen" />
      <PublicacionResultados />
    </>
  );
}
