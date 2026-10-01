import { DocumentosFase } from "@/components/expediente/DocumentosFase";
import { FaseEncabezado, FuenteFase } from "@/components/expediente/FaseEncabezado";

export default function FaseDocumentos() {
  return (
    <>
      <FaseEncabezado id="documentos" />
      <div className="space-y-6">
        <DocumentosFase fase="documentos" conEnvio />
      </div>
      <FuenteFase id="documentos" />
    </>
  );
}
