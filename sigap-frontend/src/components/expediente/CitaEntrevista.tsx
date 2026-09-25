"use client";

import { CalendarDays, Clock, MapPin, Users } from "lucide-react";
import { useEstadoAdmision } from "@/lib/posgrado/revision";

const fechaLarga = (f: string) =>
  new Date(`${f}T12:00:00`).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

/** Cita de entrevista que programó Posgrado (RF-10). El aspirante ve fecha, hora y lugar; no los puntajes. */
export function CitaEntrevista() {
  const { entrevista, resultadoEntrevista } = useEstadoAdmision();

  if (!entrevista)
    return (
      <section className="rounded-xl border border-dashed border-gray-300 bg-white p-5 text-sm">
        <p className="font-semibold text-gray-900">Aún no tienes cita</p>
        <p className="mt-1 text-gray-600">
          El Departamento de Posgrado la programa cuando tu expediente está aprobado. Te avisaremos por correo y en tus notificaciones.
        </p>
        <p className="mt-3 text-xs text-gray-400">Solo cascarón: prográmala desde la sesión de Posgrado (Entrevistas).</p>
      </section>
    );

  const datos: [typeof Clock, string, string][] = [
    [CalendarDays, "Fecha", fechaLarga(entrevista.fecha)],
    [Clock, "Hora", `${entrevista.hora} h`],
    [MapPin, entrevista.modalidad === "En línea" ? "Enlace" : "Lugar", `${entrevista.sala} · ${entrevista.modalidad}`],
  ];
  return (
    <section className="grid gap-4 rounded-xl border border-gray-200 bg-white p-5 md:grid-cols-2">
      <div>
        <h2 className="font-semibold text-gray-900">{resultadoEntrevista ? "Entrevista realizada" : "Cita confirmada"}</h2>
        <dl className="mt-3 space-y-2.5 text-sm">
          {datos.map(([I, k, v]) => (
            <div key={k} className="flex gap-2.5">
              <I size={16} className="mt-0.5 shrink-0 text-gray-400" />
              <dt className="w-14 shrink-0 text-gray-500">{k}</dt>
              <dd className="text-gray-900 first-letter:uppercase">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div>
        <h2 className="flex items-center gap-2 font-semibold text-gray-900">
          <Users size={16} /> Sínodo colegiado
        </h2>
        <p className="mt-3 text-sm text-gray-700">Te entrevistarán 3 profesores colegiados del programa (RN-07).</p>
        {resultadoEntrevista && resultadoEntrevista !== "Rechazado" && (
          <p className="mt-3 inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs text-emerald-700">Entrevista aprobada · continúa con tu evaluación</p>
        )}
      </div>
    </section>
  );
}
