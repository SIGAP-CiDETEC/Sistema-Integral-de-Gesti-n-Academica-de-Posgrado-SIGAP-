import { BoletaSicep } from "@/components/alumno/BoletaSicep";
import { DocumentosFase } from "@/components/expediente/DocumentosFase";
import { FaseEncabezado, FuenteFase } from "@/components/expediente/FaseEncabezado";
import { FormatosFase } from "@/components/expediente/FormatosFase";
import { EstadoInscripcionAspirante } from "@/components/expediente/EstadoInscripcion";

/** Proceso de inscripción: después de la admisión (resultado publicado; aquí se llena el SIP-04). */
export default function Inscripcion() {
  return (
    <>
      <FaseEncabezado id="inscripcion" />
      <div className="space-y-6">
        <EstadoInscripcionAspirante />
        <DocumentosFase fase="inscripcion" />
        <FormatosFase fase="inscripcion" />
        <BoletaSicep />
      </div>
      <FuenteFase id="inscripcion" />
    </>
  );
}
