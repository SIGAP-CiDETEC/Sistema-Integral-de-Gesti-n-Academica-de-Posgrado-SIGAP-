"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Download, FileUp, Info, Loader2, Lock, MessageSquareWarning } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ArchivoServidor } from "@/components/ArchivoServidor";
import { Aviso, Tarjeta, botonPrimario, botonSecundario } from "@/components/posgrado/ui";
import { api } from "@/lib/api";
import { mensajeDe, notificar } from "@/lib/avisos-ui";
import { DOCUMENTOS } from "@/lib/documentos";
import { formatoPorClave } from "@/lib/formatos";
import { recargarPortal } from "@/lib/portal";
import type { Respuestas } from "@/lib/registro-form";
import { Cargando, fechaHoraCorta } from "./PortalComun";

type Estado = "falta" | "revision" | "aprobado" | "observado" | "prorroga";
type Doc = {
  clave: string;
  nombre: string;
  obligatorio: boolean;
  estado: Estado;
  archivo: string | null;
  subidoEl: string | null;
  observacion: string | null;
  prorrogaHasta: string | null;
  puedeSubir: boolean;
};
type Respuesta = { enLinea: boolean; limiteMB: number; documentos: Doc[] };

const ETIQUETA: Record<Estado, { texto: string; tono: string; icono: typeof Clock }> = {
  falta: { texto: "Falta", tono: "bg-gray-100 text-gray-700", icono: FileUp },
  revision: { texto: "En revisión", tono: "bg-sky-50 text-sky-800", icono: Clock },
  aprobado: { texto: "Aprobado", tono: "bg-emerald-50 text-emerald-700", icono: CheckCircle2 },
  observado: { texto: "Con observaciones", tono: "bg-amber-50 text-amber-800", icono: MessageSquareWarning },
  prorroga: { texto: "Prórroga", tono: "bg-violet-50 text-violet-800", icono: Clock },
};
/** Clave del servidor → documento del front (descripción e indicaciones). */
const DEL_FRONT: Record<string, string> = { acta: "acta-nacimiento" };
const descripcion = (clave: string) => DOCUMENTOS.find((d) => d.id === (DEL_FRONT[clave] ?? clave));
const fechaDia = (f: string) => f.split("-").reverse().join("/");

/**
 * 2 · Documentos (servidor real). El aspirante sube en PDF los documentos que le faltan, los que tienen observaciones
 * del Departamento de Posgrado o los que están en prórroga. Lo que ya envió (en revisión) o ya se aprobó queda
 * bloqueado. Puede seguir con su proceso aunque le falten documentos.
 */
export function DocumentosServidor() {
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<Respuesta>("/portal/documentos")
      .then(setDatos)
      .catch((e) => setError(mensajeDe(e)));
  }, []);
  if (!datos) return <Cargando error={error} />;

  const docs = datos.documentos.filter((d) => d.clave !== "sip-02");
  const sip02 = datos.documentos.find((d) => d.clave === "sip-02");
  const pendientes = datos.documentos.filter((d) => d.obligatorio && ["falta", "observado", "prorroga"].includes(d.estado));
  const actualizar = (r: Respuesta) => {
    setDatos(r);
    void recargarPortal();
  };

  return (
    <>
      <PageHeader titulo="Documentos" subtitulo="Sube tus documentos oficiales escaneados para que el Departamento de Posgrado los revise" />

      <div className="mb-5 space-y-3">
        {pendientes.length ? (
          <Aviso tono="alerta" titulo={`Te ${pendientes.length === 1 ? "falta 1 documento" : `faltan ${pendientes.length} documentos`} por entregar o corregir`}>
            Puedes continuar con tu proceso de admisión aunque te falten documentos, pero todos son necesarios para tu inscripción.
          </Aviso>
        ) : (
          <Aviso tono="exito" titulo="Ya entregaste todos tus documentos obligatorios">
            El Departamento de Posgrado los revisa; si alguno tiene observaciones, aquí verás qué corregir y podrás volver a subirlo.
          </Aviso>
        )}
        <p className="flex items-start gap-2 text-xs text-gray-500">
          <Info size={14} className="mt-0.5 shrink-0" />
          Cada documento en un solo PDF de máximo {datos.limiteMB} MB. Una vez enviado ya no se puede cambiar, salvo que el Departamento de Posgrado te haga
          observaciones o te dé prórroga.
        </p>
      </div>

      {sip02 && <Sip02 doc={sip02} limiteMB={datos.limiteMB} onSubido={actualizar} />}

      <Tarjeta titulo="Documentos escaneados">
        <ul className="divide-y divide-gray-100">
          {docs.map((d) => (
            <FilaDocumento key={d.clave} doc={d} limiteMB={datos.limiteMB} onSubido={actualizar} />
          ))}
        </ul>
      </Tarjeta>
    </>
  );
}

