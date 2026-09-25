import { BoletaSicep } from "@/components/alumno/BoletaSicep";
import { DocumentosFase } from "@/components/expediente/DocumentosFase";
import { FaseEncabezado, FuenteFase } from "@/components/expediente/FaseEncabezado";
import { FormatosFase } from "@/components/expediente/FormatosFase";

export default function FaseMatricula() {
  return (
    <>
      <FaseEncabezado id="matricula" />
      <div className="space-y-6">
        <DocumentosFase fase="matricula" />
        <FormatosFase fase="matricula" />
        <BoletaSicep />
      </div>
      <FuenteFase id="matricula" />
    </>
  );
}
