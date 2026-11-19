"use client";

import { useState } from "react";
import { Plus, Save, Trash2, X } from "lucide-react";
import { botonPrimario, botonSecundario, inputBase } from "@/components/posgrado/ui";
import { NIVELES, NOMBRE_NIVEL, NOMBRE_TIPO, type Nivel, type Pregunta, type TipoPregunta } from "@/lib/examen";
import { AREAS_EVAL, type AreaEvalId } from "@/lib/posgrado/datos";
import { Contenido } from "./Contenido";

const letra = (i: number) => String.fromCharCode(97 + i);

/** Crear o editar una pregunta del banco, con vista previa (fórmulas entre \( … \) o $$ … $$). */
export function EditorPregunta({
  inicial,
  temas,
  unidades,
  onGuardar,
  onCancelar,
}: {
  inicial: Pregunta;
  temas: string[];
  unidades: string[];
  onGuardar: (p: Pregunta) => void;
  onCancelar: () => void;
}) {
  const [p, setP] = useState<Pregunta>(inicial);
  const [error, setError] = useState("");
  const set = <K extends keyof Pregunta>(k: K, v: Pregunta[K]) => setP({ ...p, [k]: v });

  const cambiarTipo = (tipo: TipoPregunta) =>
    setP({
      ...p,
      tipo,
      opciones: tipo === "opcion" ? (p.opciones?.length ? p.opciones : [0, 1, 2, 3].map((i) => ({ id: letra(i), texto: "", correcta: i === 0 }))) : p.opciones,
      verdadero: tipo === "vf" ? (p.verdadero ?? true) : p.verdadero,
      pares: tipo === "relacionar" ? (p.pares?.length ? p.pares : [0, 1, 2].map((i) => ({ id: `p${i + 1}`, izquierda: "", derecha: "" }))) : p.pares,
      respuestas: tipo === "corta" ? (p.respuestas?.length ? p.respuestas : [""]) : p.respuestas,
    });

  const validar = (): string => {
    if (!p.tema.trim()) return "Escribe el tema.";
    if (!p.enunciado.trim()) return "Escribe el enunciado.";
    if (p.tipo === "opcion") {
      const ops = (p.opciones ?? []).filter((o) => o.texto.trim());
      if (ops.length < 2) return "Agrega al menos dos opciones.";
      if (ops.filter((o) => o.correcta).length !== 1) return "Marca exactamente una opción correcta.";
    }
    if (p.tipo === "relacionar" && (p.pares ?? []).filter((x) => x.izquierda.trim() && x.derecha.trim()).length < 2) return "Agrega al menos dos parejas completas.";
    if (p.tipo === "corta" && !(p.respuestas ?? []).some((x) => x.trim())) return "Escribe al menos una respuesta aceptada.";
    return "";
  };
  const guardar = () => {
    const e = validar();
    if (e) return setError(e);
    onGuardar({
      ...p,
      tema: p.tema.trim(),
      unidad: p.unidad.trim(),
      opciones: p.tipo === "opcion" ? (p.opciones ?? []).filter((o) => o.texto.trim()) : undefined,
      pares: p.tipo === "relacionar" ? (p.pares ?? []).filter((x) => x.izquierda.trim() && x.derecha.trim()) : undefined,
      respuestas: p.tipo === "corta" ? (p.respuestas ?? []).map((x) => x.trim()).filter(Boolean) : undefined,
      verdadero: p.tipo === "vf" ? !!p.verdadero : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h2 className="font-semibold text-gray-900">{inicial.enunciado ? "Editar pregunta" : "Nueva pregunta"}</h2>
          <button type="button" aria-label="Cerrar" onClick={onCancelar} className="rounded p-1 text-gray-500 hover:bg-gray-100">
            <X size={18} />
          </button>
        </header>
        <div className="space-y-4 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="font-medium text-gray-900">Área</span>
              <select value={p.area} onChange={(e) => set("area", e.target.value as AreaEvalId)} className={`${inputBase} mt-1`}>
                {AREAS_EVAL.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="font-medium text-gray-900">Unidad</span>
              <input list="unidades-banco" value={p.unidad} onChange={(e) => set("unidad", e.target.value)} className={`${inputBase} mt-1`} />
              <datalist id="unidades-banco">
                {unidades.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </label>
            <label className="text-sm">
              <span className="font-medium text-gray-900">Tema</span>
              <input list="temas-banco" value={p.tema} onChange={(e) => set("tema", e.target.value)} className={`${inputBase} mt-1`} placeholder="Ej. 2.1 Combinatoria" />
              <datalist id="temas-banco">
                {temas.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="font-medium text-gray-900">Nivel</span>
                <select value={p.nivel} onChange={(e) => set("nivel", e.target.value as Nivel)} className={`${inputBase} mt-1`}>
                  {[...NIVELES, "sin-nivel" as const].map((n) => (
                    <option key={n} value={n}>
                      {NOMBRE_NIVEL[n]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="font-medium text-gray-900">Tipo</span>
                <select value={p.tipo} onChange={(e) => cambiarTipo(e.target.value as TipoPregunta)} className={`${inputBase} mt-1`}>
                  {(Object.keys(NOMBRE_TIPO) as TipoPregunta[]).map((t) => (
                    <option key={t} value={t}>
                      {NOMBRE_TIPO[t]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <label className="block text-sm">
            <span className="font-medium text-gray-900">Enunciado</span>
            <textarea value={p.enunciado} onChange={(e) => set("enunciado", e.target.value)} rows={4} className={`${inputBase} mt-1 font-mono text-xs`} />
            <span className="mt-0.5 block text-xs text-gray-500">
              Fórmulas: <code>\(x^2\)</code> en línea o <code>$$\sum_i x_i$$</code> en bloque. Se admite HTML (párrafos, negritas, <code>&lt;pre&gt;</code> para código).
            </span>
          </label>
          {p.enunciado.trim() && (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Vista previa</p>
              <Contenido html={p.enunciado} className="mt-1 text-sm text-gray-900" />
            </div>
          )}

          {p.tipo === "opcion" && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900">Opciones (marca la correcta)</p>
              {(p.opciones ?? []).map((o, i) => (
                <div key={o.id} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correcta"
                    checked={o.correcta}
                    onChange={() => set("opciones", (p.opciones ?? []).map((x) => ({ ...x, correcta: x.id === o.id })))}
                    aria-label={`La opción ${letra(i)} es la correcta`}
                  />
                  <input
                    value={o.texto}
                    onChange={(e) => set("opciones", (p.opciones ?? []).map((x) => (x.id === o.id ? { ...x, texto: e.target.value } : x)))}
                    className={`${inputBase} flex-1 py-1.5 ${o.correcta ? "border-emerald-400" : ""}`}
                    placeholder={`Opción ${letra(i)}`}
                  />
                  <button type="button" aria-label="Quitar opción" onClick={() => set("opciones", (p.opciones ?? []).filter((x) => x.id !== o.id))} className="rounded p-1.5 text-gray-400 hover:text-red-700">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button type="button" className="inline-flex items-center gap-1 text-sm text-primary" onClick={() => set("opciones", [...(p.opciones ?? []), { id: `o${Date.now().toString(36)}`, texto: "", correcta: false }])}>
                <Plus size={14} /> Agregar opción
              </button>
            </div>
          )}

          {p.tipo === "vf" && (
            <div className="flex gap-4 text-sm">
              <span className="font-medium text-gray-900">Respuesta correcta:</span>
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={!!p.verdadero} onChange={() => set("verdadero", true)} /> Verdadero
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={!p.verdadero} onChange={() => set("verdadero", false)} /> Falso
              </label>
            </div>
          )}

          {p.tipo === "relacionar" && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900">Parejas (izquierda → la que le corresponde)</p>
              {(p.pares ?? []).map((x) => (
                <div key={x.id} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                  <input value={x.izquierda} onChange={(e) => set("pares", (p.pares ?? []).map((y) => (y.id === x.id ? { ...y, izquierda: e.target.value } : y)))} className={`${inputBase} py-1.5`} placeholder="Concepto" />
                  <span className="text-gray-400">→</span>
                  <input value={x.derecha} onChange={(e) => set("pares", (p.pares ?? []).map((y) => (y.id === x.id ? { ...y, derecha: e.target.value } : y)))} className={`${inputBase} py-1.5`} placeholder="Descripción" />
                  <button type="button" aria-label="Quitar pareja" onClick={() => set("pares", (p.pares ?? []).filter((y) => y.id !== x.id))} className="rounded p-1.5 text-gray-400 hover:text-red-700">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button type="button" className="inline-flex items-center gap-1 text-sm text-primary" onClick={() => set("pares", [...(p.pares ?? []), { id: `p${Date.now().toString(36)}`, izquierda: "", derecha: "" }])}>
                <Plus size={14} /> Agregar pareja
              </button>
            </div>
          )}

          {p.tipo === "corta" && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900">Respuestas aceptadas (no distingue mayúsculas ni acentos)</p>
              {(p.respuestas ?? []).map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={r} onChange={(e) => set("respuestas", (p.respuestas ?? []).map((x, j) => (j === i ? e.target.value : x)))} className={`${inputBase} flex-1 py-1.5`} />
                  <button type="button" aria-label="Quitar respuesta" onClick={() => set("respuestas", (p.respuestas ?? []).filter((_, j) => j !== i))} className="rounded p-1.5 text-gray-400 hover:text-red-700">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button type="button" className="inline-flex items-center gap-1 text-sm text-primary" onClick={() => set("respuestas", [...(p.respuestas ?? []), ""])}>
                <Plus size={14} /> Agregar respuesta
              </button>
            </div>
          )}

          <label className="block text-sm">
            <span className="font-medium text-gray-900">Retroalimentación (opcional)</span>
            <textarea value={p.retroalimentacion ?? ""} onChange={(e) => set("retroalimentacion", e.target.value || undefined)} rows={2} className={`${inputBase} mt-1`} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={p.activa} onChange={(e) => set("activa", e.target.checked)} /> Activa (puede salir en el examen)
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <footer className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
          <button type="button" className={botonSecundario} onClick={onCancelar}>
            Cancelar
          </button>
          <button type="button" className={botonPrimario} onClick={guardar}>
            <Save size={15} /> Guardar
          </button>
        </footer>
      </div>
    </div>
  );
}
