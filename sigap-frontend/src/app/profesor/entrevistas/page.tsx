"use client";

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Etiqueta, Regresar } from "@/components/posgrado/ui";
import { fechaCorta, firmasActa, nombreProfesor } from "@/lib/posgrado/datos";
import { TONO_ENTREVISTA_PROF, entrevistasDe, estadoEntrevistaProf, useProfesorActual, type EstadoEntrevistaProf } from "@/lib/profesor";

const ORDEN: EstadoEntrevistaProf[] = ["Por firmar", "Por realizar", "Esperando firmas", "Dictaminada", "Concluida"];

/** Entrevistas colegiadas en las que el profesor forma parte del sínodo. */
export default function MisEntrevistas() {
  const { aspirantes, cargado } = usePosgrado();
  const { profesor } = useProfesorActual();
  if (!cargado) return null;
  const yo = profesor?.id ?? "";
  const lista = entrevistasDe(aspirantes, yo)
    .map((a) => ({ a, e: estadoEntrevistaProf(a, yo) }))
    .sort((x, y) => ORDEN.indexOf(x.e) - ORDEN.indexOf(y.e) || x.a.entrevista!.fecha.localeCompare(y.a.entrevista!.fecha));

  return (
    <>
      <Regresar href="/profesor" t="Inicio" />
      <PageHeader titulo="Mis entrevistas" subtitulo="Entrevistas colegiadas en las que formas parte del sínodo (acta MTC-EC)" />
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Aspirante</th>
                <th className="px-3 py-2.5 font-medium">Cita</th>
                <th className="px-3 py-2.5 font-medium">Sínodo</th>
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
                  <td className="px-3 py-3 text-xs text-gray-600">{a.entrevista!.sinodo.map(nombreProfesor).join(", ")}</td>
                  <td className="px-3 py-3">
                    <Etiqueta tono={TONO_ENTREVISTA_PROF[e]}>{e === "Dictaminada" ? `Dictaminada · ${a.dictamen!.resolucion}` : e}</Etiqueta>
                    {a.actaEntrevista && !a.dictamen && <span className="mt-0.5 block text-xs text-gray-500">{firmasActa(a)} de 3 firmas</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/profesor/entrevistas/${a.id}`} className="font-medium text-primary hover:underline">
                      {e === "Por realizar" ? "Llenar acta" : e === "Por firmar" ? "Revisar y firmar" : "Ver acta"}
                    </Link>
                  </td>
                </tr>
              ))}
              {!lista.length && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-500">
                    Posgrado aún no te asigna entrevistas.
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
