"use client";

import { useState } from "react";
import { AlertTriangle, Save } from "lucide-react";
import { Tarjeta, botonPrimario, inputBase } from "@/components/posgrado/ui";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { notificar } from "@/lib/avisos-ui";
import { NIVELES, NOMBRE_NIVEL, disponibles, guardarConfig, totalPreguntas, useExamen, type ConfigExamen, type Nivel, type Restricciones } from "@/lib/examen";
import { AREAS_EVAL, MINIMA_AREA, type AreaEvalId } from "@/lib/posgrado/datos";

const RESTRICCIONES: { id: keyof Restricciones; t: string; d: string }[] = [
  { id: "anticopia", t: "Bloquear copiar y pegar", d: "Sin seleccionar texto, clic derecho, Ctrl+C / Ctrl+V ni imprimir." },
  { id: "pantallaCompleta", t: "Pantalla completa", d: "El examen se presenta en pantalla completa; si sale, se registra." },
  { id: "marcaAgua", t: "Marca de agua", d: "El ID y el nombre del aspirante aparecen sobre las preguntas (desalienta fotos y capturas)." },
  { id: "ocultarAlSalir", t: "Ocultar al cambiar de ventana", d: "Si cambia de pestaña o de programa, las preguntas se ocultan y se registra." },
  { id: "unaPorPantalla", t: "Una pregunta por pantalla", d: "Si no, todas las preguntas en una sola página." },
];

/** Configuración del examen: preguntas por tema y nivel, tiempo, ventana de aplicación y restricciones. */
export function ConfigExamenPosgrado() {
  const { config, banco, cargado } = useExamen();
  if (!cargado) return null;
  return <Formulario key={JSON.stringify(config)} inicial={config} banco={banco} />;
}

