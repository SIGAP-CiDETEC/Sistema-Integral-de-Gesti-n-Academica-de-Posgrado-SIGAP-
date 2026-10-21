"use client";

import { useState } from "react";
import { CheckCircle2, Download, FileSignature, Loader2, Mail, Paperclip, Upload } from "lucide-react";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Etiqueta } from "@/components/posgrado/ui";
import { CLAVE_CURSO, TONO_SIP12, estadoSip12, nombreDocente, type GrupoSip12 } from "@/lib/actas-sip12";
import { descargarSip12 } from "@/lib/pdf/sip12";
import { useConvocatoria } from "@/lib/convocatoria";
import { fechaCorta } from "@/lib/posgrado/datos";

/**
 * Actas SIP-12 de los cursos propedéuticos.
 * - Docente: descarga el acta de su grupo (con las calificaciones), la firma y la sube; recibe un correo de confirmación.
 * - Coordinador del programa: descarga el acta que subió el docente, la firma y sube la versión con su firma.
 * - Consulta (Jefatura de Posgrado): solo ve en qué va cada acta y la descarga.
 */
export function ActasSip12({ grupos, modo, docente }: { grupos: GrupoSip12[]; modo: "docente" | "coordinador" | "consulta"; docente?: { nombre: string; correo: string } }) {
  if (!grupos.length) return <p className="text-sm text-gray-500">No hay grupos del propedéutico.</p>;
  return (
    <ul className="divide-y divide-gray-100">
      {grupos.map((g) => (
        <FilaActa key={g.clave} g={g} modo={modo} docente={docente} />
      ))}
    </ul>
  );
}

function FilaActa({ g, modo, docente }: { g: GrupoSip12; modo: "docente" | "coordinador" | "consulta"; docente?: { nombre: string; correo: string } }) {
  const { actasSip12, subirSip12Docente, subirSip12Coordinador } = usePosgrado();
  const limiteMB = useConvocatoria().limiteMB;
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");
  const acta = actasSip12[g.clave];
  const estado = estadoSip12(g, acta);
  const curso = `${g.nombreCurso} · grupo ${g.grupo}`;
  const capturadas = g.filas.filter((f) => f.calificacion !== undefined).length;

  const puedeSubir = modo === "docente" ? g.completa && !acta?.docente : modo === "coordinador" && !!acta?.docente && !acta.coordinador;
  const subir = (file?: File) => {
    if (!file) return;
    setError("");
    if (file.type !== "application/pdf") return setError("Sube el acta escaneada en PDF.");
    if (file.size > limiteMB * 1024 * 1024) return setError(`El archivo excede ${limiteMB} MB.`);
    const ok = modo === "docente" ? subirSip12Docente(g.clave, curso, file.name, docente ?? { nombre: nombreDocente(g), correo: "" }) : subirSip12Coordinador(g.clave, curso, file.name);
    if (!ok) setError("El acta ya se había subido.");
  };
  const descargar = async () => {
    setGenerando(true);
    try {
      await descargarSip12(g);
    } finally {
      setGenerando(false);
    }
  };

  return (
    <li className="flex flex-col gap-3 py-4 lg:flex-row lg:items-start lg:justify-between" data-sip12={g.clave}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-gray-900">{curso}</p>
          <Etiqueta tono={TONO_SIP12[estado]}>{estado}</Etiqueta>
        </div>
        <p className="text-xs text-gray-500">
          Clave {CLAVE_CURSO[g.materia]}
          {modo !== "docente" && ` · ${nombreDocente(g)}`} · {g.filas.length} aspirante(s) · {capturadas} calificación(es) capturada(s)
        </p>
        {acta?.docente && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-700">
            <Paperclip size={12} /> Firmada por el docente: {acta.docente.archivo} · {fechaCorta(acta.docente.el)}
          </p>
        )}
        {modo === "docente" && acta?.docente?.correo && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-700" data-correo-sip12>
            <Mail size={12} /> Te enviamos un correo de confirmación a {acta.docente.correo}.
          </p>
        )}
        {acta?.coordinador && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-700">
            <CheckCircle2 size={12} /> Firmada por el Coordinador del programa: {acta.coordinador.archivo} · {fechaCorta(acta.coordinador.el)}
          </p>
        )}
        {modo === "docente" && !g.completa && <p className="mt-1 text-xs text-gray-500">Podrás descargar el acta cuando captures la calificación de todo el grupo.</p>}
        {modo === "coordinador" && !acta?.docente && <p className="mt-1 text-xs text-gray-500">Se habilita cuando el docente suba el acta firmada.</p>}
        {error && (
          <p role="alert" className="mt-1 text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={descargar}
          disabled={!g.filas.length || generando || (modo === "docente" && !g.completa)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50 disabled:opacity-50"
        >
          {generando ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Descargar SIP-12 (PDF)
        </button>
        {puedeSubir ? (
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover">
            {modo === "docente" ? <Upload size={14} /> : <FileSignature size={14} />}
            {modo === "docente" ? "Subir acta firmada" : "Subir acta con mi firma"}
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              aria-label={`${modo === "docente" ? "Subir acta firmada" : "Subir acta con firma del Coordinador"} de ${curso}`}
              onChange={(e) => {
                subir(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        ) : null}
      </div>
    </li>
  );
}
