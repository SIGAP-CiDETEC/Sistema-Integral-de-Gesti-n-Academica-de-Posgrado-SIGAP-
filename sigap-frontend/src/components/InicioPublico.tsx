"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, LogIn, Lock } from "lucide-react";
import { Logos } from "@/components/Logos";
import { PERIODO_ESCOLAR, convocatoriaActual } from "@/lib/config";
import { useContenido } from "@/lib/contenido";
import { useConvocatorias } from "@/lib/convocatoria";

/**
 * Página pública de inicio (sin sesión). Las convocatorias A y B las configura el Administrador (RF-81).
 * - Muestra información para aspirantes (RF-08).
 * - Cada convocatoria abierta habilita su registro (precondición CU-ADM-01).
 * - Quien ya tiene cuenta entra por /login.
 *
 * Para ver el estado "cerrada" en el cascarón: /?convocatoria=cerrada
 */
export function InicioPublico({ forzarCerrada }: { forzarCerrada: boolean }) {
  const { lista } = useConvocatorias();
  const { calendarioDe, inicioAspirante } = useContenido();
  const convocatorias = lista.map((c) => ({ ...c, activa: forzarCerrada ? false : c.activa }));

  return (
    <div className="min-h-screen">
      {/* Barra superior */}
      <header className="bg-navy-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <Logos size={44} onDark />
            <div className="hidden sm:block">
              <p className="font-semibold leading-tight">SIGAP</p>
              <p className="text-[11px] text-white/60">CIDETEC · IPN</p>
            </div>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-navy-900 hover:bg-gray-100"
          >
            <LogIn size={16} /> Iniciar sesión
          </Link>
        </div>
      </header>

      {/* Encabezado */}
      <section className="bg-navy-900 pb-16 pt-10 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium tracking-wide">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            SIGAP · PERIODO ESCOLAR {PERIODO_ESCOLAR}
          </span>
          <h1 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
            Sistema Integral de Gestión Académica de Posgrado
          </h1>
          <p className="mt-3 max-w-2xl text-white/75">
            Centro de Innovación y Desarrollo Tecnológico en Cómputo — Instituto Politécnico Nacional.
            Consulta la convocatoria, realiza tu registro de admisión o accede a tu cuenta.
          </p>
        </div>
      </section>

      <main className="mx-auto -mt-10 max-w-6xl space-y-6 px-4 pb-16 sm:px-6">
        {/* Convocatorias A (enero–junio) y B (agosto–diciembre) */}
        <section id="convocatoria" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Convocatorias de admisión</h2>
              <p className="mt-1 text-sm text-gray-500">{convocatoriaActual.programas}</p>
            </div>
            <p className="text-xs text-gray-500">Hay dos ingresos al año: A (enero – junio) y B (agosto – diciembre).</p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {convocatorias.map((conv) => (
              <article
                key={conv.id}
                className={`flex min-w-0 flex-col rounded-xl border p-5 ${conv.activa ? "border-primary/40 bg-indigo-50/40" : "border-gray-200 bg-surface"}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${conv.activa ? "bg-primary text-white" : "bg-gray-200 text-gray-600"}`}
                    >
                      {conv.id}
                    </span>
                    <h3 className="font-semibold text-gray-900">{conv.nombre}</h3>
                  </span>
                  {conv.activa ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Abierta</span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">Cerrada</span>
                  )}
                </div>

                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Periodo de ingreso</dt>
                    <dd className="mt-0.5 font-medium text-gray-900">{conv.periodo}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Registro</dt>
                    <dd className="mt-0.5 font-medium text-guinda">
                      {conv.inicio} — {conv.cierre}
                    </dd>
                  </div>
                </dl>

                <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <CalendarDays size={14} /> Fechas clave
                </p>
                <dl className="mt-1 divide-y divide-gray-200 text-sm">
                  {conv.fechasClave.map((f) => (
                    <div key={f.etiqueta} className="flex justify-between py-1.5">
                      <dt className="text-gray-600">{f.etiqueta}</dt>
                      <dd className="font-medium text-gray-900">{f.fecha}</dd>
                    </div>
                  ))}
                </dl>

                {calendarioDe(conv.id) && (
                  <a
                    href={calendarioDe(conv.id)!.imagen}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 block overflow-hidden rounded-lg border border-gray-200 bg-white"
                    title="Ver el calendario completo"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- imagen que publica la Jefatura de Posgrado */}
                    <img src={calendarioDe(conv.id)!.imagen} alt={`Calendario del proceso de admisión ${conv.nombre}`} className="w-full" />
                  </a>
                )}

                <div className="mt-auto pt-5">
                  {conv.activa ? (
                    <Link
                      href={`/registro?convocatoria=${conv.id}`}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
                    >
                      Registrarme a la convocatoria {conv.id} <ArrowRight size={16} />
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-gray-200 px-4 py-2.5 text-sm font-medium text-gray-500"
                    >
                      <Lock size={15} /> Registro no disponible
                    </button>
                  )}
                  <p className="mt-2 text-center text-xs text-gray-500">
                    {conv.activa ? "Al terminar recibirás tu ID temporal (ej. ASP-2026-001)." : `El registro se abre el ${conv.inicio}.`}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="text-sm font-semibold text-gray-900">Requisitos (ambas convocatorias)</p>
            <ul className="mt-2 grid gap-1.5 text-sm text-gray-700 sm:grid-cols-2">
              {convocatoriaActual.requisitos.map((r) => (
                <li key={r} className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Recursos para aspirantes (RF-08) */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Información para aspirantes
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inicioAspirante.tarjetas.map((r) => (
              <article
                key={r.id}
                className="flex flex-col rounded-xl border border-gray-200 bg-white p-5"
              >
                <h3 className="font-semibold text-gray-900">{r.titulo}</h3>
                <p className="mt-1.5 flex-1 text-sm text-gray-600">{r.texto}</p>
                <a
                  href={r.href}
                  className="mt-4 self-start rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-primary hover:bg-indigo-100"
                >
                  {r.accion}
                </a>
              </article>
            ))}
          </div>
        </section>

        {/* Ya tengo cuenta */}
        <section className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-navy-900 p-6 text-white sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold">¿Ya tienes cuenta?</h2>
            <p className="mt-1 text-sm text-white/75">
              Aspirantes con su ID temporal, alumnos con su número de registro y personal del CIDETEC.
            </p>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-navy-900 hover:bg-gray-100"
          >
            <LogIn size={16} /> Iniciar sesión
          </Link>
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white py-6 text-center text-xs text-gray-500">
        <p className="font-medium text-gray-700">
          Centro de Innovación y Desarrollo Tecnológico en Cómputo · IPN
        </p>
        <p className="mt-1">Av. Juan de Dios Bátiz s/n, Nueva Industrial Vallejo, Gustavo A. Madero, CDMX</p>
        <p className="mt-1">
          Soporte SIGAP:{" "}
          <a href="mailto:posgrado.cidetec@ipn.mx" className="text-primary">
            posgrado.cidetec@ipn.mx
          </a>
        </p>
      </footer>
    </div>
  );
}
