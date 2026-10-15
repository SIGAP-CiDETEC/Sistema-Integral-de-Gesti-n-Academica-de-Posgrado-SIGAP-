"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Etiqueta, botonPrimario, inputBase } from "@/components/posgrado/ui";
import { useAccionesProfesor } from "./useAccionesProfesor";
import { MINIMA_AREA, fechaCorta, nombreArea, type AreaEvalId, type AspiranteP, type CapturaArea } from "@/lib/posgrado/datos";

/** Captura de la calificación de un área (la usan los docentes del propedéutico y la Jefatura para el examen). */
export function CapturaCalificacion({ a, area, capturada, por }: { a: AspiranteP; area: AreaEvalId; capturada?: CapturaArea; por: string }) {
  const { capturar } = useAccionesProfesor();
  const [v, setV] = useState("");
  if (capturada)
    return (
      <span className="flex flex-wrap items-center gap-2">
        <Etiqueta tono={capturada.calificacion >= MINIMA_AREA ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}>
          {capturada.calificacion} · {capturada.calificacion >= MINIMA_AREA ? "acreditada" : "no acreditada"}
        </Etiqueta>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <CheckCircle2 size={12} /> Capturada {fechaCorta(capturada.el)}
        </span>
      </span>
    );
  const n = Number(v);
  const ok = v !== "" && n >= 0 && n <= 10;
  return (
    <span className="flex items-center gap-2">
      <input
        type="number"
        step="0.1"
        min={0}
        max={10}
        aria-label={`Calificación de ${a.nombre} en ${nombreArea(area)}`}
        value={v}
        onChange={(e) => setV(e.target.value)}
        className={`${inputBase} w-24`}
      />
      <button type="button" className={botonPrimario} disabled={!ok || !por} onClick={() => capturar(a, area, Math.round(n * 10) / 10, por)}>
        Registrar
      </button>
      {v !== "" && ok && <span className={`text-xs ${n >= MINIMA_AREA ? "text-emerald-700" : "text-red-700"}`}>{n >= MINIMA_AREA ? "Acreditada" : "No acreditada"}</span>}
    </span>
  );
}
