"use client";

import { DEMO_ASPIRANTES, MODO_API } from "@/lib/api";
import { DocumentosServidor } from "@/components/portal/DocumentosServidor";
import { DocumentosFase } from "@/components/expediente/DocumentosFase";
import { FormatosFase } from "@/components/expediente/FormatosFase";
import { FaseEncabezado } from "@/components/expediente/FaseEncabezado";

export default function FaseDocumentos() {
  if (MODO_API && !DEMO_ASPIRANTES) return <DocumentosServidor />;
  return (
    <>
      <FaseEncabezado id="documentos" />
      <div className="space-y-6">
        <FormatosFase fase="documentos" />
        <DocumentosFase fase="documentos" conEnvio />
      </div>
    </>
  );
}
