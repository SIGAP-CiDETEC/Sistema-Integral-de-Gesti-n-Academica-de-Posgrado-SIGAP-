import { CalendarClock, CalendarDays, ClipboardCheck, ListChecks } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DatosAlumno, ReiniciarSimulacion } from "@/components/alumno/DatosAlumno";
import { REINSCRIPCION } from "@/lib/alumno";

/** Inicio del alumno: información de reinscripción (RF-70, SIP-10). Datos de ejemplo. */
export default function AlumnoInicio() {
  const r = REINSCRIPCION;
  return (
    <>
      <PageHeader titulo="Inicio" subtitulo="Información de reinscripción y avisos para alumnos" />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="flex flex-wrap items-start justify-between gap-3 bg-navy-900 px-5 py-4 text-white">
              <div>
                <p className="text-xs uppercase tracking-wide text-white/60">Reinscripción</p>
                <h2 className="text-lg font-semibold">Periodo {r.periodo}</h2>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">Próximamente</span>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-3">
              <Dato icono={<CalendarClock size={16} />} titulo="Abre" valor={r.abre} />
              <Dato icono={<CalendarClock size={16} />} titulo="Cierra" valor={r.cierra} />
              <Dato icono={<CalendarDays size={16} />} titulo="Inicio de clases" valor={r.inicioClases} />
            </div>
            <p className="border-t border-gray-100 px-5 py-3 text-sm text-gray-600">
              Cuando se abra la ventana, aquí se habilitará tu solicitud de reinscripción (SIP-10), llenada con tus datos como en la admisión.
            </p>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900">
              <ListChecks size={17} className="text-primary" /> Cómo reinscribirte
            </h2>
            <ol className="mt-4 grid gap-3 sm:grid-cols-2">
              {r.pasos.map((p, i) => (
                <li key={p.titulo} className="flex gap-3 rounded-lg bg-gray-50 p-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">{i + 1}</span>
                  <span>
                    <span className="font-medium text-gray-900">{p.titulo}</span>
                    <span className="block text-gray-600">{p.texto}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900">
              <ClipboardCheck size={17} className="text-primary" /> Requisitos
            </h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-gray-700">
              {r.requisitos.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-6">
          <DatosAlumno />
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="font-semibold text-gray-900">Fechas importantes</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {r.fechas.map((f) => (
                <li key={f.evento} className="flex gap-3">
                  <span className="w-24 shrink-0 font-medium text-guinda">{f.fecha}</span>
                  <span className="text-gray-700">{f.evento}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <p className="mt-6 text-xs text-gray-400">Fechas y requisitos de ejemplo · Referencia: RF-68, RF-70, Módulo 19 (UTEyCV)</p>
      <ReiniciarSimulacion />
    </>
  );
}

function Dato({ icono, titulo, valor }: { icono: React.ReactNode; titulo: string; valor: string }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs text-gray-500">
        {icono} {titulo}
      </p>
      <p className="mt-0.5 font-semibold text-gray-900">{valor}</p>
    </div>
  );
}
