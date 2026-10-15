"use client";

import { UserRound, Wand2 } from "lucide-react";
import { PROFESORES_SINODO, profesorValido } from "@/lib/posgrado/datos";
import { actuarComo, gruposDeProfesor, useProfesorActual } from "@/lib/profesor";
import { useConfigEvaluacion } from "@/lib/evaluacion-config";

/** Quién está actuando y, solo en el cascarón, el selector para actuar como otro profesor del Colegio. */
export function ProfesorActual() {
  const { profesor, propio, simulado } = useProfesorActual();
  const { materias } = useConfigEvaluacion();
  const grupos = gruposDeProfesor(profesor?.id, materias);
  const imparte = Object.entries(
    grupos.reduce<Record<string, string[]>>((acc, { materia, grupo }) => ({ ...acc, [materia.nombre]: [...(acc[materia.nombre] ?? []), grupo.id] }), {}),
  ).map(([m, gs]) => `${m} (grupo ${gs.join(", ")})`);
  return (
    <div className={`mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm ${simulado ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-white"}`}>
      <span className="flex items-center gap-2 text-gray-700">
        <UserRound size={16} className="text-primary" />
        {profesor ? (
          <span>
            <b className="text-gray-900">{profesor.nombre}</b> · {profesor.linea}
            {imparte.length > 0 && <span className="text-gray-500"> · imparte {imparte.join(" y ")}</span>}
          </span>
        ) : (
          "Tu cuenta no está ligada a un profesor del Colegio; elige uno en la vista de prueba."
        )}
      </span>
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <Wand2 size={13} /> Vista de prueba (solo cascarón): actuar como
        <select
          aria-label="Actuar como otro profesor"
          value={profesor?.id ?? ""}
          onChange={(e) => actuarComo(e.target.value === propio?.id ? null : e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800"
        >
          {!profesor && <option value="">Elige un profesor</option>}
          {PROFESORES_SINODO.filter(profesorValido).map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
              {p.id === propio?.id ? " (tu cuenta)" : ""}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
