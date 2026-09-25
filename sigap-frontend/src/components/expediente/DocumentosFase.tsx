"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileUp, Info, Paperclip, Send, Trash2, Upload } from "lucide-react";
import { documentosDeFase, esRequerido, type Documento } from "@/lib/documentos";
import type { EtapaId } from "@/lib/admision";
import { useRevisionDocs } from "@/lib/posgrado/revision";
import { useConvocatoria } from "@/lib/convocatoria";
import { useExpediente, type ArchivoCargado } from "./ExpedienteProvider";

const kb = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);

/** Reduce la foto a ~300 px para guardarla y colocarla en el SIP-01. */
function reducirImagen(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const esc = Math.min(1, 300 / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * esc;
      canvas.height = img.height * esc;
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export function DocumentosFase({ fase, conEnvio = false }: { fase: EtapaId; conEnvio?: boolean }) {
  const { registro, documentos, enviadoRevision, enviarRevision } = useExpediente();
  const lista = documentosDeFase(fase, registro);
  // Límite por archivo configurado por el Administrador en la convocatoria (RF-81)
  const limiteMB = useConvocatoria().config.limiteMB;
  const requeridos = lista.filter((d) => esRequerido(d, registro));
  const listos = requeridos.filter((d) => documentos[d.id]).length;
  const usados = lista.reduce((t, d) => t + (documentos[d.id]?.bytes ?? 0), 0);

  if (!lista.length) return null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-gray-900">
            <Upload size={17} className="text-primary" /> Documentos que subes
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {lista[0].formatos === "imagen" ? "Imagen JPG o PNG." : `Solo PDF, máximo ${limiteMB} MB por documento.`}
          </p>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
          {listos} de {requeridos.length} obligatorios · {kb(usados)}
        </span>
      </header>

      <ul className="divide-y divide-gray-100">
        {lista.map((d) => (
          <FilaDocumento key={d.id} doc={d} requerido={esRequerido(d, registro)} />
        ))}
      </ul>

      {conEnvio && (
        <footer className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600">
            {enviadoRevision
              ? "Tu expediente está en revisión. Te avisaremos si hay observaciones."
              : listos < requeridos.length
                ? `Faltan ${requeridos.length - listos} documento(s) obligatorio(s).`
                : "Todo listo para enviar a revisión."}
          </p>
          <button
            type="button"
            disabled={listos < requeridos.length || enviadoRevision}
            onClick={enviarRevision}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {enviadoRevision ? <CheckCircle2 size={16} /> : <Send size={16} />}
            {enviadoRevision ? "Enviado a revisión" : "Enviar expediente a revisión"}
          </button>
        </footer>
      )}
    </section>
  );
}

function FilaDocumento({ doc, requerido }: { doc: Documento; requerido: boolean }) {
  const { documentos, guardarDocumento } = useExpediente();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const archivo = documentos[doc.id];
  const maxMB = Math.min(doc.maxMB, useConvocatoria().config.limiteMB);
  const rev = useRevisionDocs()[doc.id];
  // Si volvió a subir el archivo después de la revisión, esa revisión ya no aplica
  const revision = rev && !(archivo && rev.el && archivo.fecha > rev.el && rev.estado !== "prorroga") ? rev : undefined;
  const acepta = doc.formatos === "pdf" ? "application/pdf" : "image/png,image/jpeg";

  async function onArchivo(file: File | undefined) {
    if (!file) return;
    setError("");
    const tipoOk = doc.formatos === "pdf" ? file.type === "application/pdf" : /^image\/(png|jpeg)$/.test(file.type);
    if (!tipoOk) return setError(doc.formatos === "pdf" ? "El archivo debe ser PDF." : "La imagen debe ser JPG o PNG.");
    if (file.size > maxMB * 1024 * 1024)
      return setError(`Archivo demasiado pesado (${kb(file.size)}). Máximo ${maxMB} MB.`);
    const cargado: ArchivoCargado = { nombre: file.name, bytes: file.size, fecha: new Date().toISOString() };
    if (doc.formatos === "imagen") cargado.dataUrl = await reducirImagen(file);
    guardarDocumento(doc.id, cargado);
    if (input.current) input.current.value = "";
  }

  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-gray-900">{doc.nombre}</p>
          {requerido ? (
            <span className="rounded bg-guinda-soft px-1.5 py-0.5 text-[11px] font-medium text-guinda">Obligatorio</span>
          ) : (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600">Si aplica</span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-gray-600">{doc.descripcion}</p>
        {doc.nota && (
          <p className="mt-1.5 flex gap-1.5 text-xs text-amber-800">
            <Info size={14} className="mt-px shrink-0" /> {doc.nota}
          </p>
        )}
        {archivo && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700">
            <Paperclip size={13} /> {archivo.nombre} · {kb(archivo.bytes)}
            {revision?.estado === "aprobado"
              ? " · Aprobado por Posgrado"
              : revision?.estado === "observado"
                ? ""
                : revision?.estado === "aval"
                  ? " · UTEyCV la envió a la DFLE para su aval"
                  : doc.id === "ingles"
                    ? " · En revisión (aval DFLE, salvo CELEX/CENLEX)"
                    : " · En revisión"}
          </p>
        )}
        {revision?.estado === "observado" && (
          <p className="mt-1.5 rounded bg-orange-50 px-2 py-1 text-xs text-orange-800">
            Observación de Posgrado: {revision.observacion ?? "revisa el documento"}. Reemplázalo para que lo revisen de nuevo.
          </p>
        )}
        {revision?.estado === "prorroga" && revision.prorrogaHasta && !archivo && (
          <p className="mt-1.5 rounded bg-sky-50 px-2 py-1 text-xs text-sky-800">
            Posgrado te dio prórroga hasta el{" "}
            {new Date(`${revision.prorrogaHasta}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}. Puedes
            seguir con tu proceso y subirlo antes de esa fecha.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-2 text-xs text-red-600">
            {error}
          </p>
        )}
        <p className="mt-1 text-[11px] text-gray-400">{doc.fuente}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {archivo?.dataUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- vista previa local (data URL)
          <img src={archivo.dataUrl} alt="Vista previa" className="h-14 w-11 rounded border border-gray-200 object-cover" />
        )}
        <input ref={input} type="file" accept={acepta} className="hidden" onChange={(e) => onArchivo(e.target.files?.[0])} />
        <button
          type="button"
          onClick={() => input.current?.click()}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
            archivo ? "border border-gray-300 text-gray-700 hover:bg-gray-50" : "bg-primary text-white hover:bg-primary-hover"
          }`}
        >
          <FileUp size={15} /> {archivo ? "Reemplazar" : "Subir"}
        </button>
        {archivo && (
          <button
            type="button"
            onClick={() => guardarDocumento(doc.id, null)}
            aria-label={`Quitar ${doc.nombre}`}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-red-600"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </li>
  );
}
