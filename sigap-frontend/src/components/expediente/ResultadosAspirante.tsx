"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BookOpen, CheckCircle2, Clock, FileQuestion, Info, RotateCcw, Wand2, XCircle } from "lucide-react";
import { useConfigEvaluacion, fechaLargaIso } from "@/lib/evaluacion-config";
import { AREAS_EVAL, areasReprobadas, nombreArea, type AreaEvalId, type ResultadoArea, type ResultadoEval } from "@/lib/posgrado/datos";
import { simularCambioPosgrado, useEstadoAdmision } from "@/lib/posgrado/revision";
import { useExpediente } from "./ExpedienteProvider";
import { RecordatoriosExamen } from "./Recordatorios";

const ID = "ASP-2026-001";
const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

/**
 * Fase 5 · Publicación de resultados (RF-16, RF-17, RN-08). Dos secciones independientes:
 * resultados del curso propedéutico y resultados del examen de admisión.
 * El aspirante solo ve lo que Posgrado ya publicó; si no acreditó una o las dos áreas del propedéutico,
 * decide aquí si presenta el examen de esas áreas.
 */
export function ResultadosAspirante() {
  const v = useEstadoAdmision();
  const { evaluacion, guardarEvaluacion, cargado } = useExpediente();
  const { modalidades, config } = useConfigEvaluacion();
  if (!cargado) return null;

  const pro = v.evaluacion.propedeutico?.publicadoEl ? v.evaluacion.propedeutico : undefined;
  const exa = v.evaluacion.examen?.publicadoEl ? v.evaluacion.examen : undefined;
  const so = evaluacion.segundaOportunidad;
  const reprobadas = areasReprobadas(pro);
  const modalidad = evaluacion.modalidad;
  const conExamen = modalidad === "examen" || so?.decision === "examen";

  return (
    <div className="space-y-6">
      {!modalidad && (
        <section className="rounded-xl border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-600">
          Primero elige tu modalidad en{" "}
          <Link href="/aspirante/evaluacion" className="font-medium text-primary underline">
            4 · Evaluación
          </Link>
          . Aquí aparecerán tus resultados cuando el Departamento de Posgrado los publique.
        </section>
      )}

      {/* Sección A · Curso propedéutico */}
      {modalidad === "propedeutico" && (
        <Seccion
          icono={BookOpen}
          titulo="Resultados del curso propedéutico"
          publicacion={`Se publican al terminar los cursos (${modalidades.propedeutico.fechas}).`}
          resultado={pro}
        >
          {pro && pro.acreditado && <Acreditado />}
          {pro && !pro.acreditado && !so && (
            <DecidirExamen
              areas={reprobadas}
              fechaExamen={`${fechaLargaIso(config.examen.fecha)}, ${config.examen.hora} h, ${config.examen.lugar}`}
              onDecidir={(decision) => guardarEvaluacion({ segundaOportunidad: { decision, areas: reprobadas, el: new Date().toISOString() } })}
            />
          )}
          {so?.decision === "examen" && (
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-indigo-50 px-3 py-2.5 text-sm text-navy-800">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              Elegiste presentar el examen de {so.areas.map(nombreArea).join(" y ")} el {fechaLargaIso(config.examen.fecha)} a las {config.examen.hora} h. Tus resultados aparecerán abajo.
            </p>
          )}
          {so?.decision === "no" && (
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-gray-100 px-3 py-2.5 text-sm text-gray-700">
              <Info size={16} className="mt-0.5 shrink-0" />
              Decidiste no presentar el examen. Tu proceso de admisión en esta convocatoria concluye; te invitamos a participar en la próxima.
            </p>
          )}
        </Seccion>
      )}

      {/* Sección B · Examen de admisión */}
      {conExamen && (
        <Seccion
          icono={FileQuestion}
          titulo={so?.decision === "examen" ? "Resultados del examen de áreas no acreditadas" : "Resultados del examen de admisión"}
          publicacion={`Examen: ${fechaLargaIso(config.examen.fecha)}, ${config.examen.hora} h, ${config.examen.lugar}. Los resultados se publican después del examen.`}
          resultado={exa}
        >
          {exa && exa.acreditado && <Acreditado />}
          {exa && !exa.acreditado && (
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-gray-100 px-3 py-2.5 text-sm text-gray-700">
              <Info size={16} className="mt-0.5 shrink-0" />
              Tu proceso de admisión en esta convocatoria concluye. Te invitamos a participar en la próxima (RN-08).
            </p>
          )}
        </Seccion>
      )}
      {conExamen && !exa && <RecordatoriosExamen />}

      {modalidad && <Simular pro={v.evaluacion.propedeutico} exa={v.evaluacion.examen} modalidad={modalidad} areasExamen={so?.decision === "examen" ? so.areas : undefined} reiniciar={() => guardarEvaluacion({ segundaOportunidad: undefined })} />}
    </div>
  );
}