function Formulario({ inicial, banco }: { inicial: ConfigExamen; banco: ReturnType<typeof useExamen>["banco"] }) {
  const { registrarEnBitacora } = usePosgrado();
  const [c, setC] = useState(inicial);
  const set = <K extends keyof ConfigExamen>(k: K, v: ConfigExamen[K]) => setC({ ...c, [k]: v });
  const setRegla = (area: AreaEvalId, i: number, cambio: Partial<ConfigExamen["reglas"][AreaEvalId][number]>) =>
    set("reglas", { ...c.reglas, [area]: c.reglas[area].map((r, j) => (j === i ? { ...r, ...cambio } : r)) });
  const faltan = AREAS_EVAL.filter((a) => c.areasEnLinea.includes(a.id)).flatMap((a) => c.reglas[a.id].filter((r) => r.cantidad > disponibles(banco, a.id, r).length).map((r) => `${r.tema}`));

  const guardar = () => {
    if (new Date(c.fin) <= new Date(c.inicio)) return notificar("La hora de cierre debe ser posterior a la de inicio.");
    if (!c.areasEnLinea.length) return notificar("Marca al menos un área para el examen en línea.");
    guardarConfig(c);
    registrarEnBitacora(
      `Configuró el examen en línea: ${AREAS_EVAL.filter((a) => c.areasEnLinea.includes(a.id)).map((a) => `${totalPreguntas(c, a.id)} preguntas de ${a.nombre}`).join(" y ")}, ${c.duracionMin} min, del ${c.inicio.replace("T", " ")} al ${c.fin.replace("T", " ")}`,
    );
    notificar("Configuración guardada.", "exito");
  };

  return (
    <div className="space-y-5">
      <Tarjeta titulo="Aplicación">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm sm:col-span-2 lg:col-span-1">
            <span className="font-medium text-gray-900">Nombre</span>
            <input value={c.titulo} onChange={(e) => set("titulo", e.target.value)} className={`${inputBase} mt-1`} />
          </label>
          <label className="text-sm">
            <span className="font-medium text-gray-900">Se puede iniciar desde</span>
            <input type="datetime-local" value={c.inicio} onChange={(e) => set("inicio", e.target.value)} className={`${inputBase} mt-1`} />
          </label>
          <label className="text-sm">
            <span className="font-medium text-gray-900">Cierra</span>
            <input type="datetime-local" value={c.fin} onChange={(e) => set("fin", e.target.value)} className={`${inputBase} mt-1`} />
          </label>
          <label className="text-sm">
            <span className="font-medium text-gray-900">Tiempo para contestar</span>
            <span className="mt-1 flex items-center gap-2">
              <input type="number" min={10} max={300} value={c.duracionMin} onChange={(e) => set("duracionMin", Math.max(10, Math.min(300, Number(e.target.value) || 60)))} className={`${inputBase} w-24`} />
              <span className="text-gray-600">minutos</span>
            </span>
          </label>
        </div>
        <div className="mt-4 text-sm">
          <span className="font-medium text-gray-900">Áreas que se presentan en línea</span>
          <span className="mt-1 flex flex-wrap gap-4">
            {AREAS_EVAL.map((a) => (
              <label key={a.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={c.areasEnLinea.includes(a.id)}
                  onChange={(e) => set("areasEnLinea", e.target.checked ? AREAS_EVAL.map((x) => x.id).filter((x) => x === a.id || c.areasEnLinea.includes(x)) : c.areasEnLinea.filter((x) => x !== a.id))}
                />
                {a.nombre}
              </label>
            ))}
          </span>
          <span className="mt-1 block text-xs text-gray-500">El área que no se marque no aparece en el examen; su calificación se captura en Calificaciones como siempre.</span>
        </div>
        <p className="mt-2 text-xs text-gray-500">El tiempo corre desde que el aspirante inicia; si la ventana cierra antes, el examen se entrega solo al cierre. Un solo intento.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={c.relacionarParcial} onChange={(e) => set("relacionarParcial", e.target.checked)} className="mt-1" />
            <span>
              <span className="font-medium text-gray-900">Relacionar columnas con puntos parciales</span>
              <span className="block text-xs text-gray-500">Cada pareja correcta suma; si no, la pregunta vale solo si todas están bien.</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={c.mostrarCalificacion} onChange={(e) => set("mostrarCalificacion", e.target.checked)} className="mt-1" />
            <span>
              <span className="font-medium text-gray-900">El aspirante ve su calificación al terminar</span>
              <span className="block text-xs text-gray-500">Si no, la conoce cuando Posgrado publique los resultados.</span>
            </span>
          </label>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Calificación por área: porcentaje de aciertos en escala de 0 a 10 (un decimal). Mínima aprobatoria: {MINIMA_AREA.toFixed(1)}, igual que en Calificaciones.
        </p>
      </Tarjeta>

      {AREAS_EVAL.filter((a) => c.areasEnLinea.includes(a.id)).map((a) => (
        <Tarjeta key={a.id} titulo={`${a.nombre} · ${totalPreguntas(c, a.id)} preguntas`}>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-600">Poner en todos los temas:</span>
            {[0, 1, 2, 3].map((n) => (
              <button key={n} type="button" onClick={() => set("reglas", { ...c.reglas, [a.id]: c.reglas[a.id].map((r) => ({ ...r, cantidad: n })) })} className="rounded-md border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-50">
                {n}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Tema</th>
                  <th className="px-3 py-2 font-medium">Nivel</th>
                  <th className="px-3 py-2 font-medium">Preguntas</th>
                  <th className="py-2 pl-3 text-right font-medium">Disponibles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {c.reglas[a.id].map((r, i) => {
                  const hay = disponibles(banco, a.id, r).length;
                  return (
                    <tr key={r.tema}>
                      <td className="py-2 pr-3 text-gray-800">{r.tema}</td>
                      <td className="px-3 py-2">
                        <select value={r.nivel} onChange={(e) => setRegla(a.id, i, { nivel: e.target.value as Nivel | "cualquiera" })} className={`${inputBase} py-1`}>
                          <option value="cualquiera">Cualquiera</option>
                          {[...NIVELES, "sin-nivel" as const].map((n) => (
                            <option key={n} value={n}>
                              {NOMBRE_NIVEL[n]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min={0} max={50} value={r.cantidad} onChange={(e) => setRegla(a.id, i, { cantidad: Math.max(0, Math.min(50, Number(e.target.value) || 0)) })} className={`${inputBase} w-20 py-1`} />
                      </td>
                      <td className={`py-2 pl-3 text-right tabular-nums ${r.cantidad > hay ? "font-medium text-red-700" : "text-gray-500"}`}>{hay}</td>
                    </tr>
                  );
                })}
                {!c.reglas[a.id].length && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-gray-500">
                      No hay temas: agrega o importa preguntas en el banco.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-500">A cada aspirante le tocan preguntas distintas de cada tema, en orden aleatorio y con las opciones revueltas.</p>
        </Tarjeta>
      ))}

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
          <AlertTriangle size={15} className="mt-0.5 shrink-0" /> En {faltan.length} tema(s) se piden más preguntas de las disponibles: a cada aspirante le tocarán menos.
        </p>
      )}
      <button type="button" className={botonPrimario} onClick={guardar}>
        <Save size={15} /> Guardar configuración
      </button>
    </div>
  );
}
