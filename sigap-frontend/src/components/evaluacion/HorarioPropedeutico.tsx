"use client";

import { CalendarDays } from "lucide-react";
import { Etiqueta, Tarjeta } from "@/components/posgrado/ui";
import { describirGrupo, docenteDe, lugarDe } from "@/lib/evaluacion";
import { useConfigEvaluacion } from "@/lib/evaluacion-config";
import { nombreProfesor } from "@/lib/posgrado/datos";

/**
 * Horario de los cursos propedéuticos que publica Posgrado.
 * - Profesor: resalta sus grupos (`yo`).
 * - Subdirección: agrega la columna del docente que imparte cada grupo (`conDocente`).
 */
export function HorarioPropedeutico({ yo, conDocente = false, className = "mt-6" }: { yo?: string; conDocente?: boolean; className?: string }) {
  const { materias, modalidades, config } = useConfigEvaluacion();
  const columnas = conDocente
    ? "sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]"
    : "sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,1fr)]";
  return (
    <Tarjeta className={className} titulo={<span className="flex items-center gap-2"><CalendarDays size={17} className="text-primary" /> Horario de los cursos propedéuticos</span>}>
      <p className="mb-3 text-sm text-gray-600">
        Publicado por el Departamento de Posgrado · {modalidades.propedeutico.fechas} · {config.propedeutico.modalidad.toLowerCase()}.
      </p>
      {conDocente && (
        <div className={`hidden gap-4 border-b border-gray-100 pb-2 text-xs font-medium uppercase tracking-wide text-gray-500 sm:grid ${columnas}`}>
          <span>Curso y grupo</span>
          <span>Horario</span>
          <span>Lugar</span>
          <span>Docente</span>
        </div>
      )}
      <ul className="divide-y divide-gray-100 text-sm" data-horario-propedeutico>
        {materias.flatMap((m) =>
          m.grupos.map((g) => {
            const docente = docenteDe(m.id, g.id, materias);
            const mio = !!yo && docente === yo;
            return (
              <li key={m.id + g.id} className={`grid gap-1 py-2.5 sm:items-center sm:gap-4 ${columnas} ${mio ? "font-medium" : ""}`}>
                <span className="flex flex-wrap items-center gap-2 text-gray-900">
                  {m.nombre} · grupo {g.id}
                  {mio && <Etiqueta tono="bg-indigo-50 text-primary">Tu grupo</Etiqueta>}
                </span>
                <span className="text-gray-700">{describirGrupo(g)}</span>
                <span className="text-xs text-gray-500">{lugarDe(g)}</span>
                {conDocente && <span className={docente ? "text-gray-800" : "text-xs italic text-gray-400"}>{docente ? nombreProfesor(docente) : "Por asignar"}</span>}
              </li>
            );
          }),
        )}
      </ul>
    </Tarjeta>
  );
}
