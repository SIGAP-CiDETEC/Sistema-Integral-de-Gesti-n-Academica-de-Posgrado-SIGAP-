"use client";

import { useState } from "react";
import { CheckCircle2, Paperclip, Send } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Tarjeta, botonPrimario, inputBase } from "@/components/posgrado/ui";
import { CORREO_POSGRADO, convocatoriaActual } from "@/lib/config";
import { useConfigEvaluacion } from "@/lib/evaluacion-config";
import { bandejaDe, fechaHora, type AspiranteP } from "@/lib/posgrado/datos";

const GRUPOS: { id: string; t: string; filtro: (a: AspiranteP) => boolean }[] = [
  { id: "todos", t: "Todos los aspirantes en proceso", filtro: (a) => !a.concluido },
  { id: "registro", t: "Registro incompleto", filtro: (a) => bandejaDe(a) === "Registro incompleto" },
  { id: "observaciones", t: "Con observaciones en documentos", filtro: (a) => bandejaDe(a) === "Con observaciones" },
  { id: "entrevista", t: "En entrevista", filtro: (a) => a.etapa === "entrevista" && !a.concluido },
  { id: "evaluacion", t: "En evaluación", filtro: (a) => a.etapa === "evaluacion" && !a.concluido },
];

type Mods = ReturnType<typeof useConfigEvaluacion>["modalidades"];
const plantillasDe = (MODALIDADES: Mods): Record<string, { t: string; asunto: string; cuerpo: string }> => ({
  instrucciones: {
    t: "Instrucciones para continuar (RF-50)",
    asunto: "Instrucciones para continuar tu proceso de admisión",
    cuerpo:
      "Estimado(a) aspirante:\n\nTe compartimos las instrucciones para continuar con tu proceso de admisión a la Maestría en Tecnología de Cómputo. Ingresa a SIGAP con tu ID temporal y revisa la fase en la que te encuentras.\n\nAtentamente,\nDepartamento de Posgrado · CIDETEC",
  },
  fechas: {
    t: "Fechas importantes (RF-51)",
    asunto: `Fechas importantes · ${convocatoriaActual.nombre}`,
    cuerpo: `Estimado(a) aspirante:\n\nTe recordamos las fechas del proceso:\n• Cursos propedéuticos: ${MODALIDADES.propedeutico.fechas}\n• Examen de admisión: ${MODALIDADES.examen.fechas}\n\nConsulta el instructivo adjunto.\n\nAtentamente,\nDepartamento de Posgrado · CIDETEC`,
  },
  idiomas: {
    t: "Requisitos de idiomas (RF-51)",
    asunto: "Requisito de inglés: constancia con aval DFLE o de CELEX/CENLEX",
    cuerpo:
      "Estimado(a) aspirante:\n\nTu constancia de inglés debe contar con el aval de la DFLE o haber sido emitida por CELEX o CENLEX. Si tu constancia es de otra institución, Control Escolar (UTEyCV) la enviará a la DFLE para su aval. Si aún no la tienes, solicita prórroga al Departamento de Posgrado para continuar con tu proceso.\n\nAtentamente,\nDepartamento de Posgrado · CIDETEC",
  },
  libre: { t: "Mensaje libre", asunto: "", cuerpo: "" },
});

