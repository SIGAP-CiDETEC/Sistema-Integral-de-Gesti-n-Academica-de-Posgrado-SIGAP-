import { FaseEncabezado, FuenteFase } from "@/components/expediente/FaseEncabezado";
import { FormatosFase } from "@/components/expediente/FormatosFase";

export default function FaseDictamen() {
  return (
    <>
      <FaseEncabezado id="dictamen" />
      <div className="space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-gray-900">Resultado</h2>
          <p className="mt-2 text-sm text-gray-600">
            Tu resultado se publicará el <strong>30 de abril</strong>. Si es favorable, se habilitará la fase de Matrícula
            y recibirás un correo.
          </p>
        </section>
        <FormatosFase fase="dictamen" />
      </div>
      <FuenteFase id="dictamen" />
    </>
  );
}
