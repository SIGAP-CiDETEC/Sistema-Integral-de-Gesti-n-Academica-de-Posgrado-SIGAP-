"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, RotateCcw } from "lucide-react";
import { guardarCuenta, useCuentaAlumno } from "@/lib/cuenta-alumno";
import { useEstadoAdmision } from "@/lib/posgrado/revision";

/** Pantallas donde se avisa que ya se asignó el número de registro (en Inscripción ya lo muestra su tarjeta). */
const DONDE = ["/aspirante", "/aspirante/admision"];

/**
 * Aviso en la sesión de aspirante cuando UTEyCV ya asignó el número de registro (RF-30).
 * Solo se muestra si el aspirante realmente llegó ahí: admitido por el Colegio y proceso no concluido.
 * (Un número de registro que quedó guardado de otra prueba no debe aparecer.)
 */
export function AvisoCuentaAlumno() {
  const { cuenta } = useCuentaAlumno();
  const { concluido, resolucion } = useEstadoAdmision();
  const ruta = usePathname();
  const aplica = !!cuenta && !concluido && (resolucion === "Aceptado" || resolucion === "Con reservas");
  if (!aplica || !DONDE.includes(ruta)) return null;
  return (
    <div className="mb-6 rounded-xl bg-guinda px-4 py-3 text-sm text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2">
          <GraduationCap size={18} className="shrink-0" />
          <span>
            Tu inscripción concluyó. Ahora inicias sesión con tu número de registro{" "}
            <span className="font-mono font-semibold">{cuenta.numeroRegistro}</span>.
          </span>
        </p>
        <Link href={`/login?usuario=${cuenta.numeroRegistro}`} className="rounded-lg bg-white px-3 py-1.5 font-medium text-guinda hover:bg-guinda-soft">
          Ir a iniciar sesión
        </Link>
      </div>
      <button
        type="button"
        onClick={() => guardarCuenta(null)}
        className="mt-2 inline-flex items-center gap-1.5 text-xs text-white/80 underline hover:text-white"
      >
        <RotateCcw size={12} /> Solo cascarón: deshacer la inscripción (volver a ser aspirante)
      </button>
    </div>
  );
}
