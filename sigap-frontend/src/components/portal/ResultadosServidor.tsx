"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, CheckCircle2, Clock, FileQuestion, Globe, Info, Loader2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Aviso } from "@/components/posgrado/ui";
import { api } from "@/lib/api";
import { mensajeDe } from "@/lib/avisos-ui";
import { nombreArea, type AreaEvalId, type ResolucionColegio } from "@/lib/posgrado/datos";
import { DICTAMEN_FINAL, TEXTO_DICTAMEN_FINAL } from "@/lib/reporte-aspirantes";

type Resultado = { acreditado: boolean; publicadoEl: string; areas: Record<string, { acreditado: boolean }> } | null;
type Yo = {
  nombre: string;
  idTemporal: string;
  resultados: { modalidad: "propedeutico" | "examen"; propedeutico: Resultado; examen: Resultado } | null;
  dictamen: { resolucion: ResolucionColegio; motivo: string; publicadoEl: string | null } | null;
};

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "long", year: "numeric" });

function usePortal() {
  const [yo, setYo] = useState<Yo | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<Yo>("/portal/yo")
      .then(setYo)
      .catch((e) => setError(mensajeDe(e)));
  }, []);
  return { yo, error };
}

function Cargando({ error }: { error: string }) {
  return error ? (
    <Aviso tono="error" titulo="No se pudo cargar tu información">
      {error}
    </Aviso>
  ) : (
    <p className="flex items-center gap-2 text-sm text-gray-500">
      <Loader2 size={15} className="animate-spin" /> Cargando…
    </p>
  );
}

/** 5 · Resultados (servidor real): lo que Posgrado publicó del curso propedéutico o del examen de admisión. */
export function ResultadosServidor() {
  const { yo, error } = usePortal();
  if (!yo) return <Cargando error={error} />;
  const r = yo.resultados;
  return (
    <>
      <PageHeader titulo="Resultados" subtitulo="Resultados de tu curso propedéutico o de tu examen de admisión" />
      {!r ? (
        <section className="rounded-xl border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-600">
          Primero elige cursos propedéuticos o examen en{" "}
          <Link href="/aspirante" className="font-medium text-primary underline">
            Elección de evaluación
          </Link>
          . Aquí aparecerán tus resultados cuando el Departamento de Posgrado los publique.
        </section>
      ) : r.modalidad === "propedeutico" ? (
        <Seccion icono={BookOpen} titulo="Resultados del curso propedéutico" publicacion="Se publican al terminar los cursos." resultado={r.propedeutico} />
      ) : (
        <Seccion icono={FileQuestion} titulo="Resultados del examen de admisión" publicacion="Se publican después del examen." resultado={r.examen} />
      )}
    </>
  );
}

function Seccion({ icono: Icono, titulo, publicacion, resultado }: { icono: typeof BookOpen; titulo: string; publicacion: string; resultado: Resultado }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold text-gray-900">
          <Icono size={18} className="text-primary" /> {titulo}
        </h2>
        {resultado ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs text-emerald-700">Publicado el {fecha(resultado.publicadoEl)}</span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
            <Clock size={12} /> Aún no se publican
          </span>
        )}
      </div>
      {!resultado ? (
        <p className="mt-2 text-sm text-gray-600">{publicacion} El Departamento de Posgrado te avisará cuando se publiquen.</p>
      ) : (
        <>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {Object.entries(resultado.areas).map(([id, a]) => (
              <li key={id} className={`rounded-lg border p-4 ${a.acreditado ? "border-emerald-200 bg-emerald-50/60" : "border-red-200 bg-red-50/60"}`}>
                <p className="text-sm text-gray-700">{nombreArea(id as AreaEvalId)}</p>
                <p className={`mt-1 flex items-center gap-1.5 font-semibold ${a.acreditado ? "text-emerald-700" : "text-red-700"}`}>
                  {a.acreditado ? <CheckCircle2 size={16} /> : <XCircle size={16} />} {a.acreditado ? "Acreditada" : "No acreditada"}
                </p>
              </li>
            ))}
          </ul>
          {resultado.acreditado ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} /> ¡Acreditaste tu evaluación! Tu resultado pasa a la Comisión de Admisión del Colegio de Profesores.
              </span>
              <Link href="/aspirante/dictamen" className="inline-flex items-center gap-1 font-medium underline">
                Dictamen final <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-gray-100 px-3 py-2.5 text-sm text-gray-700">
              <Info size={16} className="mt-0.5 shrink-0" />
              No acreditaste todas las áreas. El Departamento de Posgrado te informará cómo continúa tu proceso de admisión.
            </p>
          )}
        </>
      )}
    </section>
  );
}

