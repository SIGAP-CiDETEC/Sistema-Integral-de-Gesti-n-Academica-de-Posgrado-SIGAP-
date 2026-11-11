"use client";

import { SIMULACION } from "@/lib/api";
import Link from "next/link";
import { ArrowRight, BellRing, CalendarDays, CheckCircle2, Globe, RotateCcw, Wand2 } from "lucide-react";
import { useContenido } from "@/lib/contenido";
import type { IdConvocatoria } from "@/lib/config";
import { fechaResultados, useConvocatorias } from "@/lib/convocatoria";
import { simularCambioPosgrado, useEstadoAdmision, useSesionColegio } from "@/lib/posgrado/revision";
import { useExpediente } from "./ExpedienteProvider";
import { useAspiranteActivo } from "@/lib/aspirante-activo";
import { DICTAMEN_FINAL, TEXTO_DICTAMEN_FINAL } from "@/lib/reporte-aspirantes";

const ID = "ASP-2026-001";
const fechaLarga = (iso?: string) =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }) : "";

/**
 * 6 · Dictamen final (solo lo ve el aspirante): dónde y cuándo se publican los resultados del proceso de admisión
 * y, una vez publicados, su resultado. El dictamen SIP-04 se llena después, en Inscripción.
 */
export function PublicacionResultados() {
  const { registro } = useExpediente();
  const v = useEstadoAdmision();
  const id = useAspiranteActivo();
  const { calendarioDe } = useContenido();
  const conv = (String(registro.semestre ?? "A").charAt(0) === "B" ? "B" : "A") as IdConvocatoria;
  const calendario = calendarioDe(conv);
  const { config } = useConvocatorias();
  const fechaPub = fechaResultados(config, conv);
  const sesion = useSesionColegio();
  const admitido = !v.concluido && (v.resolucion === "Aceptado" || v.resolucion === "Con reservas");
  const enComision = v.etapa === "dictamen" && !v.resolucion;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="flex items-center gap-2 font-semibold text-gray-900">
          <Globe size={17} className="text-primary" /> ¿Dónde se publican los resultados?
        </h2>
        <ul className="mt-3 space-y-2.5 text-sm text-gray-700">
          <li className="flex gap-2">
            <Globe size={16} className="mt-0.5 shrink-0 text-primary" />
            <span>Los resultados se publicarán en la página de CIDETEC: <a href="https://www.cidetec.ipn.mx/" target="_blank" rel="noopener noreferrer" className="break-all font-medium text-primary underline">https://www.cidetec.ipn.mx/</a></span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
            <span>
              <b>Aquí, en SIGAP</b> (6 · Dictamen final). El Departamento de Posgrado publica la resolución del Colegio de Profesores y tu resultado aparece en esta
              pantalla.
            </span>
          </li>
          <li className="flex gap-2">
            <BellRing size={16} className="mt-0.5 shrink-0 text-primary" />
            <span>Te avisamos por correo y en tus notificaciones en cuanto se publique.</span>
          </li>
          <li className="flex gap-2">
            <CalendarDays size={16} className="mt-0.5 shrink-0 text-primary" />
            <span>
              {fechaPub ? (
                <>
                  Se publican el <b>{fechaLarga(fechaPub)}</b>, según el calendario de tu convocatoria.
                </>
              ) : (
                "La fecha de publicación de resultados está en el calendario de tu convocatoria."
              )}
            </span>
          </li>
        </ul>
        {calendario && (
          <a
            href={calendario.imagen}
            target="_blank"
            rel="noreferrer"
            className="mt-4 block max-w-md overflow-hidden rounded-lg border border-gray-200"
            title="Ver el calendario completo"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- imagen que publica la Jefatura de Posgrado */}
            <img src={calendario.imagen} alt={`Calendario de la convocatoria ${conv}`} className="w-full" />
          </a>
        )}
      </section>

      {v.resolucion && <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900">Tu resultado</h2>
        {v.resolucion && <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-indigo-50"><tr><th className="p-3">ID Aspirante</th><th className="p-3">Resolución</th><th className="p-3">Dictamen final</th></tr></thead><tbody><tr className="border-b border-gray-200"><td className="p-3 font-mono">{id}</td><td className="p-3 font-medium">{DICTAMEN_FINAL[v.resolucion]}</td><td className="p-3">{TEXTO_DICTAMEN_FINAL[v.resolucion]}</td></tr></tbody></table></div>}
        {admitido ? (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-900">
            <p className="flex items-center gap-2 text-base font-semibold">
              <CheckCircle2 size={18} /> {v.resolucion === "Con reservas" ? "Condicionado al cumplimiento documental para proceder a su inscripción" : "Aceptado"}
            </p>
            <p className="mt-1.5">
              Resolución del Colegio de Profesores
              {sesion?.fecha ? ` en su sesión del ${fechaLarga(sesion.fecha)}${sesion.hora ? ` a las ${sesion.hora} h` : ""}${sesion.numero ? ` (acta ${sesion.numero})` : ""}` : ""}.
              {v.resolucion === "Con reservas" ? " Debes cumplir los requisitos documentales para proceder a tu inscripción." : " Con esto concluye tu proceso de admisión."}
            </p>
            <p className="mt-1.5">
              {v.resolucion === "Con reservas" ? <>El Departamento de Posgrado te contactará para dar seguimiento al cumplimiento documental. {v.motivoReservas && <>Motivo: {v.motivoReservas}</>}</> : <>Sigue tu <b>inscripción</b>: ahí llenas tu dictamen SIP-04 (con tu dedicación), tu SIP-01, SIP-05 y SIP-06, y subes tu fotografía. La Unidad de Tecnología Educativa y Campus Virtual te contactará para orientarte.</>}
            </p>
            <p className="mt-2">Contacto: {v.resolucion === "Con reservas" ? <><span>Departamento de Posgrado · </span><a className="break-all underline" href="mailto:cgomeza@ipn.mx">cgomeza@ipn.mx</a></> : <><span>Unidad de Tecnología Educativa y Campus Virtual · </span><a className="break-all underline" href="mailto:lsalazarr@ipn.mx">lsalazarr@ipn.mx</a></>}</p>
            <Link href={v.resolucion === "Con reservas" ? "/aspirante/documentos" : "/aspirante/inscripcion"} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-primary-hover">
              {v.resolucion === "Con reservas" ? "Revisar mis documentos" : "Ir a mi inscripción"} <ArrowRight size={15} />
            </Link>
          </div>
        ) : v.resolucion === "No aceptado" ? (
          <p className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800">{TEXTO_DICTAMEN_FINAL[v.resolucion]}</p>
        ) : null}
      </section>}

      {(enComision || admitido) && <SimularPublicacion admitido={admitido} />}
    </div>
  );
}

