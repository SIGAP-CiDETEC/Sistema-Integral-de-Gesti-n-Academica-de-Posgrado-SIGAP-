"use client";

import { Fragment, useState } from "react";
import { CheckCircle2, ClipboardCheck, RotateCcw, ShieldAlert, UserCheck, UserX } from "lucide-react";
import { Aviso, Etiqueta, Tarjeta, botonPrimario, botonSecundario } from "@/components/posgrado/ui";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { notificar } from "@/lib/avisos-ui";
import { REMOTO, aprobado, claveIntento, estadoVentana, habilitarArea, marcarRegistrado, reiniciarIntento, useExamen, type Incidente, type Intento } from "@/lib/examen";
import { evaluacionEnCaptura, integrarResultado, nombreArea, type AreaEvalId } from "@/lib/posgrado/datos";
import { capturasExamen } from "@/lib/profesor";
import { useSesion } from "@/lib/sesion";

const INCIDENTE: Record<Incidente["tipo"], string> = {
  "salio-ventana": "Salió de la ventana o pestaña",
  "salio-pantalla-completa": "Salió de pantalla completa",
  copiar: "Intentó copiar, cortar o pegar",
  "clic-derecho": "Clic derecho",
  captura: "Tecla de captura de pantalla",
  imprimir: "Intentó imprimir o guardar la página",
};
const hora = (iso: string) => new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });

function estadoIntento(i?: Intento): { t: string; tono: string } {
  if (!i) return { t: "Sin iniciar", tono: "bg-gray-100 text-gray-700" };
  if (!i.terminadoEl) return new Date(i.limiteEl) < new Date() ? { t: "Tiempo agotado (se entrega al abrir)", tono: "bg-amber-50 text-amber-800" } : { t: "Presentando", tono: "bg-sky-50 text-sky-800" };
  return i.registradoEl ? { t: "Calificación registrada", tono: "bg-emerald-50 text-emerald-700" } : { t: "Terminado", tono: "bg-violet-50 text-violet-800" };
}

