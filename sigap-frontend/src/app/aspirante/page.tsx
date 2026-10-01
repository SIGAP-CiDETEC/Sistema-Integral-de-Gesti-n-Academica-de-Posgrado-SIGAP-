"use client";

import Link from "next/link";
import { Megaphone } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useContenido } from "@/lib/contenido";

/** Inicio del aspirante (mockup "Inicio del aspirante", RF-08). El contenido lo edita el Departamento de Posgrado. */
export default function AspiranteInicio() {
  const { inicioAspirante, cargado } = useContenido();
  if (!cargado) return null;
  const { aviso, tarjetas } = inicioAspirante;

  return (
    <>
      <PageHeader titulo="Inicio" subtitulo="Información y recursos para tu proceso de admisión" />

      {aviso.visible && (aviso.titulo || aviso.texto) && (
        <section className="mb-5 flex gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-5">
          <Megaphone size={20} className="mt-0.5 shrink-0 text-primary" />
          <div>
            {aviso.titulo && <h2 className="font-semibold text-gray-900">{aviso.titulo}</h2>}
            {aviso.texto && <p className="mt-1 whitespace-pre-line text-sm text-gray-700">{aviso.texto}</p>}
          </div>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {tarjetas.map((r) => (
          <article key={r.id} className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="font-semibold text-gray-900">{r.titulo}</h2>
            <p className="mt-1.5 whitespace-pre-line text-sm text-gray-600">{r.texto}</p>
            {r.accion && (
              <a
                href={r.href || "#"}
                target={r.href?.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="mt-3 inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-primary hover:bg-indigo-100"
              >
                {r.accion}
              </a>
            )}
          </article>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">Consulta el avance de tu solicitud y los pasos siguientes en Admisión.</p>
        <Link href="/aspirante/admision" className="rounded-lg bg-primary px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-primary-hover">
          Ir a mi admisión
        </Link>
      </div>
    </>
  );
}
