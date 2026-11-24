"use client";

import { useState } from "react";
import { AlertTriangle, Save } from "lucide-react";
import { Tarjeta, botonPrimario, inputBase } from "@/components/posgrado/ui";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { notificar } from "@/lib/avisos-ui";
import { APROBATORIO, NIVELES, NOMBRE_NIVEL, disponibles, guardarConfig, resumenArea, useExamen, type ConfigArea, type ConfigExamen, type NivelExamen, type Restricciones } from "@/lib/examen";
import { AREAS_EVAL, type AreaEvalId } from "@/lib/posgrado/datos";

const RESTRICCIONES: { id: keyof Restricciones; t: string; d: string }[] = [
  { id: "anticopia", t: "Bloquear copiar y pegar", d: "Sin seleccionar texto, clic derecho, Ctrl+C / Ctrl+V ni imprimir." },
  { id: "pantallaCompleta", t: "Pantalla completa", d: "El examen se presenta en pantalla completa; si sale, se registra." },
  { id: "marcaAgua", t: "Marca de agua", d: "El ID y el nombre del aspirante aparecen sobre las preguntas (desalienta fotos y capturas)." },
  { id: "ocultarAlSalir", t: "Ocultar al cambiar de ventana", d: "Si cambia de pestaña o de programa, las preguntas se ocultan y se registra." },
  { id: "unaPorPantalla", t: "Una pregunta por pantalla", d: "Si no, todas las preguntas en una sola página." },
];
const num = (v: string, min: number, max: number, def: number) => Math.max(min, Math.min(max, Number.isFinite(Number(v)) && v !== "" ? Number(v) : def));

/** Configuración del examen: ponderación por nivel y, por área, horario, duración, preguntas por nivel y valor. */
export function ConfigExamenPosgrado() {
  const { config, banco, cargado } = useExamen();
  if (!cargado) return null;
  return <Formulario key={JSON.stringify(config)} inicial={config} banco={banco} />;
}

