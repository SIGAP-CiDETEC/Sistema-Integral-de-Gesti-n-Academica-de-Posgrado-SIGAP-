"use client";

import Link from "next/link";
import { useState } from "react";
import { Info, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { EtiquetaBandeja, Etiqueta, Progreso, inputBase } from "@/components/posgrado/ui";
import { ETAPAS } from "@/lib/admision";
import { TONO_BANDEJA, bandejaDe, prioridadDe, progresoDe, type Bandeja, type Prioridad } from "@/lib/posgrado/datos";

const PRIORIDAD: Record<Prioridad, string> = { Alta: "bg-red-50 text-red-700", Media: "bg-amber-50 text-amber-800", Normal: "bg-gray-100 text-gray-600" };

/** Bandeja de aspirantes (RF-49): buscar, filtrar y abrir cada expediente. */
export function BandejaAspirantes({ inicial, prioridadInicial }: { inicial?: string; prioridadInicial?: string }) {
  const { aspirantes, cargado } = usePosgrado();
  const [q, setQ] = useState("");
  const [bandeja, setBandeja] = useState(inicial ?? "");
  const [etapa, setEtapa] = useState("");
  const [prioridad, setPrioridad] = useState(prioridadInicial ?? "");
  const [verRegla, setVerRegla] = useState(false);
  if (!cargado) return null;

  const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const orden: Record<Prioridad, number> = { Alta: 0, Media: 1, Normal: 2 };
  const lista = aspirantes.filter(
    (a) =>
      (!q || norm(`${a.nombre} ${a.curp} ${a.id} ${a.correo}`).includes(norm(q))) &&
      (!bandeja || bandejaDe(a) === bandeja) &&
      (!etapa || a.etapa === etapa) &&
      (!prioridad || prioridadDe(a).nivel === prioridad),
  ).sort((x, y) => orden[prioridadDe(x).nivel] - orden[prioridadDe(y).nivel]);

  const accion = (b: Bandeja) =>
    ({ "Por revisar": "Revisar", "Con observaciones": "Seguimiento", "Sin cita": "Programar", "Entrevista programada": "Dictaminar" } as Partial<Record<Bandeja, string>>)[b] ?? "Ver";

  return (
    <>
      <PageHeader titulo="Bandeja de aspirantes" subtitulo="Consulta y prioriza solicitudes" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          <span className="font-medium text-gray-900">Buscar</span>
          <div className="relative mt-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, CURP o ID temporal" className={`${inputBase} pl-8`} />
          </div>
        </label>
        <label className="text-sm">
          <span className="font-medium text-gray-900">Etapa</span>
          <select value={etapa} onChange={(e) => setEtapa(e.target.value)} className={`${inputBase} mt-1`}>
            <option value="">Todas</option>
            {ETAPAS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="font-medium text-gray-900">Estado</span>
          <select value={bandeja} onChange={(e) => setBandeja(e.target.value)} className={`${inputBase} mt-1`}>
            <option value="">Todos</option>
            {Object.keys(TONO_BANDEJA).map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="font-medium text-gray-900">Prioridad</span>
          <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className={`${inputBase} mt-1`}>
            <option value="">Todas</option>
            <option>Alta</option>
            <option>Media</option>
            <option>Normal</option>
          </select>
        </label>
      </div>

      <div className="mt-3 text-xs text-gray-600">
        <button type="button" onClick={() => setVerRegla((v) => !v)} className="inline-flex items-center gap-1 text-primary hover:underline">
          <Info size={13} /> ¿Cómo se calcula la prioridad?
        </button>
        {verRegla && (
          <ul className="mt-2 space-y-1 rounded-lg border border-gray-200 bg-white p-3">
            <li>
              <b className="text-red-700">Alta:</b> una prórroga vence en 3 días o menos (o ya venció), o el expediente lleva 5 días o más esperando una acción de
              Posgrado.
            </li>
            <li>
              <b className="text-amber-800">Media:</b> lleva de 2 a 4 días esperando una acción de Posgrado.
            </li>
            <li>
              <b className="text-gray-700">Normal:</b> se atendió hace menos de 2 días, o lo siguiente le toca al aspirante (p. ej. corregir observaciones) o a otra área.
            </li>
            <li className="text-gray-500">Se recalcula sola cada vez que alguien actúa sobre el expediente; nadie la captura a mano.</li>
          </ul>
        )}
      </div>

      <section className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <p className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-gray-900">
          Resultados · {lista.length} aspirante{lista.length === 1 ? "" : "s"}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">ID temporal</th>
                <th className="px-3 py-2.5 font-medium">Aspirante</th>
                <th className="px-3 py-2.5 font-medium">Estado</th>
                <th className="px-3 py-2.5 font-medium">Progreso</th>
                <th className="px-3 py-2.5 font-medium">Prioridad</th>
                <th className="px-5 py-2.5 text-right font-medium">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lista.map((a) => {
                const b = bandejaDe(a);
                return (
                  <tr key={a.id} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3 font-mono text-xs text-gray-600">{a.id}</td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-gray-900">
                        {a.nombre} {a.enVivo && <Etiqueta tono="bg-indigo-50 text-primary">este navegador</Etiqueta>}
                      </p>
                      <p className="text-xs text-gray-500">{a.procedencia}</p>
                    </td>
                    <td className="px-3 py-3">
                      <EtiquetaBandeja b={b} />
                    </td>
                    <td className="px-3 py-3">
                      <Progreso {...progresoDe(a)} />
                    </td>
                    <td className="px-3 py-3">
                      <Etiqueta tono={PRIORIDAD[prioridadDe(a).nivel]}>{prioridadDe(a).nivel}</Etiqueta>
                      <p className="mt-0.5 text-[11px] text-gray-500">{prioridadDe(a).motivo}</p>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/posgrado/aspirantes/${a.id}`} className="font-medium text-primary hover:underline">
                        {accion(b)}
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!lista.length && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-500">
                    Ningún aspirante coincide con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <p className="mt-3 text-xs text-gray-400">Programa: Maestría en Tecnología de Cómputo · Aspirantes de ejemplo</p>
    </>
  );
}
