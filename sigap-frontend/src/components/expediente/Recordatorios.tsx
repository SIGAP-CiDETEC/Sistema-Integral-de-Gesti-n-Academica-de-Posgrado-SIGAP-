"use client";

import { useState } from "react";
import { BellRing, CheckCircle2, Clock, Mail } from "lucide-react";
import { useConfigEvaluacion } from "@/lib/evaluacion-config";
import { nombreArea } from "@/lib/posgrado/datos";
import { useEstadoAdmision } from "@/lib/posgrado/revision";
import {
  fechaRecordatorio,
  recordatoriosEntrevista,
  recordatoriosExamen,
  useEnviado,
  type Recordatorio,
} from "@/lib/recordatorios";
import { useExpediente } from "./ExpedienteProvider";

/** Recordatorios automáticos del aspirante de este navegador (entrevista y examen). */
export function useRecordatoriosAspirante() {
  const { entrevista, resultadoEntrevista } = useEstadoAdmision();
  const { evaluacion, registro } = useExpediente();
  const { config } = useConfigEvaluacion();
  const nombre = String(registro.nombre ?? "aspirante");
  const entrevistaR = entrevista && !resultadoEntrevista ? recordatoriosEntrevista(entrevista, nombre) : [];
  const so = evaluacion.segundaOportunidad;
  const examenR =
    so?.decision === "examen"
      ? recordatoriosExamen(config.examen, so.el, nombre, so.areas.map(nombreArea).join(" y "))
      : evaluacion.modalidad === "examen" && evaluacion.confirmadaEl
        ? recordatoriosExamen(config.examen, evaluacion.confirmadaEl, nombre)
        : [];
  return { entrevista: entrevistaR, examen: examenR, todos: [...entrevistaR, ...examenR] };
}

/** Lista de recordatorios programados con su estado (enviado / programado). */
export function RecordatoriosProgramados({ lista, titulo }: { lista: Recordatorio[]; titulo: string }) {
  const { enviado } = useEnviado();
  const [todos, setTodos] = useState(false);
  if (!lista.length) return null;
  const visibles = todos ? lista : lista.slice(0, 4);
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="flex items-center gap-2 font-semibold text-gray-900">
        <BellRing size={17} className="text-primary" /> {titulo}
      </h2>
      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500">
        <Mail size={13} /> Te llegan por correo y aquí en tus notificaciones.
      </p>
      <ul className="mt-3 divide-y divide-gray-100 text-sm">
        {visibles.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="text-gray-800">{r.asunto}</span>
            <span className={`flex items-center gap-1.5 text-xs ${enviado(r) ? "text-emerald-700" : "text-gray-500"}`}>
              {enviado(r) ? <CheckCircle2 size={13} /> : <Clock size={13} />} {enviado(r) ? "Enviado" : "Programado"} · {fechaRecordatorio(r.cuando)}
            </span>
          </li>
        ))}
      </ul>
      {lista.length > 4 && (
        <button type="button" onClick={() => setTodos(!todos)} className="mt-1 text-xs font-medium text-primary hover:underline">
          {todos ? "Ver menos" : `Ver los ${lista.length} recordatorios`}
        </button>
      )}
    </section>
  );
}

export function RecordatoriosEntrevista() {
  const { entrevista } = useRecordatoriosAspirante();
  return <RecordatoriosProgramados lista={entrevista} titulo="Recordatorios de tu entrevista" />;
}

export function RecordatoriosExamen() {
  const { examen } = useRecordatoriosAspirante();
  return <RecordatoriosProgramados lista={examen} titulo="Recordatorios de tu examen" />;
}
