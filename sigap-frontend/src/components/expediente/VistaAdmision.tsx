"use client";

import Link from "next/link";
import { ArrowRight, CircleCheck, CircleHelp, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ETAPAS, indiceEtapa, type Aviso, type SolicitudAdmision } from "@/lib/admision";

/**
 * Mi admisión (RF-13): el aspirante consulta el estado de su proceso.
 * CASCARÓN: ?etapa=<id> cambia el ejemplo mostrado. Con backend,
 * la solicitud se obtendrá de GET /aspirantes/me/solicitud.
 */
export function VistaAdmision({
  solicitud,
  estado = ETAPAS[indiceEtapa(solicitud.etapa)].estado,
  tipoAlumno = "Aspirante",
  demo = false,
}: {
  solicitud: SolicitudAdmision;
  estado?: string;
  tipoAlumno?: string;
  demo?: boolean;
}) {
  const actual = indiceEtapa(solicitud.etapa);

  return (
    <>
      <PageHeader titulo="Mi admisión" subtitulo={`Seguimiento de la solicitud ${solicitud.idTemporal}`} />

      {/* Barra de etapas */}
      <ol className="grid grid-cols-3 gap-x-2 gap-y-3 sm:grid-cols-6" aria-label="Etapas del proceso">
        {ETAPAS.map((e, i) => {
          const alcanzada = i <= actual;
          return (
            <li key={e.id} aria-current={i === actual ? "step" : undefined}>
              <div className={`h-1.5 rounded-full ${alcanzada ? "bg-guinda" : "bg-gray-200"}`} />
              <p
                className={`mt-1.5 text-xs ${
                  i === actual ? "font-semibold text-guinda" : alcanzada ? "text-guinda" : "text-gray-500"
                }`}
              >
                {e.label}
              </p>
            </li>
          );
        })}
      </ol>

      {/* Indicadores */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Indicador
          valor={`${solicitud.documentos.validados} / ${solicitud.documentos.total}`}
          etiqueta="Documentos validados"
          color="text-emerald-700"
        />
        <Indicador
          valor={solicitud.proximaActividad?.fecha ?? "—"}
          etiqueta={solicitud.proximaActividad ? `Próxima actividad · ${solicitud.proximaActividad.descripcion}` : "Próxima actividad"}
          color="text-primary"
        />
        <Indicador valor={String(solicitud.avisos.length)} etiqueta="Notificaciones nuevas" color="text-amber-600" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Resumen */}
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-gray-900">Resumen de solicitud</h2>
          <dl className="mt-3 divide-y divide-gray-100 text-sm">
            {[
              ["Programa", solicitud.programa],
              ["Estado", estado],
              ["Tipo", tipoAlumno],
              ["Modalidad", solicitud.modalidad],
              ["ID temporal", solicitud.idTemporal],
            ].map(([k, v]) => (
              <div key={k} className="grid grid-cols-[120px_1fr] gap-4 py-3">
                <dt className="text-gray-500">{k}</dt>
                <dd className="text-gray-900">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Notificaciones */}
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-gray-900">Centro de notificaciones</h2>
          <ul className="mt-3 space-y-3">
            {solicitud.avisos.map((a) => (
              <AvisoItem key={a.titulo} aviso={a} />
            ))}
          </ul>
        </section>
      </div>

      {/* Siguiente paso */}
      {solicitud.siguientePaso && (
        <section className="mt-6 flex flex-col gap-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Siguiente paso</p>
            <p className="mt-1 font-semibold text-gray-900">{solicitud.siguientePaso.titulo}</p>
            <p className="mt-0.5 text-sm text-gray-600">{solicitud.siguientePaso.texto}</p>
          </div>
          <Link
            href={solicitud.siguientePaso.href}
            className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
          >
            {solicitud.siguientePaso.accion} <ArrowRight size={16} />
          </Link>
        </section>
      )}

      {/* Solo para el cascarón: ver cada etapa */}
      <div className="mt-10 border-t border-dashed border-gray-300 pt-4">
        <p className="text-xs text-gray-500">
          Vista de prueba (solo cascarón) — {demo ? "estás viendo un ejemplo; " : "muestra lo que ha hecho el personal con tu solicitud; "}ver ejemplos de cada etapa:{" "}
          {demo && (
            <Link href="/aspirante/admision" className="text-primary underline">
              volver a mi solicitud real
            </Link>
          )}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ETAPAS.map((e) => (
            <Link
              key={e.id}
              href={`/aspirante/admision?etapa=${e.id}`}
              className={`rounded-full border px-3 py-1 text-xs ${
                demo && e.id === solicitud.etapa
                  ? "border-primary bg-primary text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {e.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

function Indicador({ valor, etiqueta, color }: { valor: string; etiqueta: string; color: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className={`text-3xl font-normal ${color}`}>{valor}</p>
      <p className="mt-1 text-sm text-gray-600">{etiqueta}</p>
    </div>
  );
}

const ESTILO_AVISO = {
  info: { caja: "bg-indigo-50", titulo: "text-primary", Icono: CircleHelp, icono: "text-emerald-600" },
  alerta: { caja: "bg-amber-50", titulo: "text-amber-700", Icono: TriangleAlert, icono: "text-amber-600" },
  exito: { caja: "bg-emerald-50", titulo: "text-emerald-700", Icono: CircleCheck, icono: "text-emerald-600" },
} as const;

function AvisoItem({ aviso }: { aviso: Aviso }) {
  const e = ESTILO_AVISO[aviso.tipo];
  return (
    <li className={`flex gap-3 rounded-lg p-4 text-sm ${e.caja}`}>
      <e.Icono size={18} className={`mt-0.5 shrink-0 ${e.icono}`} />
      <div>
        <p className={`font-semibold ${e.titulo}`}>{aviso.titulo}</p>
        <p className="mt-0.5 text-gray-700">{aviso.texto}</p>
      </div>
    </li>
  );
}
