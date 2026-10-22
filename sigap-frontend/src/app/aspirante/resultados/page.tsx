import { FaseEncabezado } from "@/components/expediente/FaseEncabezado";
import { ResultadosAspirante } from "@/components/expediente/ResultadosAspirante";

export default function FaseResultados() {
  return (
    <>
      <FaseEncabezado id="resultados" />
      <ResultadosAspirante />
    </>
  );
}
