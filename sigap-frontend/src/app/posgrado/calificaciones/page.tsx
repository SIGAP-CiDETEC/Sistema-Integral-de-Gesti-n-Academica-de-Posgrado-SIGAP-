"use client";

import { useState } from "react";
import { Download, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Etiqueta, Regresar, Tarjeta, botonSecundario, inputBase } from "@/components/posgrado/ui";
import { CapturaCalificacion } from "@/components/profesor/CapturaCalificacion";
import { descargarCsv, fechaArchivo } from "@/lib/csv";
import { docenteDe } from "@/lib/evaluacion";
import { fechaLargaIso, useConfigEvaluacion } from "@/lib/evaluacion-config";
import { AREAS_EVAL, MINIMA_AREA, estadoEvaluacion, nombreArea, nombreProfesor, type AspiranteP } from "@/lib/posgrado/datos";
import { capturasExamen } from "@/lib/profesor";
import { calificacionesExamen, calificacionesPropedeutico, procedenciaSeparada } from "@/lib/reporte-aspirantes";
import { useSesion } from "@/lib/sesion";

const tono = (v?: number) => (v === undefined ? "text-gray-400" : v >= MINIMA_AREA ? "text-emerald-700" : "text-red-700");
const fmt = (v?: number) => (v === undefined ? "—" : v.toFixed(1));

/**
 * Calificaciones (Jefatura de Posgrado): captura del examen de admisión y concentrado de calificaciones
 * del propedéutico (que capturan los docentes de cada grupo) y del examen, con descarga en CSV.
 */
