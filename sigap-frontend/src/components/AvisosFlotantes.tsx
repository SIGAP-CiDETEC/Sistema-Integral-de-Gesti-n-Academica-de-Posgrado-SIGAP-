"use client";

import { CheckCircle2, TriangleAlert, X } from "lucide-react";
import { cerrarAviso, useAvisosUi } from "@/lib/avisos-ui";

/** Avisos flotantes (esquina inferior derecha). */
export function AvisosFlotantes() {
  const avisos = useAvisosUi();
  if (!avisos.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" role="status" aria-live="polite">
      {avisos.map((a) => (
        <div
          key={a.id}
          className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm shadow-lg ${a.tipo === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}
        >
          {a.tipo === "error" ? <TriangleAlert size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
          <span className="flex-1">{a.texto}</span>
          <button type="button" aria-label="Cerrar aviso" onClick={() => cerrarAviso(a.id)} className="text-current opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
