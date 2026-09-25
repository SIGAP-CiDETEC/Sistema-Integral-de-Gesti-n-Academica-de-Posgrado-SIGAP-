import { Clock, Mail, MapPin } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ALUMNO_DEMO, DIAS, MATERIAS_ACTUALES, PROFESORES } from "@/lib/alumno";

const HORA_INICIO = 8;
const HORA_FIN = 14;
const ALTO_HORA = 56; // px
const COLORES = ["bg-indigo-50 border-indigo-300 text-indigo-900", "bg-rose-50 border-rose-300 text-rose-900", "bg-emerald-50 border-emerald-300 text-emerald-900"];

const minutos = (h: string) => {
  const [hh, mm] = h.split(":").map(Number);
  return (hh - HORA_INICIO) * 60 + mm;
};

/** Horario de clases del periodo actual y sus profesores. Datos de ejemplo. */
export default function AlumnoHorario() {
  const horas = Array.from({ length: HORA_FIN - HORA_INICIO }, (_, i) => HORA_INICIO + i);
  return (
    <>
      <PageHeader titulo="Horario y profesores" subtitulo={`Periodo ${ALUMNO_DEMO.periodoActual} · ${ALUMNO_DEMO.semestre}.er semestre`} />

      <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid min-w-[680px] grid-cols-[52px_repeat(5,1fr)]">
          <div />
          {DIAS.map((d) => (
            <p key={d} className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
              {d}
            </p>
          ))}
          <div className="relative" style={{ height: horas.length * ALTO_HORA }}>
            {horas.map((h, i) => (
              <span key={h} className="absolute right-2 -translate-y-1/2 text-[11px] text-gray-400" style={{ top: i * ALTO_HORA }}>
                {String(h).padStart(2, "0")}:00
              </span>
            ))}
          </div>
          {DIAS.map((d) => (
            <div key={d} className="relative border-l border-gray-100" style={{ height: horas.length * ALTO_HORA }}>
              {horas.map((h, i) => (
                <div key={h} className="absolute inset-x-0 border-t border-gray-100" style={{ top: i * ALTO_HORA }} />
              ))}
              {MATERIAS_ACTUALES.flatMap((m, idx) =>
                (m.clases ?? [])
                  .filter((c) => c.dia === d)
                  .map((c) => (
                    <div
                      key={m.clave + c.inicio}
                      className={`absolute inset-x-1 overflow-hidden rounded-md border-l-4 px-2 py-1 text-xs ${COLORES[idx % COLORES.length]}`}
                      style={{ top: (minutos(c.inicio) / 60) * ALTO_HORA + 1, height: ((minutos(c.fin) - minutos(c.inicio)) / 60) * ALTO_HORA - 2 }}
                    >
                      <p className="font-semibold leading-tight">{m.nombre}</p>
                      <p className="opacity-80">
                        {c.inicio}–{c.fin} · {c.salon}
                      </p>
                    </div>
                  )),
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Clave</th>
              <th className="px-4 py-2.5 font-medium">Unidad de aprendizaje</th>
              <th className="px-4 py-2.5 font-medium">Grupo</th>
              <th className="px-4 py-2.5 text-center font-medium">Créditos</th>
              <th className="px-4 py-2.5 font-medium">Profesor(a)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {MATERIAS_ACTUALES.map((m) => (
              <tr key={m.clave}>
                <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{m.clave}</td>
                <td className="px-4 py-2.5 text-gray-900">{m.nombre}</td>
                <td className="px-4 py-2.5">{m.grupo}</td>
                <td className="px-4 py-2.5 text-center">{m.creditos}</td>
                <td className="px-4 py-2.5">{m.profesor?.nombre ?? "Por asignar"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <h2 className="mb-3 mt-8 font-semibold text-gray-900">Tus profesores</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {PROFESORES.map((p) => (
          <article key={p.id} className="rounded-xl border border-gray-200 bg-white p-5 text-sm">
            <p className="font-semibold text-gray-900">{p.nombre}</p>
            <p className="mt-0.5 text-xs text-gray-500">
              {MATERIAS_ACTUALES.filter((m) => m.profesor?.id === p.id)
                .map((m) => m.nombre)
                .join(", ")}
            </p>
            <ul className="mt-3 space-y-1.5 text-gray-700">
              <li className="flex items-center gap-2">
                <Mail size={14} className="text-gray-400" />
                <a href={`mailto:${p.correo}`} className="text-primary hover:underline">
                  {p.correo}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin size={14} className="text-gray-400" /> {p.cubiculo}
              </li>
              <li className="flex items-center gap-2">
                <Clock size={14} className="text-gray-400" /> Asesorías: {p.asesorias}
              </li>
            </ul>
          </article>
        ))}
      </div>

      <p className="mt-6 text-xs text-gray-400">
        Materias tomadas de tu programa individual (SIP-08), periodo A. Horarios, salones y profesores de ejemplo.
      </p>
    </>
  );
}
