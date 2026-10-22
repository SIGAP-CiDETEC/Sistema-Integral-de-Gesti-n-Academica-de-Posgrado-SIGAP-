"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { abrirArchivo } from "@/lib/api";
import { notificar } from "@/lib/avisos-ui";

/** Botón que abre un PDF guardado en el servidor (con la sesión de la cuenta). */
export function ArchivoServidor({ ruta, texto, className }: { ruta: string; texto: string; className?: string }) {
  const [abriendo, setAbriendo] = useState(false);
  return (
    <button
      type="button"
      disabled={abriendo}
      onClick={async () => {
        setAbriendo(true);
        const error = await abrirArchivo(ruta);
        if (error) notificar(error);
        setAbriendo(false);
      }}
      className={className ?? "inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50 disabled:opacity-60"}
    >
      {abriendo ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} {texto}
    </button>
  );
}
