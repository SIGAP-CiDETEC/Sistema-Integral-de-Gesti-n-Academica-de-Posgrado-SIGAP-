"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Download, Eye, FileCheck2, Loader2, Mail, RotateCcw, Wand2 } from "lucide-react";
import { correoDeArea } from "@/lib/config";
import { resolver, type Formato } from "@/lib/formatos";
import { generarPdfFormato } from "@/lib/pdf/cliente";
import { PROGRAMA_INDIVIDUAL_DEMO, nombreAsesor } from "@/lib/programa-individual";
import { useExpediente } from "./ExpedienteProvider";
import { FirmasOtros } from "./FirmasOtros";
import { SubirFirmado } from "./SubirFirmado";

const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

/**
 * Documentos que prepara el asesor académico con Control Escolar — UTEyCV (SIP-08):
 * el aspirante lo recibe, lo revisa, lo imprime, lo firma y sube el escaneo.
 * Con backend: el asesor captura las materias en su sesión y el sistema notifica al aspirante.
 */
export function DocumentoAsesor({ formato: f }: { formato: Formato }) {
  const { ctx, recibidos, firmados, recibir, subirFirmado, registro } = useExpediente();
  const recibido = recibidos[f.clave];
  const firmado = firmados[f.clave];
  const [pdf, setPdf] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);
  const P = PROGRAMA_INDIVIDUAL_DEMO;
  const totalCreditos = P.materias.reduce((t, m) => t + m.creditos, 0);

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
  const asunto = encodeURIComponent(`Corrección en ${f.codigo} — ${String(registro.apellidoPaterno ?? "")} ${String(registro.nombre ?? "")}`);
  const dato = (id: string) => {
    const c = f.campos.find((x) => x.id === id);
    const v = c ? resolver(c, ctx) : undefined;
    return Array.isArray(v) ? v.join(", ") : v ?? "—";
  };

  const pasos = [
    { titulo: "Tu asesor prepara tu programa con UTEyCV", hecho: !!recibido },
    { titulo: "Revísalo, imprímelo y fírmalo", hecho: !!firmado },
    { titulo: "Sube el escaneo firmado", hecho: !!firmado },
  ];
  const actual = pasos.findIndex((p) => !p.hecho);

  return (
    <div className="space-y-6">
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

      {!recibido ? (
        <section className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-700">
          <p className="flex items-center gap-2 font-medium text-gray-900">
            <Clock size={16} className="text-gray-400" /> Tu asesor académico está preparando tu programa individual
          </p>
          <p className="mt-2">
            Con base en el artículo 12 del Reglamento de Estudios de Posgrado, tu asesor define contigo las unidades de aprendizaje
            que cursarás. Cuando lo registre, te avisaremos por correo y en tus notificaciones para que lo revises y lo firmes.
          </p>
          <FirmasOtros firmas={f.firmas} recibe={f.destino} />
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold text-gray-900">Tu programa individual</h2>
                <p className="mt-0.5 text-sm text-gray-500">Revisa tus datos y las materias asignadas antes de firmarlo.</p>
              </div>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] text-amber-800">Materias y asesor de ejemplo</span>
            </div>

            <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {[
                ["Alumno(a)", dato("nombreCompleto")],
                ["No. de registro", dato("noRegistro")],
                ["Tiempo de dedicación", dato("estatus")],
                ["Programa", dato("programa")],
                ["Asesor académico", nombreAsesor()],
                ["Unidad académica", dato("unidadAcademica")],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-gray-500">{k}</dt>
                  <dd className="font-medium text-gray-900">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Clave</th>
                    <th className="px-3 py-2 font-medium">Unidad de aprendizaje</th>
                    <th className="px-3 py-2 text-center font-medium">Créditos</th>
                    <th className="px-3 py-2 text-center font-medium">Periodo</th>
                    <th className="px-3 py-2 font-medium">Lugar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {P.materias.map((m) => (
                    <tr key={m.clave}>
                      <td className="px-3 py-2 font-mono text-xs text-gray-600">{m.clave}</td>
                      <td className="px-3 py-2 text-gray-900">{m.nombre}</td>
                      <td className="px-3 py-2 text-center">{m.creditos}</td>
                      <td className="px-3 py-2 text-center">{m.periodo}</td>
                      <td className="px-3 py-2">{m.lugar}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 text-sm">
                  <tr>
                    <td className="px-3 py-2" colSpan={2}>
                      Créditos en esta lista
                    </td>
                    <td className="px-3 py-2 text-center font-medium">{totalCreditos}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg bg-gray-50 p-3">
                <dt className="text-gray-500">Créditos mínimos del programa</dt>
                <dd className="text-lg font-semibold text-gray-900">{P.creditosMinimos}</dd>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <dt className="text-gray-500">Fecha límite para créditos y examen de grado</dt>
                <dd className="text-lg font-semibold text-gray-900">{P.fechaLimite}</dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={() => generar(false)}
              disabled={generando}
              className="mt-4 flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {generando ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />} Vista previa del SIP-08
            </button>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                <FileCheck2 size={16} /> Tu asesor lo registró el {fechaCorta(recibido.fecha)}
              </p>
              <button
                type="button"
                onClick={() => generar(true)}
                disabled={generando}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
              >
                <Download size={16} /> Descargar PDF para firmar
              </button>
              <div className="mt-5 border-t border-gray-100 pt-4">
                <p className="mb-2 text-sm font-medium text-gray-900">Sube tu programa firmado</p>
                <SubirFirmado clave={f.clave} habilitado destino={f.destino} />
              </div>
              <a
                href={`mailto:${correo}?subject=${asunto}`}
                className="mt-4 flex items-center gap-1.5 text-xs text-gray-600 hover:text-primary"
              >
                <Mail size={13} /> ¿Algo no es correcto? Escribe a {correo}
              </a>
              <FirmasOtros firmas={f.firmas} recibe={f.destino} />
            </section>
          </aside>
        </div>
      )}

      {pdf && (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <p className="border-b border-gray-100 px-5 py-3 text-sm font-medium text-gray-900">Vista previa — {f.codigo} (sin firmas)</p>
          <iframe src={pdf} title={`Vista previa ${f.codigo}`} className="h-[80vh] w-full" />
        </section>
      )}

      {/* Solo cascarón */}
      <div className="border-t border-dashed border-gray-300 pt-4">
        <p className="text-xs text-gray-500">Vista de prueba (solo cascarón) — simula lo que hacen tu asesor y tú:</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {!recibido && (
            <button
              type="button"
              onClick={() => recibir(f.clave, { nombre: `${f.codigo}_programa.pdf`, bytes: 210_000, fecha: new Date().toISOString() })}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
            >
              <Wand2 size={12} /> Simular que tu asesor ya lo preparó
            </button>
          )}
          {recibido && !firmado && (
            <button
              type="button"
              onClick={() =>
                subirFirmado(f.clave, { nombre: `${f.codigo}_firmado_${String(registro.apellidoPaterno ?? "aspirante")}.pdf`, bytes: 356_000, fecha: new Date().toISOString() })
              }
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
            >
              <Wand2 size={12} /> Simular que ya lo firmé y lo subí
            </button>
          )}
          {recibido && (
            <button
              type="button"
              onClick={() => {
                subirFirmado(f.clave, null);
                recibir(f.clave, null);
                setPdf(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
            >
              <RotateCcw size={12} /> Reiniciar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
