"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Etiqueta } from "@/components/posgrado/ui";
import { fechaCorta, nombreProfesor, totalPuntaje, type AspiranteP } from "@/lib/posgrado/datos";

type Pestana = "sin-cita" | "programadas" | "dictaminadas";

/** Entrevistas colegiadas (RF-10 a RF-12, RF-55, RF-56, RN-07). */
export default function Entrevistas() {
  const { aspirantes, cargado } = usePosgrado();
  const [tab, setTab] = useState<Pestana>("sin-cita");
  if (!cargado) return null;

  const grupos: Record<Pestana, AspiranteP[]> = {
    "sin-cita": aspirantes.filter((a) => a.etapa === "entrevista" && !a.entrevista && !a.concluido),
    programadas: aspirantes
      .filter((a) => a.entrevista && !a.dictamen)
      .sort((x, y) => `${x.entrevista!.fecha}${x.entrevista!.hora}`.localeCompare(`${y.entrevista!.fecha}${y.entrevista!.hora}`)),
    dictaminadas: aspirantes.filter((a) => a.dictamen),
  };
  const etiquetas: Record<Pestana, string> = { "sin-cita": "Sin cita", programadas: "Programadas", dictaminadas: "Con dictamen" };
  const lista = grupos[tab];
  const tono = (r: string) => (r === "Aprobado" ? "bg-emerald-50 text-emerald-700" : r === "Con reservas" ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700");

  return (
    <>
      <PageHeader titulo="Entrevistas colegiadas" subtitulo="Programación de citas, sínodo y dictamen" />

      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {(Object.keys(grupos) as Pestana[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-full border px-3.5 py-1.5 text-sm ${tab === t ? "border-primary bg-primary text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
          >
            {etiquetas[t]} ({grupos[t].length})
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Aspirante</th>
                <th className="px-3 py-2.5 font-medium">Cita</th>
                <th className="px-3 py-2.5 font-medium">Sínodo</th>
                <th className="px-3 py-2.5 font-medium">{tab === "dictaminadas" ? "Dictamen" : "Expediente"}</th>
                <th className="px-5 py-2.5 text-right font-medium">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lista.map((a) => (
                <tr key={a.id}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{a.nombre}</p>
                    <p className="font-mono text-xs text-gray-500">{a.id}</p>
                  </td>
                  <td className="px-3 py-3 text-gray-700">
                    {a.entrevista ? `${fechaCorta(a.entrevista.fecha)} · ${a.entrevista.hora} h` : "—"}
                    {a.entrevista && <span className="block text-xs text-gray-500">{a.entrevista.modalidad} · {a.entrevista.sala}</span>}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-600">{a.entrevista ? a.entrevista.sinodo.map(nombreProfesor).join(", ") : "—"}</td>
                  <td className="px-3 py-3">
                    {a.dictamen ? (
                      <Etiqueta tono={tono(a.dictamen.resolucion)}>
                        {a.dictamen.resolucion} · {totalPuntaje(a.dictamen.puntajes)}/100
                      </Etiqueta>
                    ) : (
                      <Etiqueta tono="bg-emerald-50 text-emerald-700">Aprobado</Etiqueta>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/posgrado/entrevistas/${a.id}`} className="font-medium text-primary hover:underline">
                      {tab === "sin-cita" ? "Programar" : tab === "programadas" ? "Registrar dictamen" : "Ver"}
                    </Link>
                  </td>
                </tr>
              ))}
              {!lista.length && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-500">
                    No hay aspirantes en esta lista.
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
