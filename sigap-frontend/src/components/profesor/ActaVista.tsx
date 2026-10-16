"use client";

import { useState } from "react";
import { CheckCircle2, Clock, Download, Loader2 } from "lucide-react";
import { Tarjeta, botonSecundario } from "@/components/posgrado/ui";
import { generarActaMtcEc } from "@/lib/pdf/acta";
import { CRITERIOS_ACTA, VALORACION_TEXTO, fechaHora, nombreProfesor, type AspiranteP } from "@/lib/posgrado/datos";

export const TONO_RESOLUCION = {
  Aprobado: "border-emerald-400 bg-emerald-50 text-emerald-800",
  "Con reservas": "border-amber-400 bg-amber-50 text-amber-800",
  Rechazado: "border-red-400 bg-red-50 text-red-700",
} as const;
/** En el acta oficial la pregunta es "¿Continuar proceso de admisión?" */
export const TEXTO_CONTINUAR = { Aprobado: "Sí", "Con reservas": "Con reservas", Rechazado: "No" } as const;

/** Botón para descargar el acta MTC-EC llenada (plantilla oficial). */
export function DescargarActa({ a }: { a: AspiranteP }) {
  const [cargando, setCargando] = useState(false);
  if (!a.actaEntrevista) return null;
  return (
    <button
      type="button"
      className={botonSecundario}
      disabled={cargando}
      onClick={async () => {
        setCargando(true);
        try {
          const url = await generarActaMtcEc(a, a.actaEntrevista!);
          const el = document.createElement("a");
          el.href = url;
          el.download = `MTC-EC_${a.id}.pdf`;
          el.click();
          setTimeout(() => URL.revokeObjectURL(url), 5000);
        } finally {
          setCargando(false);
        }
      }}
    >
      {cargando ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Descargar acta para imprimir (PDF)
    </button>
  );
}

/** Profesores entrevistadores y estado del acta: quién la llenó y quién subió la versión firmada por los 3. */
export function SinodoActa({ a }: { a: AspiranteP }) {
  const acta = a.actaEntrevista;
  return (
    <div className="space-y-2 text-sm">
      <ul className="space-y-1">
        {(a.entrevista?.sinodo ?? []).map((p) => (
          <li key={p} className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-gray-800">{nombreProfesor(p)}</span>
            <span className="text-xs text-gray-500">
              {acta?.capturadaPor === p && "llenó el acta"}
              {acta?.capturadaPor === p && acta?.firmada?.subidaPor === p && " · "}
              {acta?.firmada?.subidaPor === p && "subió el acta firmada"}
            </span>
          </li>
        ))}
      </ul>
      <p className={`flex items-center gap-1.5 text-xs ${acta?.firmada ? "text-emerald-700" : "text-gray-500"}`}>
        {acta?.firmada ? <CheckCircle2 size={13} /> : <Clock size={13} />}
        {acta?.firmada
          ? `Acta firmada por los 3 subida el ${fechaHora(acta.firmada.el)} (${acta.firmada.archivo})`
          : acta
            ? "Acta llenada: falta imprimirla, firmarla los 3 y subirla"
            : "El acta aún no se llena"}
      </p>
    </div>
  );
}

/** Contenido del acta MTC-EC (solo lectura). */
export function ActaVista({ a, titulo = "Acta de entrevista colegiada (MTC-EC)", sinDescarga = false }: { a: AspiranteP; titulo?: string; sinDescarga?: boolean }) {
  const acta = a.actaEntrevista;
  if (!acta) return null;
  const h = acta.hoja1;
  const filas: [string, string | undefined][] = [
    ["Áreas de interés para su tesis", h.areas.map((x, i) => `${i + 1}. ${x}`).join("  ")],
    ["¿Solicitará beca SECIHTI?", h.becaSecihti],
    ["¿Continuaría sin beca?", h.sinBeca],
    ["Profesor con el que le interesa trabajar", h.profesorInteres === "Sí" ? h.profesorNombre : h.profesorInteres],
    ["Preferencia de horario", h.horario],
    ["Dos habilidades de inglés acreditadas", [h.ingles2, h.inglesSituacion].filter(Boolean).join(" · ")],
    ["Certificado de estudios", [h.certificado, h.certificadoSituacion].filter(Boolean).join(" · ")],
    ["Argumentación final del aspirante", h.argumentacion],
  ];
  return (
    <Tarjeta titulo={titulo} accion={sinDescarga ? undefined : <DescargarActa a={a} />}>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Hoja 1 · Entrevista</h3>
          <dl className="mt-2 space-y-2 text-sm">
            {filas.map(([k, v]) => (
              <div key={k}>
                <dt className="text-gray-500">{k}</dt>
                <dd className="break-words text-gray-900">{v || "—"}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Hoja 2 · Conclusiones de los profesores entrevistadores</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {CRITERIOS_ACTA.map((c) => (
              <li key={c.id} className="flex justify-between gap-3">
                <span className="text-gray-700">{c.t}</span>
                <span className="shrink-0 font-medium text-gray-900">{acta.criterios[c.id] ? VALORACION_TEXTO[acta.criterios[c.id]!] : "—"}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-gray-500">Proyección a futuro</dt>
              <dd className="break-words text-gray-900">{acta.proyeccion || "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Observaciones generales</dt>
              <dd className="break-words text-gray-900">{acta.observaciones || "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">¿Continuar proceso de admisión?</dt>
              <dd>
                <span className={`rounded-full border px-2.5 py-0.5 text-sm ${TONO_RESOLUCION[acta.resolucion]}`}>
                  {TEXTO_CONTINUAR[acta.resolucion]} ({acta.resolucion})
                </span>
                {acta.motivo && <span className="mt-1 block text-gray-700">Motivo: {acta.motivo}</span>}
              </dd>
            </div>
          </dl>
          <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Entrevistadores</h3>
          <div className="mt-2">
            <SinodoActa a={a} />
          </div>
        </div>
      </div>
    </Tarjeta>
  );
}
