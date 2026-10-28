"use client";

import { CheckCircle2 } from "lucide-react";
import { REGISTRO_DEMO, nombreCompleto } from "@/lib/aspirante-datos";
import { ALUMNO_DEMO } from "@/lib/alumno";
import { PROGRAMA } from "@/lib/config";
import { PROGRAMA_INDIVIDUAL_DEMO, nombreAsesor } from "@/lib/programa-individual";
import { useCuentaAlumno } from "@/lib/cuenta-alumno";

/** Tarjeta con los datos escolares del alumno (usa la boleta asignada en la simulación). */
export function DatosAlumno() {
  const { cuenta } = useCuentaAlumno();
  const datos = [
    ["Número de registro", cuenta?.numeroRegistro ?? PROGRAMA_INDIVIDUAL_DEMO.noRegistro],
    ["Programa", PROGRAMA],
    ["Semestre", `${ALUMNO_DEMO.semestre}.º · ${ALUMNO_DEMO.periodoActual}`],
    ["Dedicación", ALUMNO_DEMO.dedicacion],
    ["Asesor académico", nombreAsesor()],
  ];
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="font-semibold text-gray-900">{nombreCompleto(REGISTRO_DEMO)}</h2>
      <p className="text-xs text-gray-500">Alumno(a) inscrito(a)</p>
      <dl className="mt-4 space-y-3 text-sm">
        {datos.map(([k, v]) => (
          <div key={k}>
            <dt className="text-gray-500">{k}</dt>
            <dd className={`font-medium text-gray-900 ${k === "Número de registro" ? "font-mono tracking-wider" : ""}`}>{v}</dd>
          </div>
        ))}
      </dl>
      {cuenta?.contrasenaCambiadaEl && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-emerald-700">
          <CheckCircle2 size={13} /> Contraseña actualizada el{" "}
          {new Date(cuenta.contrasenaCambiadaEl).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      )}
    </section>
  );
}
