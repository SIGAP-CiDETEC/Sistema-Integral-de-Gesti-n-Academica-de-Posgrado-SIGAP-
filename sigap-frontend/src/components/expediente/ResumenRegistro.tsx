"use client";

import Link from "next/link";
import { CheckCircle2, ClipboardList } from "lucide-react";
import { SECCIONES, esVisible } from "@/lib/registro-form";
import { REGISTRO_DEMO, nombreCompleto } from "@/lib/aspirante-datos";
import { useExpediente } from "./ExpedienteProvider";

/** Resumen del registro inicial: es la fuente de datos de todos los formatos. */
export function ResumenRegistro() {
  const { registro } = useExpediente();
  const esDemo = registro === REGISTRO_DEMO;

  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-gray-900">
            <ClipboardList size={17} className="text-primary" /> Tu registro inicial
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {nombreCompleto(registro)} · {String(registro.curp ?? "")} · {String(registro.programa ?? "")}
          </p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
          <CheckCircle2 size={13} /> Completado
        </span>
      </header>

      <ul className="divide-y divide-gray-100">
        {SECCIONES.map((s) => {
          const visibles = s.preguntas.filter((p) => esVisible(p, registro));
          const respondidas = visibles.filter((p) => {
            const v = registro[p.id];
            return Array.isArray(v) ? v.length > 0 : !!v;
          });
          return (
            <li key={s.id}>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3 text-sm hover:bg-gray-50">
                  <span className="text-gray-900">{s.titulo}</span>
                  <span className="text-xs text-gray-500">
                    {respondidas.length} / {visibles.length} respuestas
                  </span>
                </summary>
                <dl className="space-y-2 px-5 pb-4 text-sm">
                  {visibles.map((p) => {
                    const v = registro[p.id];
                    return (
                      <div key={p.id} className="grid gap-1 sm:grid-cols-[1fr_1.3fr] sm:gap-4">
                        <dt className="text-gray-500">{p.label}</dt>
                        <dd className="whitespace-pre-wrap text-gray-900">{(Array.isArray(v) ? v.join(", ") : v) || "—"}</dd>
                      </div>
                    );
                  })}
                </dl>
              </details>
            </li>
          );
        })}
      </ul>

      {esDemo && (
        <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
          Mostrando datos de ejemplo. Si completas el <Link href="/registro" className="text-primary underline">registro</Link> en este
          navegador, tus formatos se llenarán con tus propias respuestas.
        </p>
      )}
    </section>
  );
}