function EtiquetaEstado({ e }: { e: Estado }) {
  const { texto, tono, icono: Icono } = ETIQUETA[e];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${tono}`}>
      <Icono size={12} /> {texto}
    </span>
  );
}

function FilaDocumento({ doc, limiteMB, onSubido }: { doc: Doc; limiteMB: number; onSubido: (r: Respuesta) => void }) {
  const info = descripcion(doc.clave);
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900">
            {doc.nombre} {!doc.obligatorio && <span className="text-xs font-normal text-gray-500">(si aplica)</span>}
          </p>
          {info && <p className="mt-0.5 text-sm text-gray-600">{info.descripcion}</p>}
          {info?.nota && doc.estado === "falta" && <p className="mt-1 text-xs text-gray-500">{info.nota}</p>}
        </div>
        <EtiquetaEstado e={doc.estado} />
      </div>
      <Detalle doc={doc} limiteMB={limiteMB} onSubido={onSubido} />
    </li>
  );
}

/** Observación, prórroga, archivo enviado y botón para subir (si se puede). */
function Detalle({ doc, limiteMB, onSubido }: { doc: Doc; limiteMB: number; onSubido: (r: Respuesta) => void }) {
  return (
    <div className="mt-2 space-y-2">
      {doc.estado === "observado" && doc.observacion && (
        <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            <strong>Observación de Posgrado:</strong> {doc.observacion}
          </span>
        </p>
      )}
      {doc.estado === "prorroga" && (
        <p className="rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-900">
          Tienes prórroga{doc.prorrogaHasta ? ` hasta el ${fechaDia(doc.prorrogaHasta)}` : ""} para entregarlo.{doc.observacion ? ` ${doc.observacion}` : ""}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {doc.archivo && <ArchivoServidor ruta={`/portal/documentos/${doc.clave}`} texto={doc.estado === "observado" ? "Ver el que enviaste" : "Ver mi documento"} />}
        {doc.archivo && doc.subidoEl && <span className="text-xs text-gray-500">{doc.archivo} · {fechaHoraCorta(doc.subidoEl)}</span>}
        {doc.puedeSubir ? (
          <Subir clave={doc.clave} limiteMB={limiteMB} texto={doc.archivo ? "Subir corregido" : "Subir PDF"} onSubido={onSubido} />
        ) : (
          doc.estado === "revision" && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <Lock size={12} /> En revisión: podrás cambiarlo solo si te hacen observaciones
            </span>
          )
        )}
      </div>
    </div>
  );
}

function Subir({ clave, limiteMB, texto, onSubido }: { clave: string; limiteMB: number; texto: string; onSubido: (r: Respuesta) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");

  const elegir = (f: File | undefined) => {
    setError("");
    if (!f) return;
    if (f.type !== "application/pdf" && !/\.pdf$/i.test(f.name)) return setError("El documento debe ser un PDF.");
    if (f.size > limiteMB * 1024 * 1024) return setError(`El archivo pesa más de ${limiteMB} MB. Redúcelo e inténtalo de nuevo.`);
    setArchivo(f);
  };
  const enviar = async () => {
    if (!archivo) return;
    setSubiendo(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("archivo", archivo, archivo.name);
      onSubido(await api<Respuesta>(`/portal/documentos/${clave}`, { formulario: fd }));
      notificar("Documento enviado. El Departamento de Posgrado lo revisará.", "exito");
      setArchivo(null);
    } catch (e) {
      setError(mensajeDe(e));
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => elegir(e.target.files?.[0] ?? undefined)} />
      {!archivo ? (
        <button type="button" onClick={() => input.current?.click()} className={botonSecundario}>
          <FileUp size={15} /> {texto}
        </button>
      ) : (
        <>
          <span className="max-w-[16rem] truncate text-sm text-gray-700">{archivo.name}</span>
          <button type="button" disabled={subiendo} onClick={enviar} className={botonPrimario}>
            {subiendo ? <Loader2 size={15} className="animate-spin" /> : <FileUp size={15} />} Enviar a revisión
          </button>
          <button
            type="button"
            disabled={subiendo}
            onClick={() => {
              setArchivo(null);
              if (input.current) input.current.value = "";
            }}
            className="text-sm text-gray-600 underline"
          >
            Cancelar
          </button>
          <span className="w-full text-xs text-gray-500">Revisa que sea el archivo correcto: una vez enviado ya no podrás cambiarlo.</span>
        </>
      )}
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </div>
  );
}

/** Quien se registró en línea: descarga su SIP-02 ya llenado con su registro, lo firma y lo sube escaneado. */
function Sip02({ doc, limiteMB, onSubido }: { doc: Doc; limiteMB: number; onSubido: (r: Respuesta) => void }) {
  const [generando, setGenerando] = useState(false);
  const descargar = async () => {
    setGenerando(true);
    try {
      const reg = await api<{ idTemporal: string; respuestas: Respuestas | null }>("/portal/registro");
      const f = formatoPorClave("sip-02");
      if (!f || !reg.respuestas) throw new Error("No se encontró tu registro");
      const { generarBytesFormato } = await import("@/lib/pdf/cliente");
      const bytes = await generarBytesFormato(f, { r: reg.respuestas, c: {}, hoy: new Date() });
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `SIP-02_${reg.idTemporal}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      notificar(mensajeDe(e));
    } finally {
      setGenerando(false);
    }
  };
  return (
    <Tarjeta titulo="Currículum vitae (SIP-02)" className="mb-5" accion={<EtiquetaEstado e={doc.estado} />}>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700">
        <li>Descarga tu SIP-02: ya viene llenado con lo que capturaste en tu registro.</li>
        <li>Revísalo, imprímelo y fírmalo.</li>
        <li>Escanéalo en un solo PDF y súbelo aquí.</li>
      </ol>
      {doc.puedeSubir && (
        <button type="button" onClick={descargar} disabled={generando} className={`${botonSecundario} mt-3`}>
          {generando ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Descargar mi SIP-02 llenado
        </button>
      )}
      <Detalle doc={doc} limiteMB={limiteMB} onSubido={onSubido} />
    </Tarjeta>
  );
}