const fechaHora = (s: string) => new Date(s).toLocaleString("es-MX", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Posgrado habilita los exámenes en línea (uno por área) a los aspirantes que los presentan, ve su avance e incidentes y registra sus calificaciones. */
export function AplicacionExamen({ soloLectura = false }: { soloLectura?: boolean }) {
  const { aspirantes, cargado, registrarEnBitacora, actualizar } = usePosgrado();
  const { habilitados, intentos, config, cargado: listo } = useExamen();
  const { sesion } = useSesion();
  const [verIncidentes, setVerIncidentes] = useState<string | null>(null);
  if (!cargado || !listo) return null;

  // Un renglón por aspirante y área que presenta en línea (examen completo o áreas no acreditadas en el propedéutico)
  const filas = capturasExamen(aspirantes)
    .filter((f) => config.areas[f.area]?.activa)
    .sort((x, y) => x.a.nombre.localeCompare(y.a.nombre, "es") || x.area.localeCompare(y.area));
  const por = sesion?.nombre ?? "Posgrado";
  const estaHabilitado = (id: string, area: AreaEvalId) => !!habilitados[id]?.areas.includes(area);

  const cambiar = (id: string, nombre: string, area: AreaEvalId, si: boolean) => {
    habilitarArea(id, area, si, por);
    // Con el servidor, la bitácora la escribe la API
    if (!REMOTO) registrarEnBitacora(`${si ? "Habilitó" : "Quitó"} el examen en línea de ${nombreArea(area)} ${si ? "a" : "de"} ${nombre} (${id})`);
  };
  /** Pasa la calificación del examen de un área a Calificaciones (escala 0 a 10), como si la Jefatura la capturara. */
  const registrar = (f: (typeof filas)[number], i: Intento) => {
    const e = f.a.evaluacion;
    const pend = evaluacionEnCaptura(e);
    if (!pend || pend.tipo !== "examen" || !pend.areas.includes(i.area)) return notificar("Este aspirante ya no tiene examen por calificar en esta área.");
    const ahora = new Date().toISOString();
    const previas = e.capturas?.examen ?? {};
    const delTipo = { ...previas };
    if (!previas[i.area] && i.calificacion10 !== undefined) delTipo[i.area] = { calificacion: i.calificacion10, por: "Examen en línea", el: ahora, primeraEl: ahora };
    const resultado = integrarResultado(delTipo, pend.areas);
    actualizar(
      f.a.id,
      { evaluacion: { ...e, capturas: { ...(e.capturas ?? {}), examen: delTipo }, ...(resultado ? { examen: resultado } : {}) } },
      `Registró la calificación del examen en línea de ${nombreArea(i.area)}: ${i.calificacion10?.toFixed(1)} (${i.puntos} de ${i.puntosMax} puntos)${resultado ? ". Lista para que Posgrado la publique" : ""}`,
    );
    marcarRegistrado(f.a.id, i.area);
    const faltan = pend.areas.filter((a) => !delTipo[a]);
    notificar(faltan.length ? `Calificación registrada. Falta ${faltan.map(nombreArea).join(" y ")} para completar su resultado.` : "Calificaciones completas: ya aparecen en Calificaciones y en Evaluación para publicarse.", "exito");
  };

  return (
    <div className="space-y-5">
      <Aviso tono="info" titulo={config.titulo}>
        {(["matematicas", "programacion"] as AreaEvalId[])
          .filter((a) => config.areas[a].activa)
          .map((a) => {
            const ca = config.areas[a];
            const v = estadoVentana(ca);
            return `${nombreArea(a)}: ${fechaHora(ca.inicio)} a ${new Date(ca.fin).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}, ${ca.duracionMin} min (${v === "abierta" ? "abierto ahora" : v === "antes" ? "aún no abre" : "cerrado"})`;
          })
          .join(" · ")}
        . Cada examen se presenta por separado; los aspirantes habilitados lo ven en su fase de Evaluación.
      </Aviso>

      <Tarjeta
        titulo={`Exámenes por presentar · ${filas.length}`}
        accion={
          !soloLectura && filas.some((f) => !estaHabilitado(f.a.id, f.area)) ? (
            <button type="button" className={botonSecundario} onClick={() => filas.filter((f) => !estaHabilitado(f.a.id, f.area)).forEach((f) => cambiar(f.a.id, f.a.nombre, f.area, true))}>
              <UserCheck size={15} /> Habilitar a todos
            </button>
          ) : undefined
        }
      >
        {!filas.length ? (
          <p className="py-4 text-center text-sm text-gray-500">Nadie tiene examen pendiente (eligieron examen o deben un área del propedéutico).</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Aspirante</th>
                  <th className="px-3 py-2 font-medium">Examen</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 font-medium">Calificación</th>
                  <th className="px-3 py-2 font-medium">Incidentes</th>
                  <th className="py-2 pl-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filas.map((f) => {
                  const k = claveIntento(f.a.id, f.area);
                  const h = estaHabilitado(f.a.id, f.area);
                  const i = intentos[k];
                  const e = estadoIntento(i);
                  return (
                    <Fragment key={k}>
                      <tr>
                        <td className="py-2.5 pr-3">
                          <span className="block font-medium text-gray-900">{f.a.nombre}</span>
                          <span className="font-mono text-xs text-gray-500">{f.a.id}</span>
                        </td>
                        <td className="px-3 py-2.5 text-gray-700">
                          {nombreArea(f.area)}
                          {f.esSegunda && <span className="block text-xs text-gray-500">Área no acreditada</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          {h ? <Etiqueta tono={e.tono}>{e.t}</Etiqueta> : <Etiqueta tono="bg-gray-100 text-gray-500">No habilitado</Etiqueta>}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums">
                          {i?.calificacion10 !== undefined ? (
                            <span className={aprobado(i) ? "text-emerald-700" : "text-red-700"}>
                              <strong>{i.calificacion10.toFixed(1)}</strong>
                              <span className="block text-xs text-gray-500">
                                {i.puntos} de {i.puntosMax} pts
                              </span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {i?.incidentes.length ? (
                            <button type="button" onClick={() => setVerIncidentes(verIncidentes === k ? null : k)} className="inline-flex items-center gap-1 text-amber-800 underline">
                              <ShieldAlert size={14} /> {i.incidentes.length}
                            </button>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="py-2.5 pl-3">
                          <span className="flex flex-wrap justify-end gap-1.5">
                            {soloLectura && !i?.registradoEl && <span className="text-xs text-gray-400">—</span>}
                            {!soloLectura && i?.terminadoEl && !i.registradoEl && (
                              <button type="button" className={`${botonPrimario} py-1.5`} onClick={() => registrar(f, i)}>
                                <ClipboardCheck size={14} /> Registrar calificación
                              </button>
                            )}
                            {!soloLectura &&
                              !i &&
                              (h ? (
                                <button type="button" className={`${botonSecundario} py-1.5`} onClick={() => cambiar(f.a.id, f.a.nombre, f.area, false)}>
                                  <UserX size={14} /> Quitar
                                </button>
                              ) : (
                                <button type="button" className={`${botonSecundario} py-1.5`} onClick={() => cambiar(f.a.id, f.a.nombre, f.area, true)}>
                                  <UserCheck size={14} /> Habilitar
                                </button>
                              ))}
                            {!soloLectura && i && !i.registradoEl && (
                              <button
                                type="button"
                                title="Por una falla técnica: borra su intento y puede volver a presentarlo"
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
                                onClick={() => {
                                  if (!window.confirm(`¿Reiniciar el examen de ${nombreArea(f.area)} de ${f.a.nombre}? Se borran sus respuestas y podrá volver a presentarlo con otras preguntas.`)) return;
                                  reiniciarIntento(f.a.id, f.area);
                                  if (!REMOTO) registrarEnBitacora(`Reinició el examen en línea de ${nombreArea(f.area)} de ${f.a.nombre} (${f.a.id})`);
                                }}
                              >
                                <RotateCcw size={13} /> Reiniciar
                              </button>
                            )}
                            {i?.registradoEl && (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                                <CheckCircle2 size={13} /> En Calificaciones
                              </span>
                            )}
                          </span>
                        </td>
                      </tr>
                      {verIncidentes === k && i && (
                        <tr>
                          <td colSpan={6} className="bg-amber-50/50 px-3 py-3">
                            <p className="mb-1 text-xs font-medium text-amber-900">
                              Incidentes de {f.a.nombre} en {nombreArea(f.area)} (inició {hora(i.inicioEl)}
                              {i.terminadoEl ? `, entregó ${hora(i.terminadoEl)}` : ""}):
                            </p>
                            <ul className="grid gap-x-6 gap-y-0.5 text-xs text-amber-900 sm:grid-cols-2">
                              {i.incidentes.map((x, k) => (
                                <li key={k}>
                                  {hora(x.el)} · {INCIDENTE[x.tipo]}
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>
    </div>
  );
}
