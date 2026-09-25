import { FaseEncabezado, FuenteFase } from "@/components/expediente/FaseEncabezado";
import { FormatosFase } from "@/components/expediente/FormatosFase";
import { ResumenRegistro } from "@/components/expediente/ResumenRegistro";

export default function FaseRegistro() {
  return (
    <>
      <FaseEncabezado id="registro" />
      <div className="space-y-6">
        <ResumenRegistro />
        <FormatosFase fase="registro" />
      </div>
      <FuenteFase id="registro" />
    </>
  );
}