/** 6 · Dictamen final (servidor real): el informe de la Comisión de Admisión cuando Posgrado publica la resolución. */
export function DictamenServidor() {
  const { yo, error } = usePortal();
  if (!yo) return <Cargando error={error} />;
  const d = yo.dictamen;
  const admitido = d?.resolucion === "Aceptado" || d?.resolucion === "Con reservas";
  return (
    <>
      <PageHeader titulo="Dictamen final" subtitulo="Resultado de tu proceso de admisión" />
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="flex items-center gap-2 font-semibold text-gray-900">
          <Globe size={17} className="text-primary" /> ¿Dónde se publican los resultados?
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-gray-700">
          <li>
            En la página de CIDETEC:{" "}
            <a href="https://www.cidetec.ipn.mx/" target="_blank" rel="noopener noreferrer" className="break-all font-medium text-primary underline">
              https://www.cidetec.ipn.mx/
            </a>
          </li>
          <li>
            <b>Aquí, en SIGAP</b>: cuando el Departamento de Posgrado publique la resolución del Colegio de Profesores, tu resultado aparecerá en esta pantalla.
          </li>
        </ul>
      </section>

      {!d ? (
        <section className="mt-6 flex items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-600">
          <Clock size={16} /> Tu resultado aún no se publica.
        </section>
      ) : (
        <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-gray-900">1. Informe de la Comisión de Admisión</h2>
          {d.publicadoEl && <p className="mt-0.5 text-xs text-gray-500">Publicado el {fecha(d.publicadoEl)}</p>}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-indigo-50 text-gray-700">
                <tr>
                  <th className="p-3 font-medium">ID Aspirante</th>
                  <th className="p-3 font-medium">Resolución</th>
                  <th className="p-3 font-medium">Dictamen final</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="p-3 font-mono">{yo.idTemporal}</td>
                  <td className="p-3 font-medium">{DICTAMEN_FINAL[d.resolucion]}</td>
                  <td className="p-3">{TEXTO_DICTAMEN_FINAL[d.resolucion]}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {admitido ? (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-900">
              {d.resolucion === "Con reservas" ? (
                <>
                  <p>Debes cumplir los requisitos documentales para proceder a tu inscripción. El Departamento de Posgrado te contactará para dar seguimiento.</p>
                  {d.motivo && <p className="mt-1.5">Motivo: {d.motivo}</p>}
                  <p className="mt-2">
                    Contacto: Departamento de Posgrado ·{" "}
                    <a className="break-all underline" href="mailto:cgomeza@ipn.mx">
                      cgomeza@ipn.mx
                    </a>
                  </p>
                </>
              ) : (
                <>
                  <p>Con esto concluye tu proceso de admisión. La Unidad de Tecnología Educativa y Campus Virtual te contactará para orientarte en tu inscripción.</p>
                  <p className="mt-2">
                    Contacto: Unidad de Tecnología Educativa y Campus Virtual ·{" "}
                    <a className="break-all underline" href="mailto:lsalazarr@ipn.mx">
                      lsalazarr@ipn.mx
                    </a>
                  </p>
                </>
              )}
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800">
              Agradecemos tu interés en la Maestría en Tecnología de Cómputo. Te invitamos a participar en los siguientes procesos de admisión.
            </p>
          )}
        </section>
      )}
    </>
  );
}
