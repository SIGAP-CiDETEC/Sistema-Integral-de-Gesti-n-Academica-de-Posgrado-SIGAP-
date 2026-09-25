import { DocumentosFase } from "@/components/expediente/DocumentosFase";
import { FaseEncabezado, FuenteFase } from "@/components/expediente/FaseEncabezado";
import { FormatosFase } from "@/components/expediente/FormatosFase";

export default function FaseDocumentos() {
  return (
    <>
      <FaseEncabezado id="documentos" />
      <div className="space-y-6">
        <DocumentosFase fase="documentos" conEnvio />
        <FormatosFase fase="documentos" />
      </div>
      <FuenteFase id="documentos" />
    </>
  );
}