/** Comunicaciones masivas con instructivos y fechas (RF-49 a RF-51, CU-DP-02). */
export default function Comunicados() {
  const { aspirantes, cargado, enviarComunicado, comunicados } = usePosgrado();
  const PLANTILLAS = plantillasDe(useConfigEvaluacion().modalidades);
  const [grupo, setGrupo] = useState("todos");
  const [plantilla, setPlantilla] = useState("instrucciones");
  const [asunto, setAsunto] = useState(PLANTILLAS.instrucciones.asunto);
  const [cuerpo, setCuerpo] = useState(PLANTILLAS.instrucciones.cuerpo);
  const [adjuntos, setAdjuntos] = useState<string[]>([]);
  const [enviado, setEnviado] = useState(false);
  if (!cargado) return null;

  const g = GRUPOS.find((x) => x.id === grupo)!;
  const destinatarios = aspirantes.filter(g.filtro);
  const listo = destinatarios.length > 0 && asunto.trim() && cuerpo.trim();

  return (
    <>
      <PageHeader titulo="Comunicados" subtitulo="Envío de instrucciones, instructivos y fechas a los aspirantes" />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Tarjeta titulo="Nuevo comunicado">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="font-medium text-gray-900">Destinatarios</span>
              <select value={grupo} onChange={(e) => setGrupo(e.target.value)} className={`${inputBase} mt-1`}>
                {GRUPOS.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.t} ({aspirantes.filter(x.filtro).length})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="font-medium text-gray-900">Plantilla</span>
              <select
                value={plantilla}
                onChange={(e) => {
                  setPlantilla(e.target.value);
                  setAsunto(PLANTILLAS[e.target.value].asunto);
                  setCuerpo(PLANTILLAS[e.target.value].cuerpo);
                }}
                className={`${inputBase} mt-1`}
              >
                {Object.entries(PLANTILLAS).map(([id, p]) => (
                  <option key={id} value={id}>
                    {p.t}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="mt-3 block text-sm">
            <span className="font-medium text-gray-900">Asunto</span>
            <input value={asunto} onChange={(e) => setAsunto(e.target.value)} className={`${inputBase} mt-1`} />
          </label>
          <label className="mt-3 block text-sm">
            <span className="font-medium text-gray-900">Mensaje</span>
            <textarea rows={9} value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} className={`${inputBase} mt-1 resize-y`} />
          </label>
          <label className="mt-3 block text-sm">
            <span className="font-medium text-gray-900">Adjuntos (instructivos)</span>
            <input
              type="file"
              multiple
              accept="application/pdf"
              onChange={(e) => setAdjuntos(Array.from(e.target.files ?? []).map((f) => f.name))}
              className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-primary"
            />
          </label>
          {adjuntos.length > 0 && (
            <p className="mt-1 flex flex-wrap gap-2 text-xs text-gray-600">
              {adjuntos.map((n) => (
                <span key={n} className="flex items-center gap-1">
                  <Paperclip size={12} /> {n}
                </span>
              ))}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-gray-500">
              Se envía desde {CORREO_POSGRADO} y también aparece en las notificaciones de cada aspirante.
            </p>
            <button
              type="button"
              className={botonPrimario}
              disabled={!listo}
              onClick={() => {
                enviarComunicado({ asunto: asunto.trim(), cuerpo, destinatarios: destinatarios.map((a) => a.id), grupo: g.t, adjuntos });
                setEnviado(true);
              }}
            >
              <Send size={15} /> Enviar a {destinatarios.length}
            </button>
          </div>
          {enviado && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-emerald-700">
              <CheckCircle2 size={15} /> Comunicado enviado (simulado).
            </p>
          )}
        </Tarjeta>

        <div className="space-y-6">
          <Tarjeta titulo={`Destinatarios (${destinatarios.length})`}>
            <ul className="max-h-64 space-y-1.5 overflow-y-auto text-sm">
              {destinatarios.map((a) => (
                <li key={a.id}>
                  <span className="text-gray-900">{a.nombre}</span>
                  <span className="block text-xs text-gray-500">{a.correo}</span>
                </li>
              ))}
            </ul>
          </Tarjeta>
          <Tarjeta titulo="Enviados">
            {comunicados.length ? (
              <ul className="space-y-3 text-sm">
                {comunicados.map((c) => (
                  <li key={c.id}>
                    <p className="font-medium text-gray-900">{c.asunto}</p>
                    <p className="text-xs text-gray-500">
                      {fechaHora(c.fecha)} · {c.usuario} · {c.destinatarios.length} destinatario(s) · {c.grupo}
                      {c.adjuntos.length ? ` · ${c.adjuntos.length} adjunto(s)` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Aún no se envían comunicados.</p>
            )}
          </Tarjeta>
        </div>
      </div>
    </>
  );
}
