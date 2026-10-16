"use client";

import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Aviso, Regresar } from "@/components/posgrado/ui";
import { CapturaCalificacion } from "@/components/profesor/CapturaCalificacion";
import { describirGrupo, lugarDe } from "@/lib/evaluacion";
import { useConfigEvaluacion } from "@/lib/evaluacion-config";
import { MINIMA_AREA, nombreArea } from "@/lib/posgrado/datos";
import { capturasPendientes, gruposDeProfesor, useProfesorActual } from "@/lib/profesor";

/** Calificaciones del curso propedéutico de los grupos que imparte el profesor (el examen lo califica la Jefatura). */
export default function CalificacionesProfesor() {
  const { aspirantes, cargado } = usePosgrado();
  const { profesor } = useProfesorActual();
  const { materias, modalidades } = useConfigEvaluacion();
  if (!cargado) return null;
  const yo = profesor?.id ?? "";
  const grupos = gruposDeProfesor(yo, materias);
  const filas = capturasPendientes(aspirantes, yo, materias);

  return (
    <>
      <Regresar href="/profesor" t="Inicio" />
      <PageHeader titulo="Calificaciones del propedéutico" subtitulo={`Cursos propedéuticos · ${modalidades.propedeutico.fechas}`} />

      {!grupos.length ? (
        <Aviso tono="info" titulo="No impartes grupos del propedéutico en esta convocatoria">
          El Departamento de Posgrado asigna un docente a cada grupo. Usa la vista de prueba para actuar como la Dra. Adriana Castillo (Matemáticas) o el Dr. Ricardo
          Morales (Programación).
        </Aviso>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {grupos.map(({ materia, grupo }) => (
              <div key={materia.id + grupo.id} className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
                <p className="font-medium text-gray-900">
                  {materia.nombre} · grupo {grupo.id}
                </p>
                <p className="text-xs text-gray-500">{describirGrupo(grupo)}</p>
                <p className="text-xs text-gray-500">{lugarDe(grupo)}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600">
            Calificación de 0 a 10; mínima aprobatoria por curso: {MINIMA_AREA.toFixed(1)}. Cuando se capturan los dos cursos de un aspirante, el resultado queda
            listo y el Departamento de Posgrado lo publica (el aspirante no lo ve antes). Puedes corregir una calificación hasta una semana después de
            capturarla, mientras no se publique. El examen de admisión lo califica la Jefatura de Posgrado.
          </p>
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-2.5 font-medium">Aspirante</th>
                    <th className="px-3 py-2.5 font-medium">Curso</th>
                    <th className="px-5 py-2.5 font-medium">Calificación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filas.map((f) => (
                    <tr key={`${f.a.id}-${f.area}`}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{f.a.nombre}</p>
                        <p className="font-mono text-xs text-gray-500">{f.a.id}</p>
                      </td>
                      <td className="px-3 py-3 text-gray-700">
                        {nombreArea(f.area)}
                        <span className="block text-xs text-gray-500">Grupo {f.a.evaluacion.grupos[f.area] ?? "—"}</span>
                      </td>
                      <td className="px-5 py-3">
                        <CapturaCalificacion a={f.a} area={f.area} capturada={f.capturada} por={yo} />
                      </td>
                    </tr>
                  ))}
                  {!filas.length && (
                    <tr>
                      <td colSpan={3} className="px-5 py-6 text-center text-gray-500">
                        No hay aspirantes por calificar en tus grupos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
