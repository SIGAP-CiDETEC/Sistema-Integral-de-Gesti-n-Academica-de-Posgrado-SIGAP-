"use client";

import { CalendarDays, Clock, MapPin, Video } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Aviso, Tarjeta } from "@/components/posgrado/ui";
import { TextoConEnlaces } from "@/components/TextoConEnlaces";
import { fechaLargaIso } from "@/lib/evaluacion-config";
import type { YoPortal } from "@/lib/portal";

/** 3 · Entrevista (servidor real): la cita que publicó el Departamento de Posgrado. */
export function EntrevistaServidor({ yo }: { yo: YoPortal }) {
  const e = yo.entrevista;
  const enLinea = e?.modalidad === "En línea";
  return (
    <>
      <PageHeader titulo="Entrevista" subtitulo="Entrevista colegiada con 3 profesores" />
      {!e ? (
        <Aviso tono="info" titulo="Tu entrevista colegiada ya concluyó">
          Continúa con tu proceso en la sección Evaluación.
        </Aviso>
      ) : (
        <Tarjeta titulo="Tu cita">
          <dl className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-start gap-2">
              <CalendarDays size={18} className="mt-0.5 text-primary" />
              <div>
                <dt className="text-xs text-gray-500">Fecha</dt>
                <dd className="text-sm font-medium text-gray-900">{fechaLargaIso(e.fecha)}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock size={18} className="mt-0.5 text-primary" />
              <div>
                <dt className="text-xs text-gray-500">Hora</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {e.hora} h · {e.duracion} min
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              {enLinea ? <Video size={18} className="mt-0.5 text-primary" /> : <MapPin size={18} className="mt-0.5 text-primary" />}
              <div className="min-w-0">
                <dt className="text-xs text-gray-500">{enLinea ? "En línea" : "Presencial"}</dt>
                <dd className="break-words text-sm font-medium text-gray-900">
                  <TextoConEnlaces texto={e.sala || "Por confirmar"} />
                </dd>
              </div>
            </div>
          </dl>
          <p className="mt-4 border-t border-gray-100 pt-3 text-sm text-gray-600">
            {enLinea
              ? "Conéctate unos minutos antes con cámara y micrófono funcionando, desde un lugar tranquilo."
              : "Preséntate 15 minutos antes con una identificación oficial."}
          </p>
        </Tarjeta>
      )}
    </>
  );
}
