import { FaseEncabezado, FuenteFase } from "@/components/expediente/FaseEncabezado";
import { ResultadosAspirante } from "@/components/expediente/ResultadosAspirante";

export default function FaseResultados() {
  return (
    <>
      <FaseEncabezado id="resultados" />
      <ResultadosAspirante />
      <FuenteFase id="resultados" />
    </>
  );
}