function Seccion({
  icono: Icono,
  titulo,
  publicacion,
  resultado,
  children,
}: {
  icono: typeof BookOpen;
  titulo: string;
  publicacion: string;
  resultado?: ResultadoEval;
  children?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold text-gray-900">
          <Icono size={18} className="text-primary" /> {titulo}
        </h2>
        {resultado ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs text-emerald-700">Publicado el {fecha(resultado.publicadoEl!)}</span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
            <Clock size={12} /> Aún no se publican
          </span>
        )}
      </div>
      {!resultado ? (
        <p className="mt-2 text-sm text-gray-600">{publicacion} Te avisaremos por correo y en tus notificaciones.</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {(resultado.areas
            ? (Object.entries(resultado.areas) as [AreaEvalId, ResultadoArea][])
            : AREAS_EVAL.map((a) => [a.id, { calificacion: resultado.calificacion, acreditado: resultado.acreditado }] as [AreaEvalId, ResultadoArea])
          ).map(([id, r]) => (
            <li key={id} className={`rounded-lg border p-4 ${r.acreditado ? "border-emerald-200 bg-emerald-50/60" : "border-red-200 bg-red-50/60"}`}>
              <p className="text-sm text-gray-700">{nombreArea(id)}</p>
              <p className={`mt-1 flex items-center gap-1.5 font-semibold ${r.acreditado ? "text-emerald-700" : "text-red-700"}`}>
                {r.acreditado ? <CheckCircle2 size={16} /> : <XCircle size={16} />} {r.acreditado ? "Acreditada" : "No acreditada"}
              </p>
            </li>
          ))}
        </ul>
      )}
      {children}
    </section>
  );
}

function Acreditado() {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      <span className="flex items-center gap-2">
        <CheckCircle2 size={16} /> ¡Acreditaste tu evaluación! Tu resultado pasa a la Comisión de Admisión del Colegio de Profesores.
      </span>
      <Link href="/aspirante/dictamen" className="inline-flex items-center gap-1 font-medium underline">
        6 · Dictamen final <ArrowRight size={14} />
      </Link>
    </div>
  );
}

