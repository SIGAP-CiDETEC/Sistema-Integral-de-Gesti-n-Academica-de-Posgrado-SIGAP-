"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Aviso, Etiqueta, Regresar, botonPrimario, inputBase } from "@/components/posgrado/ui";
import { useAccionesProfesor } from "@/components/profesor/useAccionesProfesor";
import { fechaLargaIso, useConfigEvaluacion } from "@/lib/evaluacion-config";
import { MINIMA_AREA, fechaCorta, nombreArea, type AreaEvalId, type AspiranteP } from "@/lib/posgrado/datos";
import { areasDeProfesor, capturasPendientes, useProfesorActual } from "@/lib/profesor";

/** Calificaciones del área que imparte o evalúa el profesor (propedéutico y examen de admisión). */
export default function CalificacionesProfesor() {
  const { aspirantes, cargado } = usePosgrado();
  const { profesor } = useProfesorActual();
  const { config, modalidades } = useConfigEvaluacion();
  if (!cargado) return null;
  const yo = profesor?.id ?? "";
  const areas = areasDeProfesor(yo);
  const lista = capturasPendientes(aspirantes, yo);
  const prope = lista.filter((x) => x.tipo === "propedeutico");
  const examen = lista.filter((x) => x.tipo === "examen");

  return (
    <>
      <Regresar href="/profesor" t="Inicio" />
      <PageHeader titulo="Calificaciones" subtitulo={areas.length ? `Área que calificas: ${areas.map(nombreArea).join(", ")}` : "Captura de calificaciones de la evaluación de admisión"} />

      {!areas.length ? (
        <Aviso tono="info" titulo="No tienes un área de evaluación asignada en esta convocatoria">
          Posgrado asigna a un profesor por área (Matemáticas Discretas y Continuas, Programación). Usa la vista de prueba para actuar como la Dra. Adriana Castillo
          (Matemáticas) o el Dr. Ricardo Morales (Programación).
        </Aviso>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-gray-600">
            Calificación de 0 a 10; mínima aprobatoria por área: {MINIMA_AREA.toFixed(1)}. Cuando se capturan todas las áreas de un aspirante, el resultado queda listo y el
            Departamento de Posgrado lo publica (el aspirante no lo ve antes).
          </p>
          <Seccion titulo="Curso propedéutico" detalle={modalidades.propedeutico.fechas} filas={prope} />
          <Seccion titulo="Examen de admisión" detalle={`${fechaLargaIso(config.examen.fecha)} · ${config.examen.hora} h · ${config.examen.lugar}`} filas={examen} />
        </div>
      )}
    </>
  );
}

type Fila = ReturnType<typeof capturasPendientes>[number];

function Seccion({ titulo, detalle, filas }: { titulo: string; detalle: string; filas: Fila[] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-3">
        <h2 className="font-semibold text-gray-900">{titulo}</h2>
        <p className="text-xs text-gray-500">{detalle}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-5 py-2.5 font-medium">Aspirante</th>
              <th className="px-3 py-2.5 font-medium">Área</th>
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
                  <span className="block text-xs text-gray-500">{f.tipo === "propedeutico" ? `Grupo ${f.a.evaluacion.grupos[f.area] ?? "—"}` : f.esSegunda ? "Área no acreditada en el propedéutico" : "Examen completo"}</span>
                </td>
                <td className="px-5 py-3">
                  <Captura a={f.a} area={f.area} capturada={f.capturada} />
                </td>
              </tr>
            ))}
            {!filas.length && (
              <tr>
                <td colSpan={3} className="px-5 py-6 text-center text-gray-500">
                  No hay aspirantes por calificar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Captura({ a, area, capturada }: { a: AspiranteP; area: AreaEvalId; capturada?: Fila["capturada"] }) {
  const { capturar } = useAccionesProfesor();
  const { profesor } = useProfesorActual();
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
      <button type="button" className={botonPrimario} disabled={!ok || !profesor} onClick={() => capturar(a, area, Math.round(n * 10) / 10, profesor!.id)}>
        Registrar
      </button>
      {v !== "" && ok && <span className={`text-xs ${n >= MINIMA_AREA ? "text-emerald-700" : "text-red-700"}`}>{n >= MINIMA_AREA ? "Acreditada" : "No acreditada"}</span>}
    </span>
  );
}
