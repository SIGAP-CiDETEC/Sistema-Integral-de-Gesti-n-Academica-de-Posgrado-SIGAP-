import { CitaEntrevista } from "@/components/expediente/CitaEntrevista";
import { FaseEncabezado, FuenteFase } from "@/components/expediente/FaseEncabezado";
import { FormatosFase } from "@/components/expediente/FormatosFase";

export default function FaseEntrevista() {
  return (
    <>
      <FaseEncabezado id="entrevista" />
      <div className="space-y-6">
        <CitaEntrevista />
        <FormatosFase fase="entrevista" />
      </div>
      <FuenteFase id="entrevista" />
    </>
  );
}