/** Pestaña para decidir si presenta el examen de las áreas que no acreditó en el propedéutico (RN-08). */
function DecidirExamen({ areas, fechaExamen, onDecidir }: { areas: AreaEvalId[]; fechaExamen: string; onDecidir: (d: "examen" | "no") => void }) {
  const [confirmarNo, setConfirmarNo] = useState(false);
  return (
    <div className="mt-5 rounded-xl border-2 border-amber-300 bg-amber-50/60 p-5">
      <p className="font-semibold text-gray-900">¿Quieres presentar el examen de admisión de {areas.length > 1 ? "las áreas" : "el área"} que no acreditaste?</p>
      <ul className="mt-2 list-disc pl-5 text-sm text-gray-700">
        {areas.map((a) => (
          <li key={a}>{nombreArea(a)}</li>
        ))}
      </ul>
      <p className="mt-2 text-sm text-gray-700">Examen: {fechaExamen}. Solo presentas {areas.length > 1 ? "esas áreas" : "esa área"}; si lo acreditas, continúas tu proceso.</p>
      {!confirmarNo ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => onDecidir("examen")} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover">
            Sí, quiero presentar el examen
          </button>
          <button type="button" onClick={() => setConfirmarNo(true)} className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            No, gracias
          </button>
        </div>
      ) : (
        <div className="mt-4 rounded-lg bg-white p-3 text-sm">
          <p className="text-gray-800">Si no presentas el examen, tu proceso de admisión en esta convocatoria concluye. ¿Confirmas?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => onDecidir("no")} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
              Sí, no presentaré el examen
            </button>
            <button type="button" onClick={() => setConfirmarNo(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Regresar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Solo cascarón: simula lo que publica el Departamento de Posgrado. */
function Simular({
  pro,
  exa,
  modalidad,
  areasExamen,
  reiniciar,
}: {
  pro?: ResultadoEval;
  exa?: ResultadoEval;
  modalidad: "propedeutico" | "examen";
  areasExamen?: AreaEvalId[];
  reiniciar: () => void;
}) {
  const hoy = () => new Date().toISOString();
  const resultado = (cal: Partial<Record<AreaEvalId, number>>): ResultadoEval => {
    const areas = Object.fromEntries(Object.entries(cal).map(([k, n]) => [k, { calificacion: n!, acreditado: n! >= 8 }])) as ResultadoEval["areas"];
    const ns = Object.values(cal) as number[];
    return { calificacion: Math.round((ns.reduce((t, n) => t + n, 0) / ns.length) * 10) / 10, acreditado: ns.every((n) => n >= 8), registradoEl: hoy(), publicadoEl: hoy(), areas };
  };
  const publicar = (tipo: "propedeutico" | "examen", r: ResultadoEval) =>
    simularCambioPosgrado(ID, { evaluacion: { [tipo]: r }, ...(r.acreditado ? { etapa: "dictamen" } : tipo === "examen" ? { concluido: "No acreditó la evaluación (RN-08)" } : {}) }, {
      asunto: tipo === "propedeutico" ? "Resultados del curso propedéutico" : "Resultados del examen de admisión",
      mensaje: `Ya se publicaron tus resultados en SIGAP (5 · Resultados).`,
    });
  const btn = "inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50";
  const areasEx = areasExamen ?? AREAS_EVAL.map((a) => a.id);
  return (
    <div className="border-t border-dashed border-gray-300 pt-4">
      <p className="text-xs text-gray-500">Vista de prueba (solo cascarón) — simula lo que publica el Departamento de Posgrado:</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {modalidad === "propedeutico" && !pro && (
          <>
            <button type="button" className={btn} onClick={() => publicar("propedeutico", resultado({ matematicas: 9, programacion: 8.6 }))}>
              <Wand2 size={12} /> Propedéutico: acreditó todo
            </button>
            <button type="button" className={btn} onClick={() => publicar("propedeutico", resultado({ matematicas: 8.8, programacion: 6.5 }))}>
              <Wand2 size={12} /> Propedéutico: no acreditó Programación
            </button>
            <button type="button" className={btn} onClick={() => publicar("propedeutico", resultado({ matematicas: 6.9, programacion: 7.1 }))}>
              <Wand2 size={12} /> Propedéutico: no acreditó ninguna
            </button>
          </>
        )}
        {(modalidad === "examen" || areasExamen) && !exa && (
          <>
            <button type="button" className={btn} onClick={() => publicar("examen", resultado(Object.fromEntries(areasEx.map((a) => [a, 8.7]))))}>
              <Wand2 size={12} /> Examen: acreditado
            </button>
            <button type="button" className={btn} onClick={() => publicar("examen", resultado(Object.fromEntries(areasEx.map((a) => [a, 6.8]))))}>
              <Wand2 size={12} /> Examen: no acreditado
            </button>
          </>
        )}
        {(pro || exa) && (
          <button
            type="button"
            className={btn}
            onClick={() => {
              simularCambioPosgrado(ID, { evaluacion: { propedeutico: undefined, examen: undefined, segundaOportunidad: undefined }, etapa: "evaluacion", concluido: undefined });
              reiniciar();
            }}
          >
            <RotateCcw size={12} /> Reiniciar resultados
          </button>
        )}
      </div>
    </div>
  );
}
