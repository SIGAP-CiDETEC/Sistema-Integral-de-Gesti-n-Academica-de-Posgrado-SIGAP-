"use client";

import { DEMO_ASPIRANTES, MODO_API } from "@/lib/api";
import { ConPestana } from "@/components/portal/PortalComun";
import { EleccionServidor } from "@/components/portal/EleccionServidor";
import { TarjetaExamenLinea } from "@/components/examen/TarjetaExamenLinea";
import { FaseEncabezado } from "@/components/expediente/FaseEncabezado";
import { ModalidadEvaluacion } from "@/components/expediente/ModalidadEvaluacion";

export default function FaseEvaluacion() {
  if (MODO_API && !DEMO_ASPIRANTES)
    return (
      <ConPestana id="evaluacion">
        {() => (
          <>
            <TarjetaExamenLinea />
            <EleccionServidor />
          </>
        )}
      </ConPestana>
    );
  return (
    <>
      <FaseEncabezado id="evaluacion" />
      <TarjetaExamenLinea />
      <ModalidadEvaluacion />
    </>
  );
}
