import { Eye } from "lucide-react";

/** Aviso fijo: la Subdirección Académica consulta, no interviene en el proceso. */
export function SoloConsulta() {
  return (
    <p className="mb-5 flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-900">
      <Eye size={16} className="shrink-0" /> Vista de solo consulta: puedes ver el avance de los aspirantes, pero las acciones del proceso las realizan el
      Departamento de Posgrado y Control Escolar (UTEyCV).
    </p>
  );
}
