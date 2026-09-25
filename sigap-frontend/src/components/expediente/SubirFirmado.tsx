"use client";

import { useRef, useState } from "react";
import { FileUp, Paperclip, Printer, Send, Trash2 } from "lucide-react";
import { useConvocatoria } from "@/lib/convocatoria";
import { useExpediente } from "./ExpedienteProvider";

const kb = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);

/** Carga del PDF firmado a mano (escaneado). */
export function SubirFirmado({ clave, habilitado, destino }: { clave: string; habilitado: boolean; destino: string }) {
  const MAX_MB = useConvocatoria().config.limiteMB;
  const { firmados, subirFirmado } = useExpediente();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const archivo = firmados[clave];

  function onArchivo(file: File | undefined) {
    if (!file) return;
    setError("");
    if (file.type !== "application/pdf") return setError("Sube el escaneo en formato PDF.");
    if (file.size > MAX_MB * 1024 * 1024) return setError(`Archivo demasiado pesado (${kb(file.size)}). Máximo ${MAX_MB} MB.`);
    subirFirmado(clave, { nombre: file.name, bytes: file.size, fecha: new Date().toISOString() });
    if (input.current) input.current.value = "";
  }

  return (
    <div>
      <p className="mb-2 flex items-start gap-1.5 text-xs text-gray-500">
        <Printer size={13} className="mt-px shrink-0" /> Imprime, firma con tinta azul y escanéalo completo en un solo PDF (máx. {MAX_MB} MB).
      </p>
      <input ref={input} type="file" accept="application/pdf" className="hidden" onChange={(e) => onArchivo(e.target.files?.[0])} />
      {archivo ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
          <p className="flex items-center gap-1.5 text-emerald-800">
            <Paperclip size={14} /> {archivo.nombre} · {kb(archivo.bytes)}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-700">
            <Send size={12} /> Enviado a: {destino}
          </p>
          <div className="mt-2 flex gap-3 text-xs">
            <button type="button" onClick={() => input.current?.click()} className="text-gray-700 underline">
              Reemplazar
            </button>
            <button type="button" onClick={() => subirFirmado(clave, null)} className="flex items-center gap-1 text-gray-600 hover:text-red-600">
              <Trash2 size={12} /> Quitar
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            disabled={!habilitado}
            onClick={() => input.current?.click()}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <FileUp size={15} /> Subir PDF firmado
          </button>
          <p className="mt-1.5 text-xs text-gray-500">Se enviará a: {destino}</p>
        </>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
