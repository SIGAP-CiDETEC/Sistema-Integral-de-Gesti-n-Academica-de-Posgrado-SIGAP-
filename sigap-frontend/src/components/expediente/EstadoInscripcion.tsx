"use client";

import Link from "next/link";
import { CheckCircle2, FileText, Info, Wand2 } from "lucide-react";
import { useExpediente } from "./ExpedienteProvider";
import { useDocumentosFaltantes } from "./bloqueos";

/**
 * Encabezado del proceso de inscripción del aspirante: si ya puede inscribirse (dictamen publicado),
 * qué le falta y acceso a actualizar su currículum (RF-25).
 */
export function EstadoInscripcionAspirante() {
  const { recibidos, cargado, documentos, guardarDocumento } = useExpediente();
  const faltan = useDocumentosFaltantes();
  if (!cargado) return null;
  const dictamen = recibidos["sip-04"];

  return (
    <div className="space-y-4">
      {dictamen ? (
        <section className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-900">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <p>
            Tu dictamen de admisión se publicó el {new Date(dictamen.fecha).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}. Ya puedes integrar tu
            expediente de inscripción; Control Escolar (UTEyCV) lo revisa y te asigna tu número de registro.
          </p>
        </section>
      ) : (
        <section className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <Info size={18} className="mt-0.5 shrink-0" />
          <p>
            La inscripción se habilita cuando Control Escolar publique tu dictamen de admisión (SIP-04).{" "}
            <Link href="/aspirante/dictamen" className="font-medium underline">
              Ver mi dictamen
            </Link>
            . En el cascarón puedes revisar esta sección desde ahora.
          </p>
        </section>
      )}

      {faltan.length > 0 && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p>
            Tus formatos SIP-01, SIP-05 y SIP-06 se habilitan cuando no te falte ningún documento de admisión (RN-11). Faltan:{" "}
            {faltan.map((d) => d.nombre.toLowerCase()).join(", ")}.{" "}
            <Link href="/aspirante/documentos" className="font-medium underline">
              Ir a documentos
            </Link>
          </p>
          <button
            type="button"
            onClick={() => faltan.forEach((d) => guardarDocumento(d.id, { nombre: `${d.id}_ejemplo.pdf`, bytes: 250_000, fecha: new Date().toISOString() }))}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
          >
            <Wand2 size={12} /> Solo cascarón: simular que ya subí mis documentos
          </button>
        </section>
      )}

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm">
        <p className="flex items-start gap-2 text-gray-700">
          <FileText size={17} className="mt-0.5 shrink-0 text-primary" />
          <span>
            ¿Cambió algo de tu currículum desde la admisión? Puedes actualizar tu SIP-02 antes de inscribirte (RF-25).
            {documentos.foto ? "" : " Recuerda subir tu fotografía: se coloca sola en tu SIP-01."}
          </span>
        </p>
        <Link href="/aspirante/formatos/sip-02" className="rounded-lg border border-gray-300 px-3 py-2 font-medium text-gray-700 hover:bg-gray-50">
          Actualizar mi SIP-02
        </Link>
      </section>
    </div>
  );
}
