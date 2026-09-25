"use client";

import { useState } from "react";
import { CheckCircle2, Lock, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Aviso, Etiqueta, Tarjeta, botonPrimario, botonSecundario, inputBase } from "@/components/admin/ui";
import { PROGRAMA } from "@/lib/config";
import { CONVOCATORIA_DEFECTO, guardarConvocatoria, useConvocatoria, type ConfigConvocatoria } from "@/lib/convocatoria";
import { registrarEventoAdmin } from "@/lib/admin/accesos";
import { useSesion } from "@/lib/sesion";

const fh = (iso: string) => new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Configuración de la convocatoria de admisión (RF-81, US-AD-03). */
export default function ConfiguracionConvocatoria() {
  const { config, cargada } = useConvocatoria();
  const { sesion } = useSesion();
  const [borrador, setBorrador] = useState<ConfigConvocatoria | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [guardado, setGuardado] = useState("");
  if (!cargada) return null;
  const b = borrador ?? config;
  const set = (patch: Partial<ConfigConvocatoria>) => {
    setBorrador({ ...b, ...patch });
    setGuardado("");
  };

  const cambios: string[] = [];
  if (b.nombre !== config.nombre) cambios.push(`Nombre: ${b.nombre}`);
  if (b.inicio !== config.inicio || b.cierre !== config.cierre) cambios.push(`Periodo de registro: ${b.inicio} a ${b.cierre}`);
  if (b.activa !== config.activa) cambios.push(b.activa ? "Convocatoria ACTIVADA (se abre el registro público)" : "Convocatoria CERRADA (se cierra el registro público)");
  if (b.limiteMB !== config.limiteMB) cambios.push(`Límite por archivo: ${b.limiteMB} MB`);
  const errores = [
    ...(b.cierre < b.inicio ? ["La fecha de cierre es anterior a la de inicio."] : []),
    ...(!b.nombre.trim() ? ["Escribe el nombre de la convocatoria."] : []),
    ...(b.limiteMB < 1 || b.limiteMB > 20 ? ["El límite por archivo debe estar entre 1 y 20 MB."] : []),
  ];
  // Con la convocatoria activa, cualquier cambio es crítico: pide confirmación (mockup)
  const critico = config.activa && cambios.length > 0;

  const guardar = () => {
    const nuevo = { ...b, nombre: b.nombre.trim(), actualizadoEl: new Date().toISOString(), actualizadoPor: sesion?.correo };
    guardarConvocatoria(nuevo);
    registrarEventoAdmin({ usuario: sesion?.correo ?? "admin", modulo: "Convocatoria", accion: "Actualizó la convocatoria", detalle: cambios.join("; ") });
    setBorrador(null);
    setConfirmar(false);
    setGuardado(`${cambios.length} cambio(s) guardado(s).`);
  };

  return (
    <>
      <PageHeader titulo="Configuración de convocatoria" subtitulo="Periodo de admisión, estado del registro y parámetros del proceso" />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <Etiqueta tono={config.activa ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}>{config.activa ? "Activa · registro abierto" : "Cerrada · registro cerrado"}</Etiqueta>
        {config.actualizadoEl && (
          <span className="text-xs text-gray-500">
            Última actualización: {fh(config.actualizadoEl)} · {config.actualizadoPor}
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Tarjeta titulo="Periodo y programa">
          <label className="block text-sm">
            <span className="font-medium text-gray-900">Nombre</span>
            <input value={b.nombre} onChange={(e) => set({ nombre: e.target.value })} className={`${inputBase} mt-1`} />
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="font-medium text-gray-900">Inicio del registro</span>
              <input type="date" value={b.inicio} onChange={(e) => set({ inicio: e.target.value })} className={`${inputBase} mt-1`} />
            </label>
            <label className="text-sm">
              <span className="font-medium text-gray-900">Cierre del registro</span>
              <input type="date" value={b.cierre} onChange={(e) => set({ cierre: e.target.value })} className={`${inputBase} mt-1`} />
            </label>
          </div>
          <div className="mt-3 text-sm">
            <span className="font-medium text-gray-900">Programa habilitado</span>
            <p className="mt-1 flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700">
              <Lock size={13} /> {PROGRAMA}
            </p>
          </div>
          <fieldset className="mt-4">
            <legend className="text-sm font-medium text-gray-900">Estado</legend>
            <div className="mt-1 flex gap-2">
              {[true, false].map((v) => (
                <label key={String(v)} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${b.activa === v ? "border-primary bg-indigo-50 text-primary" : "border-gray-300"}`}>
                  <input type="radio" name="estado" checked={b.activa === v} onChange={() => set({ activa: v })} className="accent-[var(--color-primary)]" />
                  {v ? "Activa (registro abierto)" : "Cerrada"}
                </label>
              ))}
            </div>
          </fieldset>
        </Tarjeta>

        <Tarjeta titulo="Parámetros del proceso">
          <label className="block text-sm">
            <span className="font-medium text-gray-900">Límite por archivo (MB)</span>
            <input type="number" min={1} max={20} value={b.limiteMB} onChange={(e) => set({ limiteMB: Number(e.target.value) })} className={`${inputBase} mt-1`} />
            <span className="text-xs text-gray-500">Se aplica a los documentos y formatos firmados que suben los aspirantes.</span>
          </label>
          <dl className="mt-4 space-y-3 text-sm">
            {[
              ["Formatos permitidos", "PDF (fotografía en JPG o PNG)"],
              ["Integrantes del sínodo", "3 profesores colegiados vigentes (RN-07)"],
              ["Segunda oportunidad", "Examen de admisión después del propedéutico (RN-08)"],
              ["Fechas y horarios de la evaluación", "Los edita el Departamento de Posgrado"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="font-medium text-gray-900">{k}</dt>
                <dd className="mt-1 flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700">
                  <Lock size={13} /> {v}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs text-gray-500">Los parámetros con candado vienen del Reglamento o de otra área y no se editan aquí.</p>
        </Tarjeta>
      </div>

      <div className="mt-6 space-y-4">
        {errores.length > 0 && (
          <Aviso tono="error" titulo="Revisa lo siguiente">
            {errores.map((e) => (
              <p key={e}>{e}</p>
            ))}
          </Aviso>
        )}
        {critico && (
          <Aviso tono="alerta" titulo="Cambios críticos">
            <span className="flex items-start gap-1.5">
              <TriangleAlert size={14} className="mt-0.5 shrink-0" /> Modificar fechas o reglas con la convocatoria activa requiere confirmación y queda registrado en la bitácora.
            </span>
            <ul className="mt-1 list-disc pl-5">
              {cambios.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <label className="mt-2 flex items-center gap-2">
              <input type="checkbox" checked={confirmar} onChange={(e) => setConfirmar(e.target.checked)} className="h-4 w-4" /> Confirmo estos cambios
            </label>
          </Aviso>
        )}
        {guardado && (
          <p className="flex items-center gap-1.5 text-sm text-emerald-700">
            <CheckCircle2 size={15} /> {guardado}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            className="text-xs text-gray-500 underline"
            onClick={() => {
              setBorrador(CONVOCATORIA_DEFECTO);
              setGuardado("");
            }}
          >
            Solo cascarón: volver a los valores de ejemplo
          </button>
          <div className="flex gap-2">
            {borrador && (
              <button type="button" className={botonSecundario} onClick={() => setBorrador(null)}>
                Descartar
              </button>
            )}
            <button type="button" className={botonPrimario} disabled={!cambios.length || errores.length > 0 || (critico && !confirmar)} onClick={guardar}>
              Guardar configuración
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
