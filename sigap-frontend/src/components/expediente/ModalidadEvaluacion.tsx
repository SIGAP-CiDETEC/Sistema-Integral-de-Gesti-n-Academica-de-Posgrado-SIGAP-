"use client";

import { AlertTriangle, BookOpen, CalendarDays, CheckCircle2, FileQuestion, Info, Lock, Mail, RotateCcw } from "lucide-react";
import { CORREO_POSGRADO } from "@/lib/config";
import { DIAS, choques, describirGrupo, type Grupo, type Materia, type ModalidadId } from "@/lib/evaluacion";
import { useConfigEvaluacion } from "@/lib/evaluacion-config";
import { useExpediente } from "./ExpedienteProvider";

const ICONO: Record<ModalidadId, typeof BookOpen> = { propedeutico: BookOpen, examen: FileQuestion };

/**
 * Fase 4 · Evaluación (RF-15, RF-17, RN-08).
 * Sustituye los Forms de "Elección de cursos propedéuticos o examen" y "Registro de cursos propedéuticos".
 * Al confirmar, con backend se envía correo (BullMQ) y aviso en el portal (Socket.io).
 * Una vez confirmada, el aspirante ya no la puede cambiar: lo hace el Departamento de Posgrado desde su sesión.
 */
export function ModalidadEvaluacion() {
  const { evaluacion, guardarEvaluacion, registro } = useExpediente();
  // Fechas y horarios vigentes (Posgrado los puede editar)
  const { modalidades: MODALIDADES, materias: MATERIAS } = useConfigEvaluacion();
  const { modalidad, grupos, confirmadaEl } = evaluacion;
  const confirmada = !!confirmadaEl;

  // Grupo elegido por materia (las de horario único se asignan solas)
  const grupoDe = (materiaId: string) => {
    const m = MATERIAS.find((x) => x.id === materiaId)!;
    return m.grupos.length === 1 ? m.grupos[0] : m.grupos.find((g) => g.id === grupos[materiaId]);
  };
  const elegidos = MATERIAS.flatMap((m) => {
    const g = grupoDe(m.id);
    return g ? [{ materia: m, grupo: g }] : [];
  });
  const cruces = modalidad === "propedeutico" ? choques(elegidos) : [];
  const faltanGrupos = modalidad === "propedeutico" && elegidos.length < MATERIAS.length;
  const puedeConfirmar = !!modalidad && !faltanGrupos && cruces.length === 0;

  const reiniciarDemo = () => guardarEvaluacion({ modalidad: undefined, grupos: {}, confirmadaEl: undefined });

  if (confirmada && modalidad) {
    return (
      <>
        <Resumen modalidad={modalidad} elegidos={elegidos} correo={String(registro.correo ?? "")} />
        <ReiniciarDemo onClick={reiniciarDemo} />
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Modalidad */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900">1. Elige la opción de tu preferencia</h2>
        <p className="mt-0.5 text-sm text-gray-500">No hay documentos que subir en esta fase.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {(Object.keys(MODALIDADES) as ModalidadId[]).map((id) => {
            const m = MODALIDADES[id];
            const Icono = ICONO[id];
            const activa = modalidad === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => guardarEvaluacion({ modalidad: id })}
                className={`rounded-xl border-2 p-5 text-left transition ${
                  activa ? "border-primary bg-indigo-50/60" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Icono size={22} className={activa ? "text-primary" : "text-gray-500"} />
                  {activa && <CheckCircle2 size={20} className="text-primary" />}
                </div>
                <p className="mt-3 font-semibold text-gray-900">{m.titulo}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-700">
                  <CalendarDays size={14} /> {m.fechas}
                </p>
                <p className="mt-0.5 text-sm text-gray-500">{m.detalle}</p>
                <p className="mt-3 text-xs text-gray-500">{m.segundaOportunidad}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Horarios (solo propedéutico) */}
      {modalidad === "propedeutico" && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-gray-900">2. Elige tu horario en cada curso</h2>
          <div className="mt-4 space-y-5">
            {MATERIAS.map((m) => (
              <fieldset key={m.id}>
                <legend className="mb-2 text-sm font-medium text-gray-900">
                  {m.nombre} {m.grupos.length > 1 && <span className="text-red-600">*</span>}
                </legend>
                {m.grupos.length === 1 ? (
                  <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                    {describirGrupo(m.grupos[0])} <span className="text-xs text-gray-500">· horario único</span>
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {m.grupos.map((g) => {
                      const activo = grupos[m.id] === g.id;
                      return (
                        <label
                          key={g.id}
                          className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${
                            activo ? "border-primary bg-indigo-50 text-primary" : "border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`grupo-${m.id}`}
                            checked={activo}
                            onChange={() => guardarEvaluacion({ grupos: { ...grupos, [m.id]: g.id } })}
                            className="mt-0.5 accent-[var(--color-primary)]"
                          />
                          <span>
                            <span className="block text-xs font-semibold">Grupo {g.id}</span>
                            {describirGrupo(g)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </fieldset>
            ))}
          </div>
          {cruces.length > 0 && (
            <div role="alert" className="mt-4 flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Tus horarios se cruzan</p>
                {cruces.map((c) => (
                  <p key={c}>{c}</p>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Confirmar */}
      {modalidad && (
        <section className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600">
            {faltanGrupos
              ? "Elige un grupo en cada curso para continuar."
              : cruces.length
                ? "Corrige los horarios que se cruzan."
                : "Revisa bien tu elección: una vez confirmada no podrás cambiarla desde aquí. Recibirás tus fechas y horarios por correo y en tus notificaciones."}
          </p>
          <button
            type="button"
            disabled={!puedeConfirmar}
            onClick={() => guardarEvaluacion({ confirmadaEl: new Date().toISOString() })}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Confirmar elección
          </button>
        </section>
      )}
      {(modalidad || Object.keys(grupos).length > 0) && <ReiniciarDemo onClick={reiniciarDemo} />}
    </div>
  );
}

/** Solo para el cascarón: borra la elección para volver a mostrar las opciones. */
function ReiniciarDemo({ onClick }: { onClick: () => void }) {
  return (
    <div className="mt-10 border-t border-dashed border-gray-300 pt-4">
      <p className="text-xs text-gray-500">Vista de prueba (solo cascarón) — en el sistema real el aspirante no puede hacer esto.</p>
      <button
        type="button"
        onClick={onClick}
        className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
      >
        <RotateCcw size={12} /> Reiniciar elección
      </button>
    </div>
  );
}

function Resumen({
  modalidad,
  elegidos,
  correo,
}: {
  modalidad: ModalidadId;
  elegidos: { materia: Materia; grupo: Grupo }[];
  correo: string;
}) {
  const m = useConfigEvaluacion().modalidades[modalidad];
  const porDia = DIAS.map((dia) => ({
    dia,
    clases: elegidos
      .flatMap(({ materia, grupo }) => grupo.sesiones.filter((s) => s.dia === dia).map((s) => ({ ...s, materia: materia.nombre })))
      .sort((a, b) => a.inicio.localeCompare(b.inicio)),
  })).filter((d) => d.clases.length);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-emerald-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
              <CheckCircle2 size={16} /> Elección confirmada
            </p>
            <h2 className="mt-1 text-lg font-semibold text-gray-900">{m.titulo}</h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-700">
              <CalendarDays size={14} /> {m.fechas} · {m.detalle}
            </p>
          </div>
        </div>

        {modalidad === "propedeutico" && (
          <div className="mt-5">
            <p className="text-sm font-semibold text-gray-900">Tu horario semanal</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {porDia.map((d) => (
                <div key={d.dia} className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-guinda">{d.dia}</p>
                  <ul className="mt-1.5 space-y-1.5 text-sm">
                    {d.clases.map((c) => (
                      <li key={c.materia + c.inicio}>
                        <span className="block text-xs text-gray-500">
                          {c.inicio} – {c.fin}
                        </span>
                        <span className="text-gray-900">{c.materia}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-5 flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2.5 text-sm text-navy-800">
          <Mail size={15} className="shrink-0" /> Te enviamos tus fechas{modalidad === "propedeutico" ? " y horarios" : ""}
          {correo ? ` a ${correo}` : " por correo"} y también aparecen en tus notificaciones.
        </p>
        <p className="mt-3 flex items-start gap-2 text-sm text-gray-600">
          <Lock size={15} className="mt-0.5 shrink-0 text-gray-400" />
          <span>
            ¿Necesitas cambiar tu modalidad o tu grupo? Escribe a{" "}
            <a href={`mailto:${CORREO_POSGRADO}?subject=Cambio de modalidad o grupo de evaluación`} className="font-medium text-primary underline">
              {CORREO_POSGRADO}
            </a>
            ; el Departamento de Posgrado hará el cambio y te llegará la confirmación.
          </span>
        </p>
      </section>

      <section className="flex gap-3 rounded-xl border border-gray-200 bg-white p-5 text-sm">
        <Info size={18} className="mt-0.5 shrink-0 text-primary" />
        <div>
          <p className="font-semibold text-gray-900">Resultado</p>
          <p className="mt-1 text-gray-600">
            Posgrado registrará tu resultado (aprobatorio o reprobatorio) al terminar. {m.segundaOportunidad}
          </p>
        </div>
      </section>
    </div>
  );
}
