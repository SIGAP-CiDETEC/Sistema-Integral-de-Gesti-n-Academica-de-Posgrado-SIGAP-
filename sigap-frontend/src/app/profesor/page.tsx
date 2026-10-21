"use client";

import Link from "next/link";
import { CalendarClock, CalendarDays, ClipboardPenLine, PenLine } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Etiqueta, Kpi, Tarjeta } from "@/components/posgrado/ui";
import { fechaCorta, nombreArea } from "@/lib/posgrado/datos";
import { useConfigEvaluacion } from "@/lib/evaluacion-config";
import { describirGrupo, docenteDe, lugarDe } from "@/lib/evaluacion";
import { TONO_ENTREVISTA_PROF, capturasPendientes, entrevistasDe, entrevistasDisponibles, estadoEntrevistaProf, useProfesorActual } from "@/lib/profesor";

/** Inicio del profesor: lo que le toca del proceso de admisión. */
export default function ProfesorInicio() {
  const { aspirantes, cargado } = usePosgrado();
  const { profesor } = useProfesorActual();
  const { materias, modalidades, config } = useConfigEvaluacion();
  if (!cargado) return null;
  const yo = profesor?.id ?? "";
  const mias = entrevistasDe(aspirantes, yo);
  const estados = mias.map((a) => ({ a, e: estadoEntrevistaProf(a) }));
  const porHacer = estados.filter((x) => x.e === "Por llenar acta" || x.e === "Por subir firmada");
  const calif = capturasPendientes(aspirantes, yo, materias).filter((c) => !c.capturada);

  return (
    <>
      <PageHeader titulo="Profesor" subtitulo="Tu participación en el proceso de admisión a la Maestría en Tecnología de Cómputo" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi valor={estados.filter((x) => x.e === "Por llenar acta").length} etiqueta="Actas MTC-EC por llenar" color="text-primary" href="/profesor/entrevistas" />
        <Kpi valor={estados.filter((x) => x.e === "Por subir firmada").length} etiqueta="Actas por subir firmadas" color="text-amber-700" href="/profesor/entrevistas" />
        <Kpi valor={calif.length} etiqueta="Calificaciones por capturar" color="text-violet-700" href="/profesor/evaluacion" />
        <Kpi valor={entrevistasDisponibles(aspirantes, yo).filter((d) => !d.choque).length} etiqueta="Entrevistas disponibles para elegir" color="text-emerald-700" href="/profesor/entrevistas" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Tarjeta titulo={<span className="flex items-center gap-2"><CalendarClock size={17} className="text-primary" /> Entrevistas pendientes</span>}>
          {porHacer.length ? (
            <ul className="divide-y divide-gray-100 text-sm">
              {porHacer.map(({ a, e }) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span>
                    <span className="font-medium text-gray-900">{a.nombre}</span>
                    <span className="block text-xs text-gray-500">
                      {fechaCorta(a.entrevista!.fecha)} · {a.entrevista!.hora} h · {a.entrevista!.sala}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Etiqueta tono={TONO_ENTREVISTA_PROF[e]}>{e}</Etiqueta>
                    <Link href={`/profesor/entrevistas/${a.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                      <PenLine size={14} /> {e === "Por subir firmada" ? "Subir acta firmada" : "Llenar acta"}
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No tienes entrevistas pendientes.</p>
          )}
        </Tarjeta>

        <Tarjeta titulo={<span className="flex items-center gap-2"><ClipboardPenLine size={17} className="text-primary" /> Calificaciones por capturar</span>}>
          {calif.length ? (
            <ul className="divide-y divide-gray-100 text-sm">
              {calif.map((c) => (
                <li key={`${c.a.id}-${c.area}`} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span>
                    <span className="font-medium text-gray-900">{c.a.nombre}</span>
                    <span className="block text-xs text-gray-500">
                      {nombreArea(c.area)} · propedéutico, grupo {c.a.evaluacion.grupos[c.area] ?? "—"}
                    </span>
                  </span>
                  <Link href="/profesor/evaluacion" className="text-sm font-medium text-primary hover:underline">
                    Capturar
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No tienes calificaciones pendientes.</p>
          )}
        </Tarjeta>
      </div>

      <Tarjeta className="mt-6" titulo={<span className="flex items-center gap-2"><CalendarDays size={17} className="text-primary" /> Horario de los cursos propedéuticos</span>}>
        <p className="mb-3 text-sm text-gray-600">
          Publicado por el Departamento de Posgrado · {modalidades.propedeutico.fechas} · {config.propedeutico.modalidad.toLowerCase()}.
        </p>
        <ul className="divide-y divide-gray-100 text-sm" data-horario-propedeutico>
          {materias.flatMap((m) =>
            m.grupos.map((g) => {
              const mio = !!yo && docenteDe(m.id, g.id, materias) === yo;
              return (
                <li key={m.id + g.id} className={`grid gap-1 py-2.5 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,1fr)] sm:items-center sm:gap-4 ${mio ? "font-medium" : ""}`}>
                  <span className="flex flex-wrap items-center gap-2 text-gray-900">
                    {m.nombre} · grupo {g.id}
                    {mio && <Etiqueta tono="bg-indigo-50 text-primary">Tu grupo</Etiqueta>}
                  </span>
                  <span className="text-gray-700">{describirGrupo(g)}</span>
                  <span className="text-xs text-gray-500">{lugarDe(g)}</span>
                </li>
              );
            }),
          )}
        </ul>
      </Tarjeta>

      <p className="mt-6 text-xs text-gray-500">
        Posgrado programa el día y la hora de las entrevistas y publica los resultados; tú eliges en qué entrevistas participas, llenas y firmas el acta de los profesores entrevistadores y capturas las calificaciones de los grupos del propedéutico que impartes (el examen lo califica la Jefatura de Posgrado).
      </p>
    </>
  );
}
