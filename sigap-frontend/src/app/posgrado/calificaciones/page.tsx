"use client";

import { useState } from "react";
import { Download, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Etiqueta, Regresar, Tarjeta, botonSecundario, inputBase } from "@/components/posgrado/ui";
import { CapturaCalificacion } from "@/components/profesor/CapturaCalificacion";
import { ActasSip12 } from "@/components/actas/ActasSip12";
import { gruposSip12 } from "@/lib/actas-sip12";
import { descargarCsv, fechaArchivo } from "@/lib/csv";
import { docenteDe } from "@/lib/evaluacion";
import { fechaLargaIso, useConfigEvaluacion } from "@/lib/evaluacion-config";
import { AREAS_EVAL, MINIMA_AREA, estadoEvaluacion, nombreArea, nombreProfesor, type AspiranteP } from "@/lib/posgrado/datos";
import { capturasExamen } from "@/lib/profesor";
import { calificacionesExamen, calificacionesPropedeutico, procedenciaSeparada, promedioFinal } from "@/lib/reporte-aspirantes";
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
        promedioFinal(a) ?? "",
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
        "Promedio del propedéutico",
        ...AREAS_EVAL.map((x) => `Examen: ${x.nombre}`),
        "Promedio del examen",
        "Promedio final de la evaluación",
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
          las áreas que no acreditaron en el propedéutico. Al completarse, el resultado queda listo para publicarse en Evaluación. Puedes corregir una calificación hasta una semana después de capturarla, mientras no se
          publique.
        </p>
        <ul className="divide-y divide-gray-100 border-t border-gray-100 text-sm" data-examenes>
          {examen.map((f) => (
            <li key={`${f.a.id}-${f.area}`} className="grid gap-2 py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center md:gap-4" data-examen={f.a.id}>
              <span className="min-w-0">
                <span className="block font-medium text-gray-900">{f.a.nombre}</span>
                <span className="font-mono text-xs text-gray-500">{f.a.id}</span>
              </span>
              <span className="min-w-0 text-gray-700">
                {nombreArea(f.area)}
                <span className="block text-xs text-gray-500">{f.esSegunda ? "Área no acreditada en el propedéutico" : "Examen completo"}</span>
              </span>
              <CapturaCalificacion a={f.a} area={f.area} capturada={f.capturada} por={sesion?.correo ?? "jefatura"} />
            </li>
          ))}
          {!examen.length && <li className="py-6 text-center text-gray-500">No hay exámenes por calificar.</li>}
        </ul>
      </Tarjeta>

      <Tarjeta className="mt-6" titulo="Actas de los cursos propedéuticos (SIP-12)">
        <p className="mb-1 text-sm text-gray-600">El docente de cada grupo sube su acta firmada y después la firma el Coordinador del programa.</p>
        <ActasSip12 modo="consulta" grupos={gruposSip12(aspirantes, materias)} />
      </Tarjeta>

      <section className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-100 px-5 py-3">
          <div>
            <h2 className="font-semibold text-gray-900">Concentrado de calificaciones</h2>
            <p className="text-xs text-gray-500">
              Las del propedéutico las captura el docente de cada grupo. El promedio del proceso conserva las áreas aprobadas del propedéutico y usa el examen únicamente en las reprobadas. Si solo presentó examen o reprobó ambos propedéuticos, usa las dos notas del examen.
            </p>
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
        {/* Encabezado de columnas (solo en pantallas anchas; en celular cada aspirante es una tarjeta) */}
        <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_6.5rem] gap-4 bg-gray-50 px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-500 lg:grid">
          <span>Aspirante y procedencia</span>
          <span>Propedéutico</span>
          <span>Examen</span>
          <span className="text-center">Promedio final</span>
        </div>
        <ul className="divide-y divide-gray-100">
          {lista.map((a) => {
            const { institucion, unidad } = procedenciaSeparada(a.procedencia);
            const p = calificacionesPropedeutico(a);
            const ex = calificacionesExamen(a);
            const est = estadoEvaluacion(a.evaluacion);
            const prope = a.evaluacion.modalidad === "propedeutico";
            const final = promedioFinal(a);
            return (
              <li key={a.id} data-concentrado={a.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_6.5rem] lg:items-center lg:gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{a.nombre}</p>
                  <p className="text-xs text-gray-500">
                    <span className="font-mono">{a.id}</span> · {institucion}
                    {unidad ? ` · ${unidad}` : ""}
                  </p>
                  <div className="mt-1.5">
                    <Etiqueta tono={est.tono}>{est.t}</Etiqueta>
                  </div>
                </div>
                <Calificaciones
                  titulo="Propedéutico"
                  vacio={prope ? undefined : "Eligió solo examen"}
                  celdas={[
                    ...AREAS_EVAL.map((x) => ({ t: `${x.id === "matematicas" ? "Matemáticas" : x.nombre}${prope ? ` (${a.evaluacion.grupos[x.id] ?? "—"})` : ""}`, v: p[x.id] })),
                    { t: "Promedio", v: p.promedio, fuerte: true },
                  ]}
                />
                <Calificaciones
                  titulo="Examen"
                  celdas={[
                    ...AREAS_EVAL.map((x) => ({ t: x.id === "matematicas" ? "Matemáticas" : x.nombre, v: ex[x.id] })),
                    { t: "Promedio", v: ex.promedio, fuerte: true },
                  ]}
                />
                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 lg:block lg:bg-transparent lg:p-0 lg:text-center">
                  <span className="text-xs text-gray-500 lg:hidden">Promedio final</span>
                  <span className={`text-lg font-bold ${tono(final)}`}>{fmt(final)}</span>
                </div>
              </li>
            );
          })}
          {!lista.length && <li className="px-5 py-8 text-center text-gray-500">No hay aspirantes con modalidad de evaluación elegida.</li>}
        </ul>
      </section>
    </>
  );
}

/** Calificaciones de una evaluación (dos áreas y su promedio) en una cuadrícula compacta. */
function Calificaciones({ titulo, celdas, vacio }: { titulo: string; celdas: { t: string; v?: number; fuerte?: boolean }[]; vacio?: string }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-xs font-medium text-gray-500 lg:hidden">{titulo}</p>
      {vacio ? (
        <p className="text-xs text-gray-400">{vacio}</p>
      ) : (
        <dl className="grid grid-cols-3 gap-2">
          {celdas.map((c) => (
            <div key={c.t} className={`rounded-md px-2 py-1 text-center ${c.fuerte ? "bg-gray-50" : ""}`}>
              <dt className="text-[11px] leading-tight text-gray-500">
                {c.t}
              </dt>
              <dd className={`${c.fuerte ? "font-semibold" : ""} ${tono(c.v)}`}>{fmt(c.v)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