/** Solo cascarón: simula que Posgrado publica la resolución del Colegio. */
function SimularPublicacion({ admitido }: { admitido: boolean }) {
  const btn = "inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50";
  const publicar = (resolucion: "Aceptado" | "Con reservas" | "No aceptado") => {
    // Si Posgrado aún no registró el acta del Colegio en este navegador, se usa una de ejemplo
    try {
      const e = JSON.parse(localStorage.getItem("sigap-posgrado") ?? "{}");
      if (!e.acta?.registradaEl) {
        const d = new Date();
        const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        localStorage.setItem("sigap-posgrado", JSON.stringify({ ...e, acta: { numero: "04/2026", fecha, hora: "12:00", resoluciones: {}, registradaEl: d.toISOString() } }));
      }
    } catch {
      /* ignorar */
    }
    simularCambioPosgrado(
      ID,
      resolucion === "No aceptado"
        ? { resolucion, concluido: "No aceptado por el Colegio de Profesores" }
        : { resolucion, turnadoUteycv: new Date().toISOString() },
      {
        asunto: resolucion === "No aceptado" ? "Resultado de tu proceso de admisión" : "¡Fuiste admitido(a)!",
        mensaje:
          resolucion === "No aceptado"
            ? "Agradecemos tu interés en la Maestría en Tecnología de Cómputo. Te informamos que tu proceso de admisión en esta convocatoria ha concluido."
            : "Ya se publicó tu resultado en SIGAP (6 · Dictamen final). Continúa con tu inscripción.",
      },
    );
  };
  if (!SIMULACION) return null;
  return (
    <div className="border-t border-dashed border-gray-300 pt-4">
      <p className="text-xs text-gray-500">Vista de prueba (solo cascarón) — simula que Posgrado publica la resolución del Colegio:</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {admitido ? (
          <button type="button" className={btn} onClick={() => simularCambioPosgrado(ID, { resolucion: undefined, turnadoUteycv: undefined })}>
            <RotateCcw size={12} /> Quitar el resultado publicado
          </button>
        ) : (
          <>
            <button type="button" className={btn} onClick={() => publicar("Aceptado")}>
              <Wand2 size={12} /> Publicar: Aceptado
            </button>
            <button type="button" className={btn} onClick={() => publicar("Con reservas")}>
              <Wand2 size={12} /> Publicar: Con reservas
            </button>
            <button type="button" className={btn} onClick={() => publicar("No aceptado")}>
              <Wand2 size={12} /> Publicar: No aceptado
            </button>
          </>
        )}
      </div>
    </div>
  );
}
