"use client";

import Link from "next/link";
import { useState } from "react";
import { Send } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { usePublicarEntrevistas } from "@/components/posgrado/usePublicarEntrevistas";
import { Etiqueta, Regresar, botonPrimario, botonSecundario } from "@/components/posgrado/ui";
import { TONO_PASO_ENTREVISTA, fechaCorta, lugaresLibres, nombreProfesor, pasoEntrevista, type AspiranteP } from "@/lib/posgrado/datos";

type Pestana = "sin-horario" | "horarios" | "publicadas" | "dictaminadas";

/**
 * Entrevistas colegiadas (RF-10 a RF-12, RF-55, RF-56, RN-07). Posgrado captura y actualiza los horarios,
 * los publica a los profesores, ve cómo se llenan los sínodos y publica las entrevistas a los aspirantes.
 */
export default function Entrevistas() {
  const { aspirantes, cargado } = usePosgrado();
  const { publicarHorario, publicarEntrevista } = usePublicarEntrevistas();
  const [tab, setTab] = useState<Pestana>("horarios");
  if (!cargado) return null;

  const porFecha = (x: AspiranteP, y: AspiranteP) => `${x.entrevista!.fecha}${x.entrevista!.hora}`.localeCompare(`${y.entrevista!.fecha}${y.entrevista!.hora}`);
  const grupos: Record<Pestana, AspiranteP[]> = {
    "sin-horario": aspirantes.filter((a) => a.etapa === "entrevista" && !a.entrevista && !a.concluido),
    horarios: aspirantes.filter((a) => a.entrevista && !a.entrevista.notificadaEl && !a.dictamen && !a.concluido).sort(porFecha),
    publicadas: aspirantes.filter((a) => a.entrevista?.notificadaEl && !a.dictamen && !a.concluido).sort(porFecha),
    dictaminadas: aspirantes.filter((a) => a.dictamen),
  };
  const etiquetas: Record<Pestana, string> = { "sin-horario": "Sin horario", horarios: "Horarios por publicar", publicadas: "Publicadas al aspirante", dictaminadas: "Con dictamen" };
  const lista = grupos[tab];
  const sinPublicar = grupos.horarios.filter((a) => pasoEntrevista(a.entrevista!) === "Horario sin publicar");
  const listas = grupos.horarios.filter((a) => pasoEntrevista(a.entrevista!) === "Lista para publicar");
  const tono = (r: string) => (r === "Aprobado" ? "bg-emerald-50 text-emerald-700" : r === "Con reservas" ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700");

  return (
    <>
      <Regresar href="/posgrado" t="Inicio" />
      <PageHeader titulo="Entrevistas colegiadas" subtitulo="Horarios, sínodos que eligen los profesores y publicación al aspirante" />

      <ol className="mb-5 grid gap-2 text-sm sm:grid-cols-3">
        {[
          ["1", "Captura el horario", "Fecha, hora y sala de cada aspirante con expediente aprobado."],
          ["2", "Publica los horarios", "Los profesores los ven solo con día y hora y eligen en cuáles participan (3 por sínodo)."],
          ["3", "Publica las entrevistas", "Con el sínodo completo, el aspirante recibe su cita y los recordatorios."],
        ].map(([n, t, d]) => (
          <li key={n} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <p className="font-medium text-gray-900">
              <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-white">{n}</span>
              {t}
            </p>
            <p className="mt-1 text-xs text-gray-500">{d}</p>
          </li>
        ))}
      </ol>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="tablist">
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
        <div className="flex flex-wrap gap-2">
          <button type="button" className={botonSecundario} disabled={!sinPublicar.length} onClick={() => sinPublicar.forEach(publicarHorario)}>
            <Send size={14} /> Publicar horarios a profesores ({sinPublicar.length})
          </button>
          <button type="button" className={botonPrimario} disabled={!listas.length} onClick={() => listas.forEach(publicarEntrevista)}>
            <Send size={14} /> Publicar entrevistas a aspirantes ({listas.length})
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Aspirante</th>
                <th className="px-3 py-2.5 font-medium">Horario</th>
                <th className="px-3 py-2.5 font-medium">Sínodo</th>
                <th className="px-3 py-2.5 font-medium">{tab === "dictaminadas" ? "Dictamen" : "Estado"}</th>
                <th className="px-5 py-2.5 text-right font-medium">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lista.map((a) => {
                const e = a.entrevista;
                const paso = e ? pasoEntrevista(e) : null;
                return (
                  <tr key={a.id} data-fila={a.id}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{a.nombre}</p>
                      <p className="font-mono text-xs text-gray-500">{a.id}</p>
                    </td>
                    <td className="px-3 py-3 text-gray-700">
                      {e ? `${fechaCorta(e.fecha)} · ${e.hora} h` : "—"}
                      {e && <span className="block text-xs text-gray-500">{e.modalidad} · {e.sala}</span>}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600">
                      {e ? (
                        <>
                          <span className="font-medium text-gray-900">{e.sinodo.length} de 3</span>
                          {e.sinodo.length > 0 && <span className="block">{e.sinodo.map(nombreProfesor).join(", ")}</span>}
                          {!a.dictamen && lugaresLibres(e) > 0 && <span className="block text-amber-700">{lugaresLibres(e)} lugar(es) libre(s)</span>}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {a.dictamen ? (
                        <Etiqueta tono={tono(a.dictamen.resolucion)}>{a.dictamen.resolucion}</Etiqueta>
                      ) : a.actaEntrevista ? (
                        <Etiqueta tono="bg-sky-50 text-sky-800">Acta llenada · por subir firmada</Etiqueta>
                      ) : paso ? (
                        <Etiqueta tono={TONO_PASO_ENTREVISTA[paso]}>{paso}</Etiqueta>
                      ) : (
                        <Etiqueta tono="bg-emerald-50 text-emerald-700">Expediente aprobado</Etiqueta>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="inline-flex flex-wrap items-center justify-end gap-3">
                        {paso === "Horario sin publicar" && (
                          <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => publicarHorario(a)}>
                            Publicar horario
                          </button>
                        )}
                        {paso === "Lista para publicar" && (
                          <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => publicarEntrevista(a)}>
                            Publicar entrevista
                          </button>
                        )}
                        <Link href={`/posgrado/entrevistas/${a.id}`} className="font-medium text-primary hover:underline">
                          {tab === "sin-horario" ? "Capturar horario" : tab === "dictaminadas" ? "Ver" : "Seguimiento"}
                        </Link>
                      </span>
                    </td>
                  </tr>
                );
              })}
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
