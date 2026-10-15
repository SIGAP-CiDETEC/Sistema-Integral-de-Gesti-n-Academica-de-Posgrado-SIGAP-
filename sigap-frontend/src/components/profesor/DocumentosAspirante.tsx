"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Tarjeta } from "@/components/posgrado/ui";
import { generarActaMtcEc } from "@/lib/pdf/acta";
import { generarPdfRegistro } from "@/lib/pdf/registro";
import { actaPrellenada, hoja1Prellenada } from "@/lib/registro-aspirante";
import type { AspiranteP } from "@/lib/posgrado/datos";

const abrir = (url: string, nombre: string) => {
  const el = document.createElement("a");
  el.href = url;
  el.download = nombre;
  el.click();
  if (url.startsWith("blob:")) setTimeout(() => URL.revokeObjectURL(url), 5000);
};

/**
 * Documentos que recibe el profesor al integrarse al sínodo: el registro del aspirante (PDF del primer formulario)
 * y el acta de entrevista colegiada MTC-EC prellenada con sus datos.
 */
export function DocumentosAspirante({ a }: { a: AspiranteP }) {
  const { registroDe, capturasDe } = usePosgrado();
  const [cargando, setCargando] = useState<"" | "registro" | "acta">("");

  const descargar = async (cual: "registro" | "acta") => {
    setCargando(cual);
    try {
      if (cual === "registro") abrir(await generarPdfRegistro(registroDe(a.id), a.id), `Registro_${a.id}.pdf`);
      else abrir(await generarActaMtcEc(a, actaPrellenada(hoja1Prellenada(a, registroDe(a.id), capturasDe(a.id)))), `MTC-EC_prellenada_${a.id}.pdf`);
    } finally {
      setCargando("");
    }
  };

  const fila = (cual: "registro" | "acta", t: string, d: string) => (
    <li className="flex flex-wrap items-center justify-between gap-3 py-2.5">
      <span className="flex items-start gap-2">
        <FileText size={18} className="mt-0.5 shrink-0 text-primary" />
        <span>
          <span className="block font-medium text-gray-900">{t}</span>
          <span className="text-xs text-gray-500">{d}</span>
        </span>
      </span>
      <button
        type="button"
        disabled={!!cargando}
        onClick={() => descargar(cual)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50 disabled:opacity-60"
      >
        {cargando === cual ? <Loader2 size={14} className="animate-spin" /> : null} Descargar PDF
      </button>
    </li>
  );

  return (
    <Tarjeta titulo="Documentos del aspirante">
      <ul className="divide-y divide-gray-100 text-sm">
        {fila("registro", "Registro de admisión", "Lo que el aspirante respondió en su registro (formación, experiencia, motivos, intereses…).")}
        {fila("acta", "Acta de entrevista colegiada (MTC-EC) prellenada", "Hoja 1 con los datos de su registro y expediente; el sínodo la completa en la entrevista.")}
      </ul>
    </Tarjeta>
  );
}
