import { Clock } from "lucide-react";
import type { Firma } from "@/lib/formatos";

/** Firmas de otras personas que se recaban en papel después. */
export function FirmasOtros({ firmas, recibe }: { firmas: Firma[]; recibe?: string }) {
  const area = recibe?.includes("UTEyCV") ? "UTEyCV" : "Posgrado";
  const otros = firmas.filter((x) => x.rol !== "aspirante" && !x.ocultaAspirante);
  if (!otros.length) return null;
  const como: Record<string, string> = {
    asesor: `firma el documento impreso; ${area} sube la versión final (RF-28)`,
    jefe: `firma el documento impreso; ${area} sube la versión final (RF-28)`,
    sinodo: "firma el acta impresa el día de la entrevista",
    comision: `firma en papel; ${area} sube el dictamen firmado`,
  };
  return (
    <div className="mt-5 border-t border-gray-100 pt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Firmas que se recaban después</p>
      <ul className="mt-2 space-y-2">
        {otros.map((x, i) => (
          <li key={`${x.label}-${i}`} className="flex items-start gap-2 text-sm">
            <Clock size={15} className="mt-0.5 shrink-0 text-gray-400" />
            <span>
              <span className="text-gray-900">{x.label}</span>
              <span className="block text-xs text-gray-500">{como[x.rol] ?? "firma en papel"}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
