"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CalendarClock, CheckCircle2, Download, FileText, Gavel, Paperclip, Send, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Aviso, Etiqueta, Regresar, Tarjeta, botonPrimario, botonSecundario, inputBase } from "@/components/posgrado/ui";
import { generarResultadosFinales } from "@/lib/pdf/resultados-finales";
import { descargarCsv } from "@/lib/csv";
import { convocatoriaActual } from "@/lib/config";
import { fechaResultados, guardarConvocatorias, hoyISO, useConvocatorias } from "@/lib/convocatoria";
import { fechaCorta, prorrogasDe, resultadoFinal, type AspiranteP, type ResolucionColegio } from "@/lib/posgrado/datos";
import { MODO_API } from "@/lib/api";
import { DICTAMEN_FINAL, TONO_DICTAMEN } from "@/lib/reporte-aspirantes";

const TONO: Record<ResolucionColegio, string> = {
  Aceptado: "bg-emerald-50 text-emerald-700",
  "Con reservas": "bg-amber-50 text-amber-800",
  "No aceptado": "bg-red-50 text-red-700",
};
const fechaLarga = (f: string) => (f ? new Date(`${f}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }) : "");

/**
 * Comisión y dictamen final (RF-57 a RF-60): informe de la Comisión de Admisión, resolución del Colegio de Profesores
 * y publicación de resultados. El dictamen de la entrevista colegiada tiene su propia sección (/posgrado/dictamen-entrevista).
 */
export default function Comision() {
  const { cargado } = usePosgrado();
  if (!cargado) return null;
  return (
    <>
      <Regresar href="/posgrado" t="Inicio" />
      <PageHeader titulo="Comisión y dictamen final" subtitulo="Informe de la Comisión de Admisión, resolución del Colegio de Profesores y publicación de resultados" />
      <Aviso tono="info" titulo="El dictamen de la entrevista colegiada está en su propia sección">
        Las actas MTC-EC y el dictamen de cada entrevista se consultan en{" "}
        <Link href="/posgrado/dictamen-entrevista" className="font-medium underline">
          Dictamen de entrevista colegiada
        </Link>
        .
      </Aviso>
      <div className="mt-5">
        <DictamenFinal />
      </div>
    </>
  );
}

/** Informe de la Comisión de Admisión, resolución del Colegio de Profesores y publicación de resultados. */
function DictamenFinal() {
  const { aspirantes, acta, guardarActa, actualizar, enviarAviso } = usePosgrado();
  const { config } = useConvocatorias();
  const [numero, setNumero] = useState(acta?.numero ?? "");
  const [fecha, setFecha] = useState(acta?.fecha ?? "");
  const [archivo, setArchivo] = useState<string | undefined>(acta?.archivo);
  const [res, setRes] = useState<Record<string, ResolucionColegio>>({});
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [fechaPub, setFechaPub] = useState<string | null>(null);

  const enComision = aspirantes.filter((a) => a.etapa === "dictamen" && !a.concluido && !a.resolucion);
  const registradas = acta?.resoluciones ?? {};
  const sinRegistrar = enComision.filter((a) => !registradas[a.id]);
  const porPublicar = enComision.filter((a) => registradas[a.id]);
  const publicados = aspirantes.filter((a) => !!a.resolucion).sort((x, y) => (y.turnadoUteycv ?? "").localeCompare(x.turnadoUteycv ?? ""));
  const informeListo = !!acta?.informeGeneradoEl;
  const resolucionDe = (a: AspiranteP): ResolucionColegio => registradas[a.id] ?? res[a.id] ?? "Aceptado";
  const motivoDe = (a: AspiranteP) => (motivos[a.id] ?? a.motivoReservas ?? "").trim();
  const puedeRegistrar = informeListo && numero.trim() && fecha && archivo && sinRegistrar.length > 0 && sinRegistrar.every((a) => resolucionDe(a) !== "Con reservas" || motivoDe(a));

  const idConv = "A" as const;
  const fechaConv = fechaResultados(config, idConv);
  const fechaVista = fechaPub ?? fechaConv;
  const llegoLaFecha = !!fechaConv && hoyISO() >= fechaConv;

  // Informe para el Colegio: solo el ID del aspirante y su dictamen final
  const descargarInforme = () =>
    descargarCsv(
      `Informe_Comision_Admision_${convocatoriaActual.nombre.split(" ").pop()}.csv`,
      ["ID del aspirante", "Dictamen final", "Con reservas", "Motivo de las reservas"],
      enComision.map((a) => [a.id, DICTAMEN_FINAL[resolucionDe(a)], resolucionDe(a) === "Con reservas" ? "Sí" : "No", resolucionDe(a) === "Con reservas" ? motivoDe(a) : ""]),
    );

  const registrar = () => {
    if (!puedeRegistrar) return;
    sinRegistrar.forEach((a) => actualizar(a.id, { motivoReservas: resolucionDe(a) === "Con reservas" ? motivoDe(a) : undefined }, "Registró el motivo de la resolución del Colegio"));
    const nuevas = Object.fromEntries(sinRegistrar.map((a) => [a.id, resolucionDe(a)]));
    guardarActa(
      {
        ...(acta ?? { resoluciones: {} }),
        numero: numero.trim(),
        fecha,
        archivo,
        resoluciones: { ...registradas, ...nuevas },
        resolucionRegistradaEl: new Date().toISOString(),
      },
      `Registró el acta de Colegio ${numero.trim()} con ${sinRegistrar.length} resolución(es); se publicarán a partir del ${fechaLarga(fechaConv)}`,
    );
  };

  const descargarResultados = async () => {
    const filas = Object.entries(registradas)
      .sort(([x], [y]) => x.localeCompare(y))
      .map(([id, resolucion]) => ({ id, resolucion }));
    const url = await generarResultadosFinales(convocatoriaActual.nombre.split(" ").pop()?.replace("-", "") ?? "", filas);
    const el = document.createElement("a");
    el.href = url;
    el.download = `Resultados_finales_admision_${convocatoriaActual.nombre.split(" ").pop()}.pdf`;
    el.click();
  };

  const publicar = () => {
    porPublicar.forEach((a) => {
      const r = registradas[a.id];
      // Admitido: el resultado se publica y pasa automáticamente a inscripción (UTEyCV)
      actualizar(
        a.id,
        r === "No aceptado" ? { resolucion: r, concluido: "No aceptado por el Colegio de Profesores" } : { resolucion: r, turnadoUteycv: new Date().toISOString() },
        `Publicó el resultado (acta ${acta?.numero}): ${r} · dictamen final ${DICTAMEN_FINAL[r]}${r === "No aceptado" ? "" : "; pasa a inscripción (UTEyCV)"}`,
      );
      const nom = a.nombre.split(" ")[0];
      enviarAviso(
        [a.id],
        "ambos",
        r === "No aceptado" ? "Resultado de tu proceso de admisión" : "¡Fuiste admitido(a)!",
        r === "No aceptado"
          ? `Estimado(a) ${nom}:\n\nAgradecemos tu interés en la Maestría en Tecnología de Cómputo. Te informamos que tu proceso de admisión en esta convocatoria ha concluido.\n\nAtentamente,\nDepartamento de Posgrado · CIDETEC`
          : `Estimado(a) ${nom}:\n\nEl Colegio de Profesores resolvió tu admisión a la Maestría en Tecnología de Cómputo${r === "Con reservas" ? " (con reservas)" : ""}. Con esto concluye tu proceso de admisión; consulta tu resultado en SIGAP (6 · Dictamen final) y continúa con tu inscripción, donde llenarás tu dictamen SIP-04.\n\nAtentamente,\nDepartamento de Posgrado · CIDETEC`,
      );
    });
    if (acta) guardarActa({ ...acta, publicadoEl: new Date().toISOString() }, `Publicó los resultados de admisión de ${porPublicar.length} aspirante(s)`);
  };

  const guardarFecha = () => {
    if (!fechaPub) return;
    guardarConvocatorias({ ...config, [idConv]: { ...config[idConv], resultados: fechaPub } });
    setFechaPub(null);
  };

  return (
    <div className="space-y-6">
      <Tarjeta
        titulo={<span className="flex items-center gap-2"><FileText size={17} className="text-primary" /> 1. Informe de la Comisión de Admisión</span>}
        accion={
          <div className="flex gap-2">
            <button
              type="button"
              className={botonSecundario}
              disabled={!enComision.length}
              onClick={() =>
                guardarActa(
                  { ...(acta ?? { numero: "", fecha: "", resoluciones: {} }), informeGeneradoEl: new Date().toISOString() },
                  `Generó el informe de la Comisión de Admisión (${enComision.length} aspirantes)`,
                )
              }
            >
              {informeListo ? "Regenerar" : "Generar informe"}
            </button>
            <button type="button" className={botonPrimario} disabled={!informeListo} onClick={descargarInforme}>
              <Download size={15} /> Descargar
            </button>
          </div>
        }
      >
        {informeListo && (
          <p className="mb-3 text-xs text-emerald-700">Generado el {fechaCorta(acta!.informeGeneradoEl!)} · CSV con el ID de cada aspirante y su dictamen final</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="py-2 font-medium">Aspirante</th>
                <th className="py-2 font-medium">Entrevista</th>
                <th className="py-2 font-medium">Evaluación</th>
                <th className="py-2 font-medium">Resolución del Colegio</th>
                <th className="py-2 font-medium">Dictamen final</th>
                <th className="py-2 font-medium">Con reservas</th>
                <th className="py-2 font-medium">Motivo de las reservas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {enComision.map((a) => {
                const r = resultadoFinal(a.evaluacion);
                const reg = registradas[a.id];
                return (
                  <tr key={a.id} data-comision={a.id}>
                    <td className="py-2.5">
                      <p className="font-medium text-gray-900">{a.nombre}</p>
                      <p className="font-mono text-xs text-gray-500">{a.id}</p>
                    </td>
                    <td className="py-2.5 text-gray-700">{a.dictamen ? a.dictamen.resolucion : "—"}</td>
                    <td className="py-2.5 text-gray-700">
                      {a.evaluacion.modalidad === "examen" || a.evaluacion.examen ? "Examen" : "Propedéutico"} · {r?.calificacion ?? "—"}
                    </td>
                    <td className="py-2.5">
                      {reg ? (
                        <span className="flex flex-wrap items-center gap-1.5">
                          <Etiqueta tono={TONO[reg]}>{reg}</Etiqueta>
                          <span className="text-xs text-gray-500">registrada · por publicar</span>
                        </span>
                      ) : (
                        <select
                          aria-label={`Resolución de ${a.nombre}`}
                          value={resolucionDe(a)}
                          onChange={(e) => setRes({ ...res, [a.id]: e.target.value as ResolucionColegio })}
                          className={`${inputBase} max-w-[180px] py-1.5`}
                        >
                          <option>Aceptado</option>
                          <option>Con reservas</option>
                          <option>No aceptado</option>
                        </select>
                      )}
                    </td>
                    <td className="py-2.5">
                      <Etiqueta tono={TONO_DICTAMEN[DICTAMEN_FINAL[resolucionDe(a)]]}>{DICTAMEN_FINAL[resolucionDe(a)]}</Etiqueta>
                    </td>
                    <td className="py-2.5 text-gray-700" data-con-reservas>{resolucionDe(a) === "Con reservas" ? "Sí" : "No"}</td>
                    <td className="py-2.5">
                      {resolucionDe(a) === "Con reservas" && (reg ? <span>{a.motivoReservas || "Sin motivo registrado"}</span> : <textarea aria-label={`Motivo de las reservas de ${a.nombre}`} required value={motivos[a.id] ?? a.motivoReservas ?? ""} onChange={(e) => setMotivos({ ...motivos, [a.id]: e.target.value })} placeholder="Indica el motivo (obligatorio)" className={inputBase} />)}
                    </td>
                  </tr>
                );
              })}
              {!enComision.length && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-500">
                    No hay aspirantes con evaluación acreditada pendientes de resultado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Tarjeta>

      <Tarjeta titulo={<span className="flex items-center gap-2"><Gavel size={16} className="text-primary" /> 2. Resolución de la Comisión de Admisión</span>}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
        <p className="mt-3 text-sm text-gray-600">
          Registrar la resolución <b>no la publica</b>: el aspirante la verá cuando Posgrado publique los resultados (paso 3).
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          {MODO_API ? <span /> : (
            <button type="button" className="text-xs text-gray-500 underline" onClick={() => setArchivo("acta_colegio_ejemplo.pdf")}>
              Solo cascarón: usar un acta de ejemplo
            </button>
          )}
          <button type="button" className={botonPrimario} disabled={!puedeRegistrar} onClick={registrar}>
            <CheckCircle2 size={15} /> Registrar resolución ({sinRegistrar.length})
          </button>
        </div>
        {acta?.resolucionRegistradaEl && (
          <p className="mt-3 text-xs text-emerald-700">
            Acta {acta.numero} del {fechaCorta(acta.fecha)} registrada · {acta.archivo}
          </p>
        )}
      </Tarjeta>

      <Tarjeta titulo={<span className="flex items-center gap-2"><Send size={16} className="text-primary" /> 3. Publicación de resultados</span>}>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="flex items-center gap-1.5 font-medium text-gray-900">
              <CalendarClock size={14} /> Fecha de publicación ({config[idConv].nombre})
            </span>
            <input type="date" aria-label="Fecha de publicación de resultados" value={fechaVista} onChange={(e) => setFechaPub(e.target.value)} className={`${inputBase} mt-1`} />
          </label>
          {fechaPub && fechaPub !== fechaConv && (
            <button type="button" className={botonSecundario} onClick={guardarFecha}>
              Guardar fecha
            </button>
          )}
          <p className="pb-2 text-xs text-gray-500">Es la fecha que marca la convocatoria; el aspirante la ve como fecha de publicación.</p>
        </div>
        <div className="mt-4 rounded-lg border border-gray-200 p-3 text-sm">
          {porPublicar.length ? (
            <>
              <p className="text-gray-800">
                {porPublicar.length} resultado(s) registrado(s) por publicar.{" "}
                {llegoLaFecha ? "Ya es la fecha de publicación." : `Se podrán publicar a partir del ${fechaLarga(fechaConv)}.`}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button type="button" className={botonPrimario} disabled={!llegoLaFecha} onClick={publicar}>
                  <Send size={15} /> Publicar resultados ({porPublicar.length})
                </button>
                {!llegoLaFecha && !MODO_API && (
                  <button
                    type="button"
                    onClick={publicar}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    <Wand2 size={12} /> Solo cascarón: publicar sin esperar la fecha
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="text-gray-500">No hay resultados registrados pendientes de publicar.</p>
          )}
        </div>
        {Object.keys(registradas).length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <button type="button" className={botonSecundario} onClick={descargarResultados}>
              <Download size={15} /> Resultados finales (PDF)
            </button>
            <span className="text-xs text-gray-500">Documento oficial con el ID de cada aspirante y su dictamen, para publicarlo.</span>
          </div>
        )}
        <p className="mt-3 text-sm text-gray-600">
          Al publicar, cada aspirante ve su resultado en SIGAP (6 · Dictamen final) y recibe un aviso por correo. Los admitidos pasan automáticamente a su
          inscripción con Control Escolar (UTEyCV).
        </p>
        {publicados.length > 0 && (
          <ul className="mt-3 divide-y divide-gray-100 text-sm">
            {publicados.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 py-2.5">
                <ArrowRight size={13} className="text-emerald-600" />
                <span className="font-medium text-gray-900">{a.nombre}</span>
                {a.resolucion && <Etiqueta tono={TONO[a.resolucion]}>{a.resolucion}</Etiqueta>}
                {prorrogasDe(a).map((d) => (
                  <Etiqueta key={d.id} tono="bg-sky-50 text-sky-800">
                    {d.nombre} en prórroga al {fechaCorta(d.prorrogaHasta!)}
                  </Etiqueta>
                ))}
                {a.turnadoUteycv && <span className="text-xs text-gray-500">· publicado el {fechaCorta(a.turnadoUteycv)}</span>}
              </li>
            ))}
          </ul>
        )}
        {!fechaConv && (
          <div className="mt-3">
            <Aviso tono="alerta" titulo="Define la fecha de publicación de resultados de la convocatoria." />
          </div>
        )}
      </Tarjeta>
    </div>
  );
}