function Formulario({ inicial, banco }: { inicial: ConfigExamen; banco: ReturnType<typeof useExamen>["banco"] }) {
  const { registrarEnBitacora } = usePosgrado();
  const [c, setC] = useState(inicial);
  const set = <K extends keyof ConfigExamen>(k: K, v: ConfigExamen[K]) => setC({ ...c, [k]: v });
  const setArea = (a: AreaEvalId, cambio: Partial<ConfigArea>) => set("areas", { ...c.areas, [a]: { ...c.areas[a], ...cambio } });
  const activas = AREAS_EVAL.filter((a) => c.areas[a.id].activa);
  const faltan = activas.flatMap((a) => NIVELES.filter((n) => c.areas[a.id].cantidades[n] > disponibles(banco, a.id, n).length).map((n) => `${a.nombre} · ${NOMBRE_NIVEL[n]}`));

  const guardar = () => {
    if (!activas.length) return notificar("Marca al menos un área para el examen en línea.");
    for (const a of activas) {
      const ca = c.areas[a.id];
      if (new Date(ca.fin) <= new Date(ca.inicio)) return notificar(`${a.nombre}: la hora de cierre debe ser posterior a la de inicio.`);
      if (!resumenArea(c, a.id).preguntas) return notificar(`${a.nombre}: indica cuántas preguntas tendrá el examen.`);
    }
    guardarConfig(c);
    registrarEnBitacora(
      `Configuró el examen en línea: ${activas
        .map((a) => {
          const r = resumenArea(c, a.id);
          return `${a.nombre} ${r.preguntas} preguntas (${r.puntos} puntos), vale ${c.areas[a.id].valor}, ${c.areas[a.id].inicio.replace("T", " ")}`;
        })
        .join("; ")}. Pesos: ${NIVELES.map((n) => `${NOMBRE_NIVEL[n]} ${c.pesos[n]}`).join(", ")}`,
    );
    notificar("Configuración guardada.", "exito");
  };

  return (
    <div className="space-y-5">
      <Tarjeta titulo="General">
        <label className="block max-w-md text-sm">
          <span className="font-medium text-gray-900">Nombre</span>
          <input value={c.titulo} onChange={(e) => set("titulo", e.target.value)} className={`${inputBase} mt-1`} />
        </label>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={c.relacionarParcial} onChange={(e) => set("relacionarParcial", e.target.checked)} className="mt-1" />
            <span>
              <span className="font-medium text-gray-900">Relacionar columnas con puntos parciales</span>
              <span className="block text-xs text-gray-500">Cada pareja correcta suma su parte; si no, la pregunta vale solo si todas están bien.</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={c.mostrarCalificacion} onChange={(e) => set("mostrarCalificacion", e.target.checked)} className="mt-1" />
            <span>
              <span className="font-medium text-gray-900">El aspirante ve su calificación al terminar</span>
              <span className="block text-xs text-gray-500">Siempre ve la fecha de publicación de resultados de su convocatoria.</span>
            </span>
          </label>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Ponderación por nivel">
        <p className="mb-3 text-sm text-gray-600">
          Puntos que vale cada pregunta según su nivel. El examen solo usa estos cuatro niveles; una pregunta puede tener un valor propio (se cambia en el banco).
        </p>
        <div className="grid max-w-2xl gap-3 sm:grid-cols-4">
          {NIVELES.map((n) => (
            <label key={n} className="text-sm">
              <span className="font-medium text-gray-900">{NOMBRE_NIVEL[n]}</span>
              <span className="mt-1 flex items-center gap-2">
                <input type="number" min={0} max={100} step={0.5} value={c.pesos[n]} onChange={(e) => set("pesos", { ...c.pesos, [n]: num(e.target.value, 0, 100, 0) })} className={`${inputBase} w-20`} />
                <span className="text-gray-600">pts</span>
              </span>
            </label>
          ))}
        </div>
      </Tarjeta>

      {AREAS_EVAL.map((a) => {
        const ca = c.areas[a.id];
        const r = resumenArea(c, a.id);
        return (
          <Tarjeta
            key={a.id}
            titulo={`Examen de ${a.nombre}${ca.activa ? ` · ${r.preguntas} preguntas · ${r.puntos} puntos` : " · no se presenta en línea"}`}
            accion={
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={ca.activa} onChange={(e) => setArea(a.id, { activa: e.target.checked })} /> Se presenta en línea
              </label>
            }
          >
            {!ca.activa ? (
              <p className="text-sm text-gray-500">Su calificación se captura en Calificaciones como siempre.</p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="text-sm">
                    <span className="font-medium text-gray-900">Se puede iniciar desde</span>
                    <input type="datetime-local" value={ca.inicio} onChange={(e) => setArea(a.id, { inicio: e.target.value })} className={`${inputBase} mt-1`} />
                  </label>
                  <label className="text-sm">
                    <span className="font-medium text-gray-900">Cierra</span>
                    <input type="datetime-local" value={ca.fin} onChange={(e) => setArea(a.id, { fin: e.target.value })} className={`${inputBase} mt-1`} />
                  </label>
                  <label className="text-sm">
                    <span className="font-medium text-gray-900">Tiempo para contestar</span>
                    <span className="mt-1 flex items-center gap-2">
                      <input type="number" min={10} max={300} value={ca.duracionMin} onChange={(e) => setArea(a.id, { duracionMin: num(e.target.value, 10, 300, 60) })} className={`${inputBase} w-24`} />
                      <span className="text-gray-600">minutos</span>
                    </span>
                  </label>
                  <label className="text-sm">
                    <span className="font-medium text-gray-900">El examen vale</span>
                    <span className="mt-1 flex items-center gap-2">
                      <input type="number" min={1} max={1000} value={ca.valor} onChange={(e) => setArea(a.id, { valor: num(e.target.value, 1, 1000, 10) })} className={`${inputBase} w-24`} />
                      <span className="text-gray-600">puntos</span>
                    </span>
                  </label>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="py-2 pr-3 font-medium">Nivel</th>
                        <th className="px-3 py-2 font-medium">Preguntas</th>
                        <th className="px-3 py-2 text-right font-medium">Disponibles</th>
                        <th className="px-3 py-2 text-right font-medium">Puntos</th>
                        <th className="py-2 pl-3 text-right font-medium">% del examen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {NIVELES.map((n: NivelExamen) => {
                        const hay = disponibles(banco, a.id, n).length;
                        const pts = ca.cantidades[n] * c.pesos[n];
                        return (
                          <tr key={n}>
                            <td className="py-2 pr-3 text-gray-800">
                              {NOMBRE_NIVEL[n]} <span className="text-xs text-gray-500">· {c.pesos[n]} pts c/u</span>
                            </td>
                            <td className="px-3 py-2">
                              <input type="number" min={0} max={200} value={ca.cantidades[n]} onChange={(e) => setArea(a.id, { cantidades: { ...ca.cantidades, [n]: num(e.target.value, 0, 200, 0) } })} className={`${inputBase} w-20 py-1`} />
                            </td>
                            <td className={`px-3 py-2 text-right tabular-nums ${ca.cantidades[n] > hay ? "font-medium text-red-700" : "text-gray-500"}`}>{hay}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{pts}</td>
                            <td className="py-2 pl-3 text-right tabular-nums text-gray-600">{r.puntos ? Math.round((pts / r.puntos) * 100) : 0} %</td>
                          </tr>
                        );
                      })}
                      <tr className="font-medium text-gray-900">
                        <td className="py-2 pr-3">Total</td>
                        <td className="px-3 py-2 tabular-nums">{r.preguntas}</td>
                        <td />
                        <td className="px-3 py-2 text-right tabular-nums">{r.puntos}</td>
                        <td className="py-2 pl-3 text-right">100 %</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Calificación = puntos obtenidos ÷ {r.puntos} × {ca.valor}. Aprueba con {Math.round(APROBATORIO * ca.valor * 10) / 10} de {ca.valor} (80 %, equivale a 8 de 10). A Calificaciones pasa en escala de
                  0 a 10. Las preguntas de cada nivel se eligen al azar y repartidas entre los temas.
                </p>
              </>
            )}
          </Tarjeta>
        );
      })}

      <Tarjeta titulo="Restricciones al presentar">
        <ul className="grid gap-3 sm:grid-cols-2">
          {RESTRICCIONES.map((r) => (
            <li key={r.id}>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={c.restricciones[r.id]} onChange={(e) => set("restricciones", { ...c.restricciones, [r.id]: e.target.checked })} className="mt-1" />
                <span>
                  <span className="font-medium text-gray-900">{r.t}</span>
                  <span className="block text-xs text-gray-500">{r.d}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          Ningún sitio web puede impedir por completo una captura de pantalla o una foto con el celular. Estas medidas la dificultan, la registran y permiten rastrear de quién
          salió una imagen filtrada. Para un bloqueo total se puede exigir Safe Exam Browser.
        </p>
      </Tarjeta>

      {!!faltan.length && (
        <p className="flex items-start gap-2 text-sm text-red-700">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" /> Se piden más preguntas de las disponibles en: {faltan.join(", ")}. A cada aspirante le tocarán menos.
        </p>
      )}
      <button type="button" className={botonPrimario} onClick={guardar}>
        <Save size={15} /> Guardar configuración
      </button>
    </div>
  );
}
