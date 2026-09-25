import { CheckCircle2, Circle, Mail, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { TESIS } from "@/lib/alumno";
import { nombreAsesor } from "@/lib/programa-individual";

/** Director(es) de tesis y comité tutorial (RF-73, RF-75: MTC-01, SIP-13, SIP-19). Datos de ejemplo. */
export default function AlumnoTesis() {
  return (
    <>
      <PageHeader titulo="Directores de tesis" subtitulo="Tu tema, tus directores y tu comité tutorial" />

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-wide text-gray-500">Tema de tesis</p>
            <h2 className="mt-1 text-lg font-semibold text-gray-900">{TESIS.tema}</h2>
          </div>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
            {TESIS.estado === "Registrado" ? "Registrado" : "Propuesta · sin registrar"}
          </span>
        </div>
        <p className="mt-2 text-sm text-gray-600">{TESIS.nota}</p>
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {TESIS.directores.map((d) => (
          <article key={d.nombre} className="rounded-xl border border-gray-200 bg-white p-5 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-guinda">{d.rol}</p>
            <p className="mt-1 text-base font-semibold text-gray-900">{d.nombre}</p>
            <p className="text-gray-600">
              {d.linea} · {d.adscripcion}
            </p>
            <a href={`mailto:${d.correo}`} className="mt-3 inline-flex items-center gap-1.5 text-primary hover:underline">
              <Mail size={14} /> {d.correo}
            </a>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="flex items-center gap-2 font-semibold text-gray-900">
            <Users size={17} className="text-primary" /> Comité tutorial
          </h2>
          <ul className="mt-3 divide-y divide-gray-100 text-sm">
            {TESIS.comite.map((c) => (
              <li key={c.nombre} className="flex justify-between gap-4 py-2.5">
                <span className="text-gray-900">{c.nombre}</span>
                <span className="text-gray-500">{c.papel}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-gray-500">Asesor académico: {nombreAsesor()}</p>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-gray-900">Avance del registro</h2>
          <ol className="mt-3 space-y-3 text-sm">
            {TESIS.hitos.map((h) => (
              <li key={h.titulo} className={`flex items-center gap-2 ${h.hecho ? "text-emerald-700" : "text-gray-600"}`}>
                {h.hecho ? <CheckCircle2 size={16} /> : <Circle size={16} className="text-gray-300" />} {h.titulo}
              </li>
            ))}
          </ol>
        </section>
      </div>

      <p className="mt-6 text-xs text-gray-400">Tema, directores y comité de ejemplo · Referencia: RF-73 a RF-75</p>
    </>
  );
}
