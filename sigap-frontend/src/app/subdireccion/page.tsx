"use client";

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Etiqueta, Kpi, Tarjeta } from "@/components/posgrado/ui";
import { SoloConsulta } from "@/components/subdireccion/SoloConsulta";
import { CalendarDays } from "lucide-react";
import { fechaResultados, useConvocatorias } from "@/lib/convocatoria";
import { useContenido } from "@/lib/contenido";
import { faseSubdireccion, FASES_SUBDIRECCION, resumenProceso } from "@/lib/subdireccion";
import { fechaHora } from "@/lib/posgrado/datos";

/** Inicio de la Subdirección Académica: panorama del proceso de admisión (solo consulta). */
export default function SubdireccionInicio() {
  const { aspirantes, bitacora, cargado, porId } = usePosgrado();
  const { lista: convocatorias, config } = useConvocatorias();
  const { calendarioDe } = useContenido();
  if (!cargado) return null;

  const r = resumenProceso(aspirantes);
  const porFase = FASES_SUBDIRECCION.map((f) => ({ ...f, n: aspirantes.filter((a) => faseSubdireccion(a) === f.id).length }));
  const max = Math.max(1, ...porFase.map((f) => f.n));

  return (
    <>
      <PageHeader titulo="Subdirección Académica" subtitulo="Panorama del proceso de admisión a la Maestría en Tecnología de Cómputo" />
      <SoloConsulta />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi valor={r.total} etiqueta="Aspirantes registrados" color="text-primary" href="/subdireccion/aspirantes" />
        <Kpi valor={r.enProceso} etiqueta="En proceso" color="text-sky-700" href="/subdireccion/aspirantes?fase=proceso" />
        <Kpi valor={r.admitidos} etiqueta="Admitidos por el Colegio" color="text-emerald-700" href="/subdireccion/aspirantes?fase=admitido" />
        <Kpi valor={r.noAdmitidos} etiqueta="Proceso concluido sin admisión" color="text-gray-600" href="/subdireccion/aspirantes?fase=concluido" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <Tarjeta titulo="¿En qué fase van los aspirantes?">
          <ul className="space-y-3">
            {porFase.map((f) => (
              <li key={f.id}>
                <Link href={`/subdireccion/aspirantes?fase=${f.id}`} className="group block">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 group-hover:text-primary">{f.t}</span>
                    <span className="font-semibold text-gray-900">{f.n}</span>
                  </div>
                  <div className="mt-1 h-2.5 rounded-full bg-gray-100">
                    <div className={`h-2.5 rounded-full ${f.color}`} style={{ width: `${(f.n / max) * 100}%` }} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-gray-500">Haz clic en una fase para ver la lista de aspirantes que están en ella.</p>
        </Tarjeta>

        <div className="space-y-6">
          <Tarjeta titulo="Convocatorias">
            <ul className="space-y-2 text-sm">
              {convocatorias.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-2">
                  <span>
                    <span className="font-medium text-gray-900">{c.nombre}</span>
                    <span className="block text-xs text-gray-500">
                      Ingreso {c.periodo.toLowerCase()} · registro {c.inicio} — {c.cierre}
                    </span>
                  </span>
                  <Etiqueta tono={c.activa ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}>{c.activa ? "Abierta" : "Cerrada"}</Etiqueta>
                </li>
              ))}
            </ul>
          </Tarjeta>

          <Tarjeta titulo="Indicadores">
            <dl className="space-y-2.5 text-sm">
              {[
                ["Promedio de licenciatura (media)", r.promedioMedio],
                ["Procedencia IPN", `${r.ipn} de ${r.total}`],
                ["Entrevistas realizadas", `${r.entrevistas} (${r.entrevistasAprobadas} aprobadas)`],
                ["Evaluaciones acreditadas", `${r.acreditadas} de ${r.evaluadas}`],
                ["Inscritos con número SICEP", r.inscritos],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between gap-3 border-b border-gray-100 pb-2 last:border-0">
                  <dt className="text-gray-600">{k}</dt>
                  <dd className="font-medium text-gray-900">{v}</dd>
                </div>
              ))}
            </dl>
          </Tarjeta>
        </div>
      </div>

      <Tarjeta titulo={<span className="flex items-center gap-2"><CalendarDays size={17} className="text-primary" /> Calendario de las convocatorias</span>} className="mt-6">
        <p className="mb-4 text-sm text-gray-600">Calendario del proceso de admisión que publica la Jefatura de Posgrado para cada convocatoria.</p>
        <div className="grid gap-5 md:grid-cols-2" data-calendarios>
          {convocatorias.map((c) => {
            const cal = calendarioDe(c.id);
            const resultados = fechaResultados(config, c.id);
            return (
              <div key={c.id} className="min-w-0">
                <p className="font-medium text-gray-900">{c.nombre}</p>
                <p className="text-xs text-gray-500">
                  Registro {c.inicio} — {c.cierre}
                  {resultados ? ` · resultados ${new Date(`${resultados}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}` : ""}
                </p>
                {cal ? (
                  <a href={cal.imagen} target="_blank" rel="noreferrer" title="Ver el calendario completo" className="mt-2 block overflow-hidden rounded-lg border border-gray-200 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element -- imagen que publica la Jefatura de Posgrado */}
                    <img src={cal.imagen} alt={`Calendario del proceso de admisión ${c.nombre}`} className="w-full" />
                  </a>
                ) : (
                  <p className="mt-2 rounded-lg border border-dashed border-gray-300 px-3 py-6 text-center text-sm text-gray-500">La Jefatura aún no publica el calendario.</p>
                )}
              </div>
            );
          })}
        </div>
      </Tarjeta>

      <Tarjeta titulo="Actividad reciente del proceso" className="mt-6" accion={<Link href="/subdireccion/bitacora" className="text-sm text-primary hover:underline">Ver bitácora</Link>}>
        {bitacora.length ? (
          <ul className="divide-y divide-gray-100 text-sm">
            {bitacora.slice(0, 8).map((b, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-2 py-2">
                <span className="text-gray-800">
                  {b.aspirante && (
                    <Link href={`/subdireccion/aspirantes/${b.aspirante}`} className="font-medium text-primary hover:underline">
                      {porId(b.aspirante)?.nombre ?? b.aspirante}:{" "}
                    </Link>
                  )}
                  {b.accion}
                </span>
                <span className="text-xs text-gray-500">
                  {fechaHora(b.fecha)} · {b.usuario}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">Aún no hay movimientos registrados por el personal.</p>
        )}
      </Tarjeta>
    </>
  );
}