export default function CalificacionesJefatura() {
  const { aspirantes, cargado } = usePosgrado();
  const { config, materias } = useConfigEvaluacion();
  const { sesion } = useSesion();
  const [q, setQ] = useState("");
  if (!cargado) return null;

  const examen = capturasExamen(aspirantes);
  const conEvaluacion = aspirantes.filter((a) => a.evaluacion.modalidad).sort((x, y) => x.nombre.localeCompare(y.nombre, "es"));
  const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const lista = conEvaluacion.filter((a) => !q || norm(`${a.nombre} ${a.id} ${a.procedencia}`).includes(norm(q)));

  const docente = (a: AspiranteP, area: string) => {
    const d = docenteDe(area, a.evaluacion.grupos[area] ?? "", materias);
    return d ? nombreProfesor(d) : "";
  };

  const exportar = () => {
    const filas = conEvaluacion.map((a) => {
      const { institucion, unidad } = procedenciaSeparada(a.procedencia);
      const p = calificacionesPropedeutico(a);
      const ex = calificacionesExamen(a);
      const prope = a.evaluacion.modalidad === "propedeutico";
      return [
        a.id,
        a.nombre,
        a.correo,
        institucion,
        unidad,
        prope ? "Propedéutico" : "Examen",
        ...AREAS_EVAL.flatMap((x) => [prope ? (a.evaluacion.grupos[x.id] ?? "") : "", prope ? docente(a, x.id) : "", p[x.id] ?? ""]),
        p.promedio ?? "",
        ...AREAS_EVAL.map((x) => ex[x.id] ?? ""),
        ex.promedio ?? "",
        estadoEvaluacion(a.evaluacion).t,
      ];
    });
    descargarCsv(
      `Calificaciones_admision_${fechaArchivo()}.csv`,
      [
        "ID",
        "Aspirante",
        "Correo",
        "Institución de procedencia",
        "Unidad académica / escuela",
        "Modalidad",
        ...AREAS_EVAL.flatMap((x) => [`${x.nombre}: grupo`, `${x.nombre}: docente`, `${x.nombre}: calificación del curso propedéutico`]),
        "Promedio de los 2 cursos propedéuticos",
        ...AREAS_EVAL.map((x) => `Examen: ${x.nombre}`),
        "Calificación del examen",
        "Estado de la evaluación",
      ],
      filas,
    );
  };

  return (
    <>
      <Regresar href="/posgrado" t="Inicio" />
      <PageHeader titulo="Calificaciones" subtitulo="Examen de admisión (lo captura la Jefatura) y concentrado de los cursos propedéuticos" />

      <Tarjeta titulo={`Examen de admisión · ${fechaLargaIso(config.examen.fecha)}, ${config.examen.hora} h, ${config.examen.lugar}`}>
        <p className="mb-3 text-sm text-gray-600">
          Calificación de 0 a 10 por área; mínima aprobatoria: {MINIMA_AREA.toFixed(1)}. Incluye a quienes eligieron solo examen y a quienes presentan el examen de
          las áreas que no acreditaron en el propedéutico. Al completarse, el resultado queda listo para publicarse en Evaluación.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="py-2 font-medium">Aspirante</th>
                <th className="py-2 font-medium">Área</th>
                <th className="py-2 font-medium">Calificación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {examen.map((f) => (
                <tr key={`${f.a.id}-${f.area}`}>
                  <td className="py-2.5">
                    <p className="font-medium text-gray-900">{f.a.nombre}</p>
                    <p className="font-mono text-xs text-gray-500">{f.a.id}</p>
                  </td>
                  <td className="py-2.5 text-gray-700">
                    {nombreArea(f.area)}
                    <span className="block text-xs text-gray-500">{f.esSegunda ? "Área no acreditada en el propedéutico" : "Examen completo"}</span>
                  </td>
                  <td className="py-2.5">
                    <CapturaCalificacion a={f.a} area={f.area} capturada={f.capturada} por={sesion?.correo ?? "jefatura"} />
                  </td>
                </tr>
              ))}
              {!examen.length && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-gray-500">
                    No hay exámenes por calificar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Tarjeta>

      <section className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-100 px-5 py-3">
          <div>
            <h2 className="font-semibold text-gray-900">Concentrado de calificaciones</h2>
            <p className="text-xs text-gray-500">Las calificaciones del propedéutico las captura el docente de cada grupo.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar aspirante" aria-label="Buscar aspirante" className={`${inputBase} w-56 py-1.5 pl-8`} />
            </label>
            <button type="button" className={botonSecundario} onClick={exportar} disabled={!conEvaluacion.length}>
              <Download size={14} /> Descargar CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="min-w-[200px] px-5 py-2.5 font-medium">Aspirante</th>
                <th className="px-3 py-2.5 font-medium">Institución</th>
                <th className="px-3 py-2.5 font-medium">Unidad académica</th>
                {AREAS_EVAL.map((x) => (
                  <th key={x.id} className="px-3 py-2.5 text-center font-medium">
                    {x.id === "matematicas" ? "Matemáticas" : x.nombre}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-center font-medium">Promedio 2 cursos</th>
                <th className="px-3 py-2.5 text-center font-medium">Examen</th>
                <th className="px-5 py-2.5 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lista.map((a) => {
                const { institucion, unidad } = procedenciaSeparada(a.procedencia);
                const p = calificacionesPropedeutico(a);
                const ex = calificacionesExamen(a);
                const est = estadoEvaluacion(a.evaluacion);
                const prope = a.evaluacion.modalidad === "propedeutico";
                return (
                  <tr key={a.id} data-concentrado={a.id}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{a.nombre}</p>
                      <p className="font-mono text-xs text-gray-500">{a.id}</p>
                    </td>
                    <td className="px-3 py-3 text-gray-700">{institucion}</td>
                    <td className="px-3 py-3 text-gray-700">{unidad || "—"}</td>
                    {AREAS_EVAL.map((x) => (
                      <td key={x.id} className={`px-3 py-3 text-center ${tono(p[x.id])}`}>
                        {prope ? fmt(p[x.id]) : <span className="text-xs text-gray-400">Solo examen</span>}
                        {prope && <span className="block text-[11px] text-gray-400">Grupo {a.evaluacion.grupos[x.id] ?? "—"}</span>}
                      </td>
                    ))}
                    <td className={`px-3 py-3 text-center font-semibold ${tono(p.promedio)}`}>{prope ? fmt(p.promedio) : "—"}</td>
                    <td className={`px-3 py-3 text-center ${tono(ex.promedio)}`}>{fmt(ex.promedio)}</td>
                    <td className="px-5 py-3">
                      <Etiqueta tono={est.tono}>{est.t}</Etiqueta>
                    </td>
                  </tr>
                );
              })}
              {!lista.length && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-gray-500">
                    No hay aspirantes con modalidad de evaluación elegida.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
