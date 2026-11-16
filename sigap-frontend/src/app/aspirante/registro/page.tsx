"use client";

import { DEMO_ASPIRANTES, MODO_API } from "@/lib/api";
import { RegistroServidor } from "@/components/portal/RegistroServidor";
import { FaseEncabezado } from "@/components/expediente/FaseEncabezado";
import { FormatosFase } from "@/components/expediente/FormatosFase";
import { ResumenRegistro } from "@/components/expediente/ResumenRegistro";

export default function FaseRegistro() {
  if (MODO_API && !DEMO_ASPIRANTES) return <RegistroServidor />;
  return (
    <>
      <FaseEncabezado id="registro" />
      <div className="space-y-6">
        <ResumenRegistro />
        <FormatosFase fase="registro" />
      </div>
    </>
  );
}
