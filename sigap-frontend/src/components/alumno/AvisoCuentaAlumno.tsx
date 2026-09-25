"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { useCuentaAlumno } from "@/lib/cuenta-alumno";

/** Aviso en la sesión de aspirante cuando ya se asignó el número de registro. */
export function AvisoCuentaAlumno() {
  const { cuenta } = useCuentaAlumno();
  if (!cuenta) return null;
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-guinda px-4 py-3 text-sm text-white">
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
  );
}
