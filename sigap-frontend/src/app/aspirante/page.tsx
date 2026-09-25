import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { recursosAspirante } from "@/lib/config";

/** Inicio del aspirante (mockup "Inicio del aspirante", RF-08). */
export default function AspiranteInicio() {
  return (
    <>
      <PageHeader titulo="Inicio" subtitulo="Información y recursos para tu proceso de admisión" />

      <div className="grid gap-4 md:grid-cols-2">
        {recursosAspirante.map((r) => (
          <article key={r.titulo} className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="font-semibold text-gray-900">{r.titulo}</h2>
            <p className="mt-1.5 text-sm text-gray-600">{r.texto}</p>
            <a
              href={r.href}
              className="mt-3 inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-primary hover:bg-indigo-100"
            >
              {r.accion}
            </a>
          </article>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">
          Consulta el avance de tu solicitud y los pasos siguientes en Admisión.
        </p>
        <Link
          href="/aspirante/admision"
          className="rounded-lg bg-primary px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-primary-hover"
        >
          Ir a mi admisión
        </Link>
      </div>
    </>
  );
}
