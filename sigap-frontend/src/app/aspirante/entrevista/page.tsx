"use client";

import { DEMO_ASPIRANTES, MODO_API } from "@/lib/api";
import { ConPestana } from "@/components/portal/PortalComun";
import { EntrevistaServidor } from "@/components/portal/EntrevistaServidor";
import { CitaEntrevista } from "@/components/expediente/CitaEntrevista";
import { FaseEncabezado } from "@/components/expediente/FaseEncabezado";
import { FormatosFase } from "@/components/expediente/FormatosFase";
import { RecordatoriosEntrevista } from "@/components/expediente/Recordatorios";

export default function FaseEntrevista() {
  if (MODO_API && !DEMO_ASPIRANTES) return <ConPestana id="entrevista">{(yo) => <EntrevistaServidor yo={yo} />}</ConPestana>;
  return (
    <>
      <FaseEncabezado id="entrevista" />
      <div className="space-y-6">
        <CitaEntrevista />
        <RecordatoriosEntrevista />
        <FormatosFase fase="entrevista" />
      </div>
    </>
  );
}
