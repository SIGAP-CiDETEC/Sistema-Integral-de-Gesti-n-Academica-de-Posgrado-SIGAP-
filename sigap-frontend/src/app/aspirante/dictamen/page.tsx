import { FaseEncabezado, FuenteFase } from "@/components/expediente/FaseEncabezado";
import { PublicacionResultados } from "@/components/expediente/PublicacionResultados";

/** 6 · Dictamen final: dónde se publican los resultados y, ya publicados, el resultado del aspirante. */
export default function FaseDictamen() {
  return (
    <>
      <FaseEncabezado id="dictamen" />
      <PublicacionResultados />
      <FuenteFase id="dictamen" />
    </>
  );
}
