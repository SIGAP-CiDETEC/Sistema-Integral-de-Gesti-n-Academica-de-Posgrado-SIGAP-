"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Download, Eye, FileCheck2, Loader2, Mail, RotateCcw } from "lucide-react";
import { correoDeArea } from "@/lib/config";
import { esVacio, resolver, type Formato } from "@/lib/formatos";
import { generarPdfFormato } from "@/lib/pdf/cliente";
import { useExpediente } from "./ExpedienteProvider";

const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

/**
 * Documentos que emite otra área (p. ej. SIP-04): el aspirante revisa que sus datos
 * sean correctos y los confirma; después espera el documento firmado.
 * Con backend: POST /formatos/:clave/confirmacion y el documento firmado lo publica UTEyCV (Control Escolar).
 */
export function RevisarDictamen({ formato: f }: { formato: Formato }) {
  const { ctx, confirmados, recibidos, confirmarDatos, recibir, registro } = useExpediente();
  const confirmado = confirmados[f.clave];
  // La dedicación la elige el aspirante en su SIP-05; sin ella no se puede elaborar el dictamen
  const campoDedicacion = f.campos.find((c) => c.id === "estatus");
  const sinDedicacion = !!campoDedicacion && esVacio(resolver(campoDedicacion, ctx));
  const recibido = recibidos[f.clave];
  const [pdf, setPdf] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);

  useEffect(() => () => void (pdf && URL.revokeObjectURL(pdf)), [pdf]);

  async function generar(descargar: boolean) {
    setGenerando(true);
    try {
      const url = await generarPdfFormato(f, ctx, {});
      setPdf(url);
      if (descargar) {
        const a = document.createElement("a");
        a.href = url;
        a.download = `${f.codigo}_${String(ctx.r.apellidoPaterno ?? "aspirante")}.pdf`;
        a.click();
      }
    } finally {
      setGenerando(false);
    }
  }

  const correo = correoDeArea(f.destino);
  const asunto = encodeURIComponent(`Corrección de datos en ${f.codigo} — ${String(registro.apellidoPaterno ?? "")} ${String(registro.nombre ?? "")}`);

  const pasos = [
    { titulo: "Revisa tus datos y confírmalos", hecho: !!confirmado },
    { titulo: "La Comisión de Admisión y el Colegio firman el dictamen", hecho: !!recibido },
    { titulo: "Descarga tu dictamen firmado", hecho: !!recibido },
  ];
  const actual = pasos.findIndex((p) => !p.hecho);

  return (
    <div className="space-y-6">
      {/* Pasos */}
      <ol className="grid gap-3 sm:grid-cols-3">
        {pasos.map((p, i) => (
          <li
            key={p.titulo}
            className={`flex items-start gap-2.5 rounded-xl border p-4 text-sm ${
              p.hecho ? "border-emerald-200 bg-emerald-50" : i === actual ? "border-primary bg-indigo-50/60" : "border-gray-200 bg-white"
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                p.hecho ? "bg-emerald-600 text-white" : i === actual ? "bg-primary text-white" : "border border-gray-300 text-gray-500"
              }`}
            >
              {p.hecho ? <CheckCircle2 size={14} /> : i + 1}
            </span>
            <span className={p.hecho ? "text-emerald-800" : i === actual ? "font-medium text-gray-900" : "text-gray-500"}>{p.titulo}</span>
          </li>
        ))}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Datos */}
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-gray-900">Tus datos en el dictamen</h2>
          <p className="mt-0.5 text-sm text-gray-500">Verifica que estén escritos exactamente como en tus documentos oficiales.</p>
          <dl className="mt-4 divide-y divide-gray-100 text-sm">
            {f.campos.map((c) => {
              const v = resolver(c, ctx);
              return (
                <div key={c.id} className="grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:gap-4">
                  <dt className="text-gray-500">{c.label}</dt>
                  <dd className="text-gray-900">
                    {!esVacio(v) ? (
                      <span className="font-medium">{Array.isArray(v) ? v.join(", ") : v}</span>
                    ) : c.id === "estatus" ? (
                      <span className="text-amber-700">
                        Aún no la indicas.{" "}
                        <Link href="/aspirante/formatos/sip-05" className="underline">
                          Indícala en tu carta protesta (SIP-05)
                        </Link>
                        {" "}para que aparezca en tu dictamen.
                      </span>
                    ) : (
                      "—"
                    )}
                    {c.ayuda && !esVacio(v) && <span className="mt-0.5 block text-xs text-gray-500">{c.ayuda}</span>}
                  </dd>
                </div>
              );
            })}
          </dl>
          <button
            type="button"
            onClick={() => generar(false)}
            disabled={generando}
            className="mt-4 flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {generando ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />} Ver cómo quedará el dictamen
          </button>
        </section>

        {/* Acción según el estado */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          {!confirmado ? (
            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="font-semibold text-gray-900">¿Tus datos son correctos?</h2>
              <p className="mt-1 text-sm text-gray-600">
                Al confirmar, UTEyCV recaba las firmas de la Comisión de Admisión y del Colegio de Profesores.
              </p>
              <button
                type="button"
                onClick={() => confirmarDatos(f.clave, true)}
                disabled={sinDedicacion}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                <CheckCircle2 size={16} /> Sí, mis datos son correctos
              </button>
              {sinDedicacion && (
                <p className="mt-2 text-xs text-amber-700">
                  Antes elige tu dedicación (tiempo completo o parcial) en tu{" "}
                  <Link href="/aspirante/formatos/sip-05" className="underline">
                    carta protesta (SIP-05)
                  </Link>
                  .
                </p>
              )}
              <a
                href={`mailto:${correo}?subject=${asunto}`}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Mail size={15} /> Hay un error en mis datos
              </a>
              <p className="mt-2 text-xs text-gray-500">Se abrirá un correo a {correo} para que te corrijan.</p>
            </section>
          ) : !recibido ? (
            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                <CheckCircle2 size={16} /> Datos confirmados el {fechaCorta(confirmado)}
              </p>
              <p className="mt-3 flex items-start gap-2 text-sm text-gray-700">
                <Clock size={16} className="mt-0.5 shrink-0 text-gray-400" />
                Esperando las firmas de la Comisión de Admisión y del Colegio de Profesores. Te avisaremos por correo y en tus
                notificaciones cuando tu dictamen firmado esté disponible.
              </p>
              <p className="mt-3 text-xs text-gray-500">
                ¿Notaste un error después de confirmar? Escribe a{" "}
                <a href={`mailto:${correo}?subject=${asunto}`} className="text-primary underline">
                  {correo}
                </a>
                .
              </p>
            </section>
          ) : (
            <section className="rounded-xl border border-emerald-200 bg-white p-5">
              <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                <FileCheck2 size={16} /> Tu dictamen firmado ya está disponible
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {recibido.nombre} · publicado el {fechaCorta(recibido.fecha)}
              </p>
              <button
                type="button"
                onClick={() => generar(true)}
                disabled={generando}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
              >
                <Download size={16} /> Descargar dictamen
              </button>
              <p className="mt-2 text-xs text-gray-500">
                En el cascarón se descarga la versión sin firmas; con backend será el PDF firmado que sube UTEyCV.
              </p>
            </section>
          )}
        </aside>
      </div>

      {pdf && (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <p className="border-b border-gray-100 px-5 py-3 text-sm font-medium text-gray-900">
            Vista previa — {f.codigo} (la fecha y hora de la sesión las pone UTEyCV)
          </p>
          <iframe src={pdf} title={`Vista previa ${f.codigo}`} className="h-[80vh] w-full" />
        </section>
      )}

      {/* Solo cascarón */}
      {confirmado && (
        <div className="border-t border-dashed border-gray-300 pt-4">
          <p className="text-xs text-gray-500">Vista de prueba (solo cascarón) — simula lo que hace UTEyCV:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {!recibido && (
              <button
                type="button"
                onClick={() => recibir(f.clave, { nombre: `${f.codigo}_firmado.pdf`, bytes: 248_000, fecha: new Date().toISOString() })}
                className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
              >
                Simular que UTEyCV publica el dictamen firmado
              </button>
            )}
            <button
              type="button"
              onClick={() => confirmarDatos(f.clave, false)}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
            >
              <RotateCcw size={12} /> Reiniciar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
