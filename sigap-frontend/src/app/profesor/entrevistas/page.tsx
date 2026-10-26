"use client";

import Link from "next/link";
import { CalendarClock, CalendarPlus, Eye, LogOut, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Etiqueta, Regresar, Tarjeta } from "@/components/posgrado/ui";
import { useAccionesProfesor } from "@/components/profesor/useAccionesProfesor";
import { fechaCorta, lugaresLibres, nombreProfesor } from "@/lib/posgrado/datos";
import {
  TONO_ENTREVISTA_PROF,
  citaPublicada,
  entrevistasDe,
  entrevistasDisponibles,
  estadoEntrevistaProf,
  useProfesorActual,
  type EstadoEntrevistaProf,
} from "@/lib/profesor";

const ORDEN: EstadoEntrevistaProf[] = ["Por llenar acta", "Por subir firmada", "Esperando publicación", "Profesores entrevistadores incompletos", "Dictaminada", "Concluida"];

const diaLargo = (iso: string) => {
  const t = new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/**
 * Entrevistas colegiadas del profesor:
 * 1. Disponibles para elegir (solo día y hora).
 * 2. Las que eligió y aún no se completan: sin datos del aspirante; puede dejar su lugar.
 * 3. Las que Posgrado ya publicó: ya no puede salirse y ve los datos del aspirante para la entrevista y el acta.
 */
export default function MisEntrevistas() {
  const { aspirantes, cargado } = usePosgrado();
  const { profesor } = useProfesorActual();
  const { elegirEntrevista, dejarLugar } = useAccionesProfesor();
  if (!cargado) return null;
  const yo = profesor?.id ?? "";
  const disponibles = entrevistasDisponibles(aspirantes, yo);
  const mias = entrevistasDe(aspirantes, yo);
  const porFecha = (x: (typeof mias)[number], y: (typeof mias)[number]) => `${x.entrevista!.fecha}${x.entrevista!.hora}`.localeCompare(`${y.entrevista!.fecha}${y.entrevista!.hora}`);
  const seleccionadas = mias.filter((a) => !citaPublicada(a) && !a.concluido).sort(porFecha);
  const lista = mias
    .filter((a) => citaPublicada(a) || a.concluido)
    .map((a) => ({ a, e: estadoEntrevistaProf(a) }))
    .sort((x, y) => ORDEN.indexOf(x.e) - ORDEN.indexOf(y.e) || porFecha(x.a, y.a));

  return (
    <>
      <Regresar href="/profesor" t="Inicio" />
      <PageHeader titulo="Mis entrevistas" subtitulo="Elige las entrevistas colegiadas en las que participarás y llena el acta MTC-EC" />

      <Tarjeta titulo={<span className="flex items-center gap-2"><CalendarPlus size={17} className="text-primary" /> Entrevistas disponibles para elegir</span>} className="mb-6">
        <p className="mb-3 text-sm text-gray-600">
          Posgrado programa el día y la hora; en cada entrevista participan 3 profesores entrevistadores (colegiados o de asignatura). Verás los datos del aspirante
          cuando Posgrado publique la cita.
        </p>
        {disponibles.length ? (
          <ul className="divide-y divide-gray-100 text-sm">
            {disponibles.map(({ a, choque }) => {
              const libres = lugaresLibres(a.entrevista);
              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5" data-disponible={a.id}>
                  <span>
                    <span className="font-medium text-gray-900">{diaLargo(a.entrevista!.fecha)}</span>
                    <span className="ml-2 text-gray-700">{a.entrevista!.hora} h</span>
                    <span className="block text-xs text-gray-500">
                      {libres} {libres === 1 ? "lugar libre" : "lugares libres"} de 3
                    </span>
                  </span>
                  {choque ? (
                    <span className="text-xs text-amber-700">Ya tienes otra entrevista a esa hora</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => elegirEntrevista(a, yo)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover"
                    >
                      <CalendarPlus size={14} /> Elegir
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">{yo ? "No hay entrevistas con lugares libres." : "Elige un profesor en la vista de prueba."}</p>
        )}
      </Tarjeta>

      <Tarjeta titulo={<span className="flex items-center gap-2"><CalendarClock size={17} className="text-primary" /> Entrevistas que seleccionaste pero aún no se completa</span>} className="mb-6">
        <p className="mb-3 text-sm text-gray-600">
          Mientras Posgrado no publique la cita puedes dejar tu lugar. Los datos del aspirante aparecerán en <b>Entrevistas de las que formas parte</b> cuando se publique.
        </p>
        {seleccionadas.length ? (
          <ul className="divide-y divide-gray-100 text-sm">
            {seleccionadas.map((a) => {
              const libres = lugaresLibres(a.entrevista);
              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5" data-seleccionada={a.id}>
                  <span>
                    <span className="font-medium text-gray-900">{diaLargo(a.entrevista!.fecha)}</span>
                    <span className="ml-2 text-gray-700">{a.entrevista!.hora} h</span>
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                      <Users size={12} /> Profesores entrevistadores: {a.entrevista!.sinodo.length} de 3
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-3">
                    <Etiqueta tono="bg-gray-100 text-gray-700">{libres ? `Faltan ${libres} profesor(es)` : "Esperando que Posgrado publique la cita"}</Etiqueta>
                    <button type="button" onClick={() => dejarLugar(a, yo)} className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-red-700 hover:underline">
                      <LogOut size={13} /> Dejar lugar
                    </button>
                    <button
                      type="button"
                      disabled
                      title="Disponible cuando Posgrado publique la cita"
                      className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-400"
                    >
                      <Eye size={13} /> Ver
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No tienes entrevistas pendientes de publicar.</p>
        )}
      </Tarjeta>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <h2 className="border-b border-gray-100 px-5 py-3 font-semibold text-gray-900">Entrevistas de las que formas parte</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Aspirante</th>
                <th className="px-3 py-2.5 font-medium">Cita</th>
                <th className="px-3 py-2.5 font-medium">Profesores entrevistadores</th>
                <th className="px-3 py-2.5 font-medium">Acta</th>
                <th className="px-5 py-2.5 text-right font-medium">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lista.map(({ a, e }) => (
                <tr key={a.id}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{a.nombre}</p>
                    <p className="font-mono text-xs text-gray-500">{a.id}</p>
                  </td>
                  <td className="px-3 py-3 text-gray-700">
                    {fechaCorta(a.entrevista!.fecha)} · {a.entrevista!.hora} h
                    <span className="block text-xs text-gray-500">
                      {a.entrevista!.modalidad} · {a.entrevista!.sala}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-600">
                    {a.entrevista!.sinodo.map(nombreProfesor).join(", ")}
                    {lugaresLibres(a.entrevista) > 0 && <span className="block text-gray-400">{lugaresLibres(a.entrevista)} lugar(es) libre(s)</span>}
                  </td>
                  <td className="px-3 py-3">
                    <Etiqueta tono={TONO_ENTREVISTA_PROF[e]}>{e === "Dictaminada" ? `Dictaminada · ${a.dictamen!.resolucion}` : e}</Etiqueta>
                    {a.actaEntrevista && !a.dictamen && <span className="mt-0.5 block text-xs text-gray-500">La llenó {nombreProfesor(a.actaEntrevista.capturadaPor)}</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="inline-flex flex-wrap items-center justify-end gap-3">
                      <Link href={`/profesor/entrevistas/${a.id}`} className="font-medium text-primary hover:underline">
                        {e === "Por llenar acta" ? "Llenar acta" : e === "Por subir firmada" ? "Descargar o subir firmada" : "Ver"}
                      </Link>
                    </span>
                  </td>
                </tr>
              ))}
              {!lista.length && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-500">
                    Aquí aparecerán las entrevistas que elegiste cuando Posgrado publique la cita al aspirante.
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
