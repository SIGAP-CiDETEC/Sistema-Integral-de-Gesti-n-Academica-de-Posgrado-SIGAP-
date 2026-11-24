"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { botonPrimario, botonSecundario } from "@/components/posgrado/ui";
import { TIPOS, type TipoPregunta } from "@/lib/examen";

/** "Elija un tipo de pregunta a agregar": el mismo menú que Moodle, con la descripción del tipo elegido. */
export function ElegirTipo({ onElegir, onCancelar }: { onElegir: (t: TipoPregunta) => void; onCancelar: () => void }) {
  const [sel, setSel] = useState<TipoPregunta | "descripcion">("opcion");
  const t = TIPOS.find((x) => x.id === sel);
  const disponible = !!t?.disponible;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8" role="dialog" aria-modal="true" aria-label="Elija un tipo de pregunta a agregar">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h2 className="font-semibold text-gray-900">Elija un tipo de pregunta a agregar</h2>
          <button type="button" aria-label="Cerrar" onClick={onCancelar} className="rounded p-1 text-gray-500 hover:bg-gray-100">
            <X size={18} />
          </button>
        </header>
        <div className="grid gap-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="max-h-[60vh] overflow-y-auto border-b border-gray-100 py-2 sm:border-b-0 sm:border-r">
            <p className="px-5 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Preguntas</p>
            {TIPOS.map((x) => (
              <label key={x.id} className={`flex cursor-pointer items-center gap-2.5 px-5 py-1.5 text-sm ${sel === x.id ? "bg-indigo-50" : "hover:bg-gray-50"}`}>
                <input type="radio" name="tipo-pregunta" checked={sel === x.id} onChange={() => setSel(x.id)} onDoubleClick={() => x.disponible && onElegir(x.id)} />
                <span className={x.disponible ? "text-gray-900" : "text-gray-400"}>{x.nombre}</span>
                {!x.disponible && <span className="ml-auto rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">Próximamente</span>}
                {x.disponible && !x.enExamen && <span className="ml-auto rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-800">No sale en el examen</span>}
              </label>
            ))}
            <p className="px-5 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Otro</p>
            <label className={`flex cursor-pointer items-center gap-2.5 px-5 py-1.5 text-sm ${sel === "descripcion" ? "bg-indigo-50" : "hover:bg-gray-50"}`}>
              <input type="radio" name="tipo-pregunta" checked={sel === "descripcion"} onChange={() => setSel("descripcion")} />
              <span className="text-gray-400">Descripción</span>
              <span className="ml-auto rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">No aplica</span>
            </label>
          </div>
          <div className="px-5 py-4 text-sm text-gray-700">
            <p className="font-medium text-gray-900">{t?.nombre ?? "Descripción"}</p>
            <p className="mt-2">
              {t?.descripcion ?? "No es una pregunta: solo muestra un texto. En el examen de admisión las indicaciones ya aparecen antes de iniciar, así que no se usa."}
            </p>
          </div>
        </div>
        <footer className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
          <button type="button" className={botonSecundario} onClick={onCancelar}>
            Cancelar
          </button>
          <button type="button" className={botonPrimario} disabled={!disponible} onClick={() => t && onElegir(t.id)}>
            Agregar
          </button>
        </footer>
      </div>
    </div>
  );
}
