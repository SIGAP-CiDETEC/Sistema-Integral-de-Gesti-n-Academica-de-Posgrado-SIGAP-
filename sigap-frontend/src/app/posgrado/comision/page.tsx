"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Download, FileText, Paperclip, Send } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Aviso, Etiqueta, Tarjeta, botonPrimario, botonSecundario, inputBase } from "@/components/posgrado/ui";
import { convocatoriaActual } from "@/lib/config";
import { MODALIDADES } from "@/lib/evaluacion";
import { fechaCorta, prorrogasDe, resultadoFinal, totalPuntaje, type AspiranteP, type ResolucionColegio } from "@/lib/posgrado/datos";

const TONO: Record<ResolucionColegio, string> = {
  Aceptado: "bg-emerald-50 text-emerald-700",
  Condicionado: "bg-amber-50 text-amber-800",
  "No aceptado": "bg-red-50 text-red-700",
};

/** Comisión de Admisión y Colegio de Profesores (RF-57 a RF-60). */
export default function Comision() {
  const { aspirantes, cargado, acta, guardarActa, actualizar, enviarAviso } = usePosgrado();
  const [numero, setNumero] = useState(acta?.numero ?? "");
  const [fecha, setFecha] = useState(acta?.fecha ?? "");
  const [archivo, setArchivo] = useState<string | undefined>(acta?.archivo);
  const [res, setRes] = useState<Record<string, ResolucionColegio>>({});
  if (!cargado) return null;

  const enComision = aspirantes.filter((a) => a.etapa === "dictamen" && !a.concluido);
  const sinResolucion = enComision.filter((a) => !a.resolucion);
  const porTurnar = enComision.filter((a) => a.resolucion && a.resolucion !== "No aceptado");
  const turnados = aspirantes.filter((a) => a.etapa === "matricula");
  const informeListo = !!acta?.informeGeneradoEl;
  const resolucionDe = (a: AspiranteP) => res[a.id] ?? "Aceptado";
  const puedeRegistrar = informeListo && numero.trim() && fecha && archivo && sinResolucion.length > 0;

  const descargarInforme = () => {
    const filas = [
      ["ID temporal", "Aspirante", "Procedencia", "Promedio", "Entrevista", "Puntaje", "Modalidad", "Calificación", "Propuesta"],
      ...enComision.map((a) => [
        a.id,
        a.nombre,
        a.procedencia,
        a.promedio,
        a.dictamen?.resolucion ?? "",
        a.dictamen ? String(totalPuntaje(a.dictamen.puntajes)) : "",
        a.evaluacion.modalidad ? MODALIDADES[a.evaluacion.modalidad].titulo : "",
        String(resultadoFinal(a.evaluacion)?.calificacion ?? ""),
        a.resolucion ?? "Aceptado",
      ]),
    ];
    const csv = "﻿" + filas.map((f) => f.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const el = document.createElement("a");
    el.href = url;
    el.download = `Informe_Comision_Admision_${convocatoriaActual.nombre.split(" ").pop()}.csv`;
    el.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader titulo="Comisión y dictamen" subtitulo="Informe de la Comisión de Admisión y resolución del Colegio de Profesores" />

      <div className="space-y-6">
        <Tarjeta
          titulo={<span className="flex items-center gap-2"><FileText size={17} className="text-primary" /> 1. Informe de la Comisión de Admisión (RF-57)</span>}
          accion={
            <div className="flex gap-2">
              <button
                type="button"
                className={botonSecundario}
                disabled={!enComision.length}
                onClick={() => guardarActa({ ...(acta ?? { numero: "", fecha: "", resoluciones: {} }), informeGeneradoEl: new Date().toISOString() }, `Generó el informe de la Comisión de Admisión (${enComision.length} aspirantes)`)}
              >
                {informeListo ? "Regenerar" : "Generar informe"}
              </button>
              <button type="button" className={botonPrimario} disabled={!informeListo} onClick={descargarInforme}>
                <Download size={15} /> Descargar
              </button>
            </div>
          }
        >
          {informeListo && <p className="mb-3 text-xs text-emerald-700">Generado el {fechaCorta(acta!.informeGeneradoEl!)} · se descarga para abrirlo en Excel (CSV)</p>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="py-2 font-medium">Aspirante</th>
                  <th className="py-2 font-medium">Entrevista</th>
                  <th className="py-2 font-medium">Evaluación</th>
                  <th className="py-2 font-medium">Resolución del Colegio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {enComision.map((a) => {
                  const r = resultadoFinal(a.evaluacion);
                  return (
                    <tr key={a.id}>
                      <td className="py-2.5">
                        <p className="font-medium text-gray-900">{a.nombre}</p>
                        <p className="text-xs text-gray-500">
                          {a.procedencia} · promedio {a.promedio}
                        </p>
                      </td>
                      <td className="py-2.5 text-gray-700">
                        {a.dictamen ? `${a.dictamen.resolucion} · ${totalPuntaje(a.dictamen.puntajes)}/100` : "—"}
                      </td>
                      <td className="py-2.5 text-gray-700">
                        {a.evaluacion.modalidad === "examen" || a.evaluacion.examen ? "Examen" : "Propedéutico"} · {r?.calificacion ?? "—"}
                      </td>
                      <td className="py-2.5">
                        {a.resolucion ? (
                          <Etiqueta tono={TONO[a.resolucion]}>{a.resolucion}</Etiqueta>
                        ) : (
                          <select
                            aria-label={`Resolución de ${a.nombre}`}
                            value={resolucionDe(a)}
                            onChange={(e) => setRes({ ...res, [a.id]: e.target.value as ResolucionColegio })}
                            className={`${inputBase} max-w-[180px] py-1.5`}
                          >
                            <option>Aceptado</option>
                            <option>Condicionado</option>
                            <option>No aceptado</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!enComision.length && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-500">
                      No hay aspirantes con evaluación acreditada pendientes de comisión.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Tarjeta>

        <Tarjeta titulo="2. Acta del Colegio de Profesores (RF-59, RF-60)">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              <span className="font-medium text-gray-900">Número de acta</span>
              <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Ej. 04/2026" className={`${inputBase} mt-1`} />
            </label>
            <label className="text-sm">
              <span className="font-medium text-gray-900">Fecha de sesión</span>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={`${inputBase} mt-1`} />
            </label>
            <label className="text-sm">
              <span className="font-medium text-gray-900">Acta firmada (PDF)</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setArchivo(e.target.files?.[0]?.name)}
                className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-primary"
              />
              {archivo && (
                <span className="mt-1 flex items-center gap-1 text-xs text-gray-600">
                  <Paperclip size={12} /> {archivo}
                </span>
              )}
            </label>
          </div>
          {!informeListo && <p className="mt-3 text-xs text-amber-700">Genera primero el informe de la comisión.</p>}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <button type="button" className="text-xs text-gray-500 underline" onClick={() => setArchivo("acta_colegio_ejemplo.pdf")}>
              Solo cascarón: usar un acta de ejemplo
            </button>
            <button
              type="button"
              className={botonPrimario}
              disabled={!puedeRegistrar}
              onClick={() => {
                const resoluciones = Object.fromEntries(sinResolucion.map((a) => [a.id, resolucionDe(a)]));
                guardarActa(
                  { numero: numero.trim(), fecha, archivo, resoluciones: { ...(acta?.resoluciones ?? {}), ...resoluciones }, informeGeneradoEl: acta?.informeGeneradoEl },
                  `Registró el acta de Colegio ${numero.trim()} con ${sinResolucion.length} resolución(es)`,
                );
                sinResolucion.forEach((a) => {
                  const r = resolucionDe(a);
                  actualizar(a.id, { resolucion: r, ...(r === "No aceptado" ? { concluido: "No aceptado por el Colegio de Profesores" } : {}) }, `Resolución del Colegio (acta ${numero.trim()}): ${r}`);
                  const nom = a.nombre.split(" ")[0];
                  enviarAviso(
                    [a.id],
                    "ambos",
                    r === "No aceptado" ? "Resultado de tu proceso de admisión" : "¡Fuiste admitido(a)!",
                    r === "No aceptado"
                      ? `Estimado(a) ${nom}:\n\nAgradecemos tu interés en la Maestría en Tecnología de Cómputo. Te informamos que tu proceso de admisión en esta convocatoria ha concluido.\n\nAtentamente,\nDepartamento de Posgrado · CIDETEC`
                      : `Estimado(a) ${nom}:\n\nEl Colegio de Profesores resolvió tu admisión a la Maestría en Tecnología de Cómputo${r === "Condicionado" ? " (condicionada)" : ""}. Control Escolar (UTEyCV) te enviará tu dictamen SIP-04 y las instrucciones de inscripción.\n\nAtentamente,\nDepartamento de Posgrado · CIDETEC`,
                  );
                });
              }}
            >
              <CheckCircle2 size={15} /> Registrar resolución ({sinResolucion.length})
            </button>
          </div>
          {acta?.registradaEl && (
            <p className="mt-3 text-xs text-emerald-700">
              Acta {acta.numero} del {fechaCorta(acta.fecha)} registrada · {acta.archivo}
            </p>
          )}
        </Tarjeta>

        <Tarjeta titulo="3. Turnar a Control Escolar (UTEyCV)">
          <p className="text-sm text-gray-600">UTEyCV elabora el dictamen SIP-04, recaba firmas, lo publica al aspirante y formaliza su matrícula (SICEP).</p>
          <p className="mt-1 text-xs text-gray-500">Si tiene documentos en prórroga, se turna igual y UTEyCV verá la fecha límite.</p>
          {porTurnar.length ? (
            <ul className="mt-3 divide-y divide-gray-100 text-sm">
              {porTurnar.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span>
                    <span className="font-medium text-gray-900">{a.nombre}</span> <Etiqueta tono={TONO[a.resolucion!]}>{a.resolucion}</Etiqueta>{" "}
                    {prorrogasDe(a).map((d) => (
                      <Etiqueta key={d.id} tono="bg-sky-50 text-sky-800">
                        {d.nombre} en prórroga al {fechaCorta(d.prorrogaHasta!)}
                      </Etiqueta>
                    ))}
                  </span>
                  <button
                    type="button"
                    className={botonSecundario}
                    onClick={() => actualizar(a.id, { etapa: "matricula", turnadoUteycv: new Date().toISOString() }, "Turnó a UTEyCV para SIP-04 y matrícula")}
                  >
                    <Send size={14} /> Turnar
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-gray-500">No hay aspirantes con resolución pendientes de turnar.</p>
          )}
          {turnados.length > 0 && (
            <div className="mt-4">
              <Aviso tono="exito" titulo={`${turnados.length} aspirante(s) en UTEyCV`}>
                <ul className="mt-1 space-y-0.5">
                  {turnados.map((a) => (
                    <li key={a.id} className="flex items-center gap-1.5">
                      <ArrowRight size={12} /> {a.nombre} {a.turnadoUteycv && <span className="text-xs">· {fechaCorta(a.turnadoUteycv)}</span>}
                    </li>
                  ))}
                </ul>
              </Aviso>
            </div>
          )}
        </Tarjeta>
      </div>
    </>
  );
}
