"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Tarjeta } from "@/components/posgrado/ui";
import { generarPdfRegistro } from "@/lib/pdf/registro";
import type { AspiranteP } from "@/lib/posgrado/datos";

/** Documento que recibe el profesor al integrarse al sínodo: el registro del aspirante (PDF del primer formulario). */
export function DocumentosAspirante({ a }: { a: AspiranteP }) {
  const { registroDe } = usePosgrado();
  const [cargando, setCargando] = useState(false);

  const descargar = async () => {
    setCargando(true);
    try {
      const el = document.createElement("a");
      el.href = await generarPdfRegistro(registroDe(a.id), a.id);
      el.download = `Registro_${a.id}.pdf`;
      el.click();
    } finally {
      setCargando(false);
    }
  };

  return (
    <Tarjeta titulo="Documentos del aspirante">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="flex items-start gap-2">
          <FileText size={18} className="mt-0.5 shrink-0 text-primary" />
          <span>
            <span className="block font-medium text-gray-900">Registro de admisión</span>
            <span className="text-xs text-gray-500">Lo que el aspirante respondió en su registro (formación, experiencia, motivos, intereses…).</span>
          </span>
        </span>
        <button
          type="button"
          disabled={cargando}
          onClick={descargar}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50 disabled:opacity-60"
        >
          {cargando && <Loader2 size={14} className="animate-spin" />} Descargar PDF
        </button>
      </div>
    </Tarjeta>
  );
}
