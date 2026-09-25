import { FaseEncabezado, FuenteFase } from "@/components/expediente/FaseEncabezado";
import { ModalidadEvaluacion } from "@/components/expediente/ModalidadEvaluacion";

export default function FaseEvaluacion() {
  return (
    <>
      <FaseEncabezado id="evaluacion" />
      <ModalidadEvaluacion />
      <FuenteFase id="evaluacion" />
    </>
  );
}
