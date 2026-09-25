"use client";

import Link from "next/link";
import { use, useState } from "react";
import { CalendarClock, CheckCircle2, Circle, FileText, History, Mail, Send, ShieldAlert, Wand2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Aviso, EtiquetaBandeja, EtiquetaDoc, Migas, Tarjeta, botonPeligro, botonPrimario, botonSecundario, inputBase } from "@/components/posgrado/ui";
import { ETAPAS } from "@/lib/admision";
import { MODALIDADES } from "@/lib/evaluacion";
import {
  bandejaDe,
  enDias,
  estadoUteycv,
  expedienteCompleto,
  fechaCorta,
  fechaHora,
  nombreProfesor,
  resultadoFinal,
  totalPuntaje,
} from "@/lib/posgrado/datos";

const FORMATOS = [
  { id: "sip-02", t: "SIP-02 · Currículum" },
  { id: "sip-05", t: "SIP-05 · Carta protesta" },
  { id: "sip-06", t: "SIP-06 · Carta compromiso" },
  { id: "mtc-ec", t: "MTC-EC · Acta de entrevista" },
];

/** Solo el inglés y el título pueden tener prórroga (el resto se entrega completo). */
const CON_PRORROGA = ["ingles", "titulo"];

/** Revisión de expediente (RF-05, RF-06, RF-52, RF-53, RN-09, RN-11). */
export default function RevisionExpediente({ params }: PageProps<"/posgrado/aspirantes/[id]">) {
  const { id } = use(params);
  const { porId, cargado, marcarDoc, actualizar, bitacora, enviarAviso } = usePosgrado();
  const [sel, setSel] = useState<string | null>(null);
  const [obs, setObs] = useState("");
  const [errorObs, setErrorObs] = useState(false);
  const [limite, setLimite] = useState(enDias(30));
  if (!cargado) return null;
  const a = porId(id);
  if (!a)
    return (
      <p className="text-sm text-gray-600">
        No existe el aspirante {id}.{" "}
        <Link href="/posgrado/aspirantes" className="text-primary underline">
          Volver a la bandeja
        </Link>
      </p>
    );

  const b = bandejaDe(a);
  const editable = a.etapa === "documentos" && !a.concluido;
  // Los documentos (p. ej. uno con prórroga) se pueden revisar mientras el aspirante siga en Posgrado
  const editableDoc = !a.concluido && ["documentos", "entrevista", "evaluacion", "dictamen"].includes(a.etapa);
  const doc = a.documentos.find((d) => d.id === (sel ?? a.documentos.find((x) => x.estado !== "falta")?.id ?? a.documentos[0]?.id));
  const conProrroga = a.documentos.filter((d) => d.estado === "prorroga");
  const observados = a.documentos.filter((d) => d.estado === "observado");
  const completo = expedienteCompleto(a);
  const idxEtapa = ETAPAS.findIndex((e) => e.id === a.etapa);
  const res = resultadoFinal(a.evaluacion);
  const bitacoraAsp = bitacora.filter((x) => x.aspirante === a.id);

  const decidir = (estado: "aprobado" | "observado") => {
    if (!doc) return;
    if (estado === "observado" && !obs.trim()) return setErrorObs(true);
    marcarDoc(a.id, doc.id, estado, estado === "observado" ? obs.trim() : undefined);
    setObs("");
    setErrorObs(false);
  };

  return (
    <>
      <Migas items={[{ t: "Aspirantes", href: "/posgrado/aspirantes" }, { t: a.id }]} />
      <PageHeader titulo="Revisión de expediente" subtitulo={`${a.nombre} · ${a.id} · Maestría en Tecnología de Cómputo`} />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <EtiquetaBandeja b={b} />
        {a.concluido && <span className="text-sm text-red-700">{a.concluido}</span>}
        <ol className="flex flex-wrap gap-1.5 text-xs">
          {ETAPAS.map((e, i) => (
            <li
              key={e.id}
              className={`rounded-full px-2.5 py-0.5 ${
                i < idxEtapa ? "bg-emerald-50 text-emerald-700" : i === idxEtapa ? "bg-guinda text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              {i + 1}. {e.label}
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {a.etapa === "registro" ? (
            <Aviso tono="info" titulo="Registro incompleto">
              El aspirante aún no envía sus documentos. Puedes recordarle los requisitos desde Comunicados.
            </Aviso>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <Tarjeta titulo="Archivos del expediente">
                <ul className="divide-y divide-gray-100 text-sm">
                  {a.documentos.map((d) => (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSel(d.id);
                          setErrorObs(false);
                        }}
                        className={`flex w-full items-center justify-between gap-2 px-2 py-2.5 text-left ${
                          doc?.id === d.id ? "rounded-lg bg-indigo-50/70" : "hover:bg-gray-50"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block text-gray-900">
                            {d.nombre} {d.opcional && <span className="text-xs text-gray-400">(opcional)</span>}
                          </span>
                          {d.observacion && d.estado !== "aprobado" && (
                            <span className={`block text-xs ${d.estado === "observado" ? "text-orange-700" : "text-gray-500"}`}>{d.observacion}</span>
                          )}
                        </span>
                        <EtiquetaDoc e={d.estado} hasta={d.prorrogaHasta} />
                      </button>
                    </li>
                  ))}
                </ul>
                {a.enVivo && a.documentos.every((d) => d.estado === "falta") && (
                  <p className="mt-3 text-xs text-gray-500">
                    Este aspirante es el de tu sesión de aspirante: sube sus documentos en Aspirante → 2. Documentos y aquí aparecerán.
                  </p>
                )}
              </Tarjeta>

              <Tarjeta titulo="Visor y decisión">
                {doc ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs text-primary">
                      <FileText size={12} /> {doc.archivo ?? doc.nombre}
                    </span>
                    <div className="mt-3 flex h-40 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-400">
                      {doc.archivo ? "Vista previa del documento PDF" : "Aún no hay archivo"}
                    </div>
                    <div className="mt-2">
                      <EtiquetaDoc e={doc.estado} hasta={doc.prorrogaHasta} />
                    </div>

                    {doc.id === "ingles" && (
                      <div className="mt-3">
                        <Aviso tono="info" titulo="Control obligatorio (RN-09)">
                          Constancia de CELEX o CENLEX: se aprueba directo. Cualquier otra requiere aval de la DFLE, que tramita UTEyCV. Si aún no la tiene,
                          dale prórroga para que continúe su proceso de admisión.
                        </Aviso>
                      </div>
                    )}

                    {editableDoc && doc.estado !== "aprobado" && (
                      <>
                        <label htmlFor="obs" className="mt-4 block text-sm font-medium text-gray-900">
                          Observaciones {errorObs && <span className="text-xs text-red-600">— obligatorias para observar</span>}
                        </label>
                        <textarea
                          id="obs"
                          rows={2}
                          value={obs}
                          onChange={(e) => {
                            setObs(e.target.value);
                            setErrorObs(false);
                          }}
                          placeholder={doc.id === "ingles" ? "Ej. La constancia no es de CELEX/CENLEX" : "Ej. El reverso no es legible"}
                          className={`${inputBase} mt-1 ${errorObs ? "border-red-400" : ""}`}
                        />
                        {doc.archivo && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {doc.id === "ingles" && doc.estado === "aval" ? (
                              <button type="button" className={botonSecundario} onClick={() => marcarDoc(a.id, doc.id, "aprobado", "Aval DFLE registrado por UTEyCV")}>
                                <Wand2 size={15} /> Simular: UTEyCV registró el aval DFLE
                              </button>
                            ) : (
                              <button type="button" className={botonPrimario} onClick={() => decidir("aprobado")}>
                                <CheckCircle2 size={15} /> {doc.id === "ingles" ? "Aprobar: es de CELEX/CENLEX" : "Aprobar"}
                              </button>
                            )}
                            {doc.id === "ingles" && doc.estado !== "aval" && (
                              <button type="button" className={botonSecundario} onClick={() => marcarDoc(a.id, doc.id, "aval", obs.trim() || undefined)}>
                                <Send size={15} /> Turnar a UTEyCV (aval DFLE)
                              </button>
                            )}
                            <button type="button" className={botonPeligro} onClick={() => decidir("observado")}>
                              <XCircle size={15} /> Observar
                            </button>
                          </div>
                        )}

                        {CON_PRORROGA.includes(doc.id) && (
                        <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50/60 p-3">
                          <p className="flex items-center gap-1.5 text-sm font-medium text-sky-900">
                            <CalendarClock size={15} /> {doc.estado === "prorroga" ? "Cambiar prórroga" : "Dar prórroga"}
                          </p>
                          <p className="mt-0.5 text-xs text-sky-900/80">El aspirante sigue su proceso y entrega el documento antes de la fecha límite.</p>
                          <div className="mt-2 flex flex-wrap items-end gap-2">
                            <label className="text-xs text-gray-700">
                              Fecha límite
                              <input type="date" value={limite} min={enDias(1)} onChange={(e) => setLimite(e.target.value)} className={`${inputBase} mt-0.5 py-1.5`} />
                            </label>
                            <button
                              type="button"
                              className={botonSecundario}
                              disabled={!limite}
                              onClick={() => {
                                marcarDoc(a.id, doc.id, "prorroga", obs.trim() || undefined, limite);
                                setObs("");
                              }}
                            >
                              Dar prórroga
                            </button>
                          </div>
                        </div>
                        )}
                        {doc.estado === "prorroga" && !a.enVivo && (
                          <button type="button" className="mt-3 inline-flex items-center gap-1 text-xs text-gray-500 underline" onClick={() => marcarDoc(a.id, doc.id, "pendiente", "Entregado dentro de la prórroga")}>
                            <Wand2 size={12} /> Solo cascarón: simular que ya lo entregó
                          </button>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Selecciona un documento.</p>
                )}
              </Tarjeta>
            </div>
          )}

          {editable && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                className={botonSecundario}
                disabled={!observados.length}
                onClick={() => {
                  actualizar(a.id, {}, `Devolvió el expediente con ${observados.length} observación(es) y notificó al aspirante`);
                  // RF-07: aviso al aspirante con cada observación
                  enviarAviso(
                    [a.id],
                    "ambos",
                    "Tienes observaciones en tus documentos",
                    `Estimado(a) ${a.nombre.split(" ")[0]}:\n\nRevisamos tu expediente y hay documentos que debes corregir:\n${observados
                      .map((d) => `• ${d.nombre}: ${d.observacion ?? "revísalo"}`)
                      .join("\n")}\n\nReemplázalos en SIGAP (fase 2 · Documentos).\n\nAtentamente,\nDepartamento de Posgrado · CIDETEC`,
                  );
                }}
              >
                <Mail size={15} /> Devolver con observaciones ({observados.length})
              </button>
              <div className="flex items-center gap-3">
                {!completo && <span className="text-xs text-gray-500">Aprueba o da prórroga a los documentos obligatorios para continuar.</span>}
                {completo && conProrroga.length > 0 && (
                  <span className="text-xs text-sky-800">Continúa con {conProrroga.length} documento(s) en prórroga.</span>
                )}
                <button
                  type="button"
                  className={botonPrimario}
                  disabled={!completo}
                  onClick={() => actualizar(a.id, { etapa: "entrevista" }, "Aprobó el expediente; pasa a entrevista colegiada")}
                >
                  <CheckCircle2 size={15} /> Aprobar expediente
                </button>
              </div>
            </div>
          )}

          {!editable && a.etapa !== "registro" && a.etapa !== "documentos" && (
            <Aviso tono="exito" titulo="Expediente aprobado">
              Los documentos ya fueron validados; el expediente continúa en la etapa {ETAPAS[idxEtapa].label.toLowerCase()}.
            </Aviso>
          )}

          <Tarjeta titulo={<span className="flex items-center gap-2"><History size={16} className="text-gray-400" /> Bitácora del aspirante</span>}>
            {bitacoraAsp.length ? (
              <ul className="space-y-2 text-sm">
                {bitacoraAsp.map((x, i) => (
                  <li key={i} className="flex flex-wrap gap-x-3">
                    <span className="text-xs text-gray-400">{fechaHora(x.fecha)}</span>
                    <span className="text-xs font-medium text-gray-600">{x.usuario}</span>
                    <span className="text-gray-800">{x.accion}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Sin movimientos registrados en esta sesión.</p>
            )}
          </Tarjeta>
        </div>

        <aside className="space-y-6">
          <Tarjeta titulo="Datos del registro">
            <dl className="space-y-2.5 text-sm">
              {[
                ["CURP", a.curp],
                ["Correo", a.correo],
                ["Teléfono", a.telefono],
                ["Procedencia", a.procedencia],
                ["Promedio", a.promedio],
                ["Registro", fechaCorta(a.registradoEl)],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[96px_1fr] gap-2">
                  <dt className="text-gray-500">{k}</dt>
                  <dd className="break-words text-gray-900">{v}</dd>
                </div>
              ))}
            </dl>
          </Tarjeta>

          <Tarjeta titulo="Formatos firmados recibidos">
            <ul className="space-y-2 text-sm">
              {FORMATOS.map((f) => (
                <li key={f.id} className={`flex items-center gap-2 ${a.formatos[f.id] ? "text-emerald-700" : "text-gray-500"}`}>
                  {a.formatos[f.id] ? <CheckCircle2 size={15} /> : <Circle size={15} />} {f.t}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-gray-400">SIP-05 y SIP-06 los recibe UTEyCV; aquí solo se consultan.</p>
          </Tarjeta>

          <Tarjeta titulo="Seguimiento">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Entrevista</dt>
                <dd className="text-gray-900">
                  {a.entrevista ? (
                    <>
                      {fechaCorta(a.entrevista.fecha)} · {a.entrevista.hora} h
                      <span className="block text-xs text-gray-500">{a.entrevista.sinodo.map(nombreProfesor).join(", ")}</span>
                    </>
                  ) : (
                    "Sin programar"
                  )}
                  {a.dictamen && (
                    <span className="block text-xs">
                      Dictamen: <b>{a.dictamen.resolucion}</b> · {totalPuntaje(a.dictamen.puntajes)}/100
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Evaluación</dt>
                <dd className="text-gray-900">
                  {a.evaluacion.modalidad ? MODALIDADES[a.evaluacion.modalidad].titulo : "Sin elegir"}
                  {res && <span className="block text-xs">Resultado: {res.calificacion} · {res.acreditado ? "acreditado" : "no acreditado"}</span>}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Resolución del Colegio</dt>
                <dd className="text-gray-900">{a.resolucion ?? "Pendiente"}</dd>
              </div>
              {a.etapa === "matricula" && (
                <div>
                  <dt className="text-gray-500">Control Escolar (UTEyCV)</dt>
                  <dd className="text-gray-900">
                    {estadoUteycv(a)}
                    {a.uteycv?.sicep && a.uteycv.formalizadoEl && <span className="block font-mono text-xs">Boleta {a.uteycv.sicep}</span>}
                  </dd>
                </div>
              )}
            </dl>
            {(a.etapa === "entrevista" || a.etapa === "evaluacion") && !a.concluido && (
              <Link
                href={a.etapa === "entrevista" ? `/posgrado/entrevistas/${a.id}` : "/posgrado/evaluacion"}
                className={`${botonSecundario} mt-4 w-full`}
              >
                Ir a {a.etapa === "entrevista" ? "entrevista" : "evaluación"}
              </Link>
            )}
          </Tarjeta>

          {a.concluido && (
            <Aviso tono="error" titulo="Proceso concluido">
              <span className="flex items-start gap-1.5">
                <ShieldAlert size={14} className="mt-0.5 shrink-0" /> {a.concluido}. La decisión queda registrada en la bitácora.
              </span>
            </Aviso>
          )}
        </aside>
      </div>
    </>
  );
}
