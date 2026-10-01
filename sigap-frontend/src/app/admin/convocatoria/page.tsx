"use client";

import { useState } from "react";
import { CheckCircle2, Lock, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Aviso, Etiqueta, Tarjeta, botonPrimario, botonSecundario, inputBase } from "@/components/admin/ui";
import { CONVOCATORIAS_INFO, PROGRAMA, type IdConvocatoria } from "@/lib/config";
import {
  CONVOCATORIAS_DEFECTO,
  IDS_CONVOCATORIA,
  guardarConvocatorias,
  useConvocatorias,
  type ConfigConvocatoria,
  type ConfigConvocatorias,
} from "@/lib/convocatoria";
import { registrarEventoAdmin } from "@/lib/admin/accesos";
import { useSesion } from "@/lib/sesion";

const fh = (iso: string) => new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Configuración de las convocatorias A (enero–junio) y B (agosto–diciembre) (RF-81, US-AD-03). */
export default function ConfiguracionConvocatoria() {
  const { config, cargada } = useConvocatorias();
  const { sesion } = useSesion();
  const [borrador, setBorrador] = useState<ConfigConvocatorias | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [guardado, setGuardado] = useState("");
  if (!cargada) return null;
  const b = borrador ?? config;
  const set = (patch: Partial<ConfigConvocatorias>) => {
    setBorrador({ ...b, ...patch });
    setGuardado("");
  };
  const setConv = (id: IdConvocatoria, patch: Partial<ConfigConvocatoria>) => set({ [id]: { ...b[id], ...patch } });

  const cambios: string[] = [];
  const errores: string[] = [];
  for (const id of IDS_CONVOCATORIA) {
    const n = b[id];
    const o = config[id];
    if (n.nombre !== o.nombre) cambios.push(`${id} · Nombre: ${n.nombre}`);
    if (n.inicio !== o.inicio || n.cierre !== o.cierre) cambios.push(`${id} · Periodo de registro: ${n.inicio} a ${n.cierre}`);
    if (n.activa !== o.activa) cambios.push(n.activa ? `${id} · ABIERTA (se abre su registro público)` : `${id} · CERRADA (se cierra su registro público)`);
    if (n.cierre < n.inicio) errores.push(`Convocatoria ${id}: la fecha de cierre es anterior a la de inicio.`);
    if (!n.nombre.trim()) errores.push(`Convocatoria ${id}: escribe el nombre.`);
  }
  if (b.limiteMB !== config.limiteMB) cambios.push(`Límite por archivo: ${b.limiteMB} MB`);
  if (b.limiteMB < 1 || b.limiteMB > 20) errores.push("El límite por archivo debe estar entre 1 y 20 MB.");
  // Con alguna convocatoria abierta, cualquier cambio es crítico: pide confirmación (mockup)
  const critico = (config.A.activa || config.B.activa) && cambios.length > 0;

  const guardar = () => {
    const nuevo: ConfigConvocatorias = {
      ...b,
      A: { ...b.A, nombre: b.A.nombre.trim() },
      B: { ...b.B, nombre: b.B.nombre.trim() },
      actualizadoEl: new Date().toISOString(),
      actualizadoPor: sesion?.correo,
    };
    guardarConvocatorias(nuevo);
    registrarEventoAdmin({ usuario: sesion?.correo ?? "admin", modulo: "Convocatoria", accion: "Actualizó las convocatorias", detalle: cambios.join("; ") });
    setBorrador(null);
    setConfirmar(false);
    setGuardado(`${cambios.length} cambio(s) guardado(s).`);
  };

  return (
    <>
      <PageHeader titulo="Configuración de convocatorias" subtitulo="Convocatoria A (ingreso enero – junio) y B (ingreso agosto – diciembre)" />
      {config.actualizadoEl && (
        <p className="mb-5 text-xs text-gray-500">
          Última actualización: {fh(config.actualizadoEl)} · {config.actualizadoPor}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {IDS_CONVOCATORIA.map((id) => {
          const c = b[id];
          return (
            <Tarjeta
              key={id}
              titulo={`Convocatoria ${id} · ${CONVOCATORIAS_INFO[id].periodo}`}
              accion={<Etiqueta tono={config[id].activa ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}>{config[id].activa ? "Abierta" : "Cerrada"}</Etiqueta>}
            >
              <label className="block text-sm">
                <span className="font-medium text-gray-900">Nombre</span>
                <input value={c.nombre} onChange={(e) => setConv(id, { nombre: e.target.value })} className={`${inputBase} mt-1`} />
              </label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="font-medium text-gray-900">Inicio del registro</span>
                  <input type="date" value={c.inicio} onChange={(e) => setConv(id, { inicio: e.target.value })} className={`${inputBase} mt-1`} />
                </label>
                <label className="text-sm">
                  <span className="font-medium text-gray-900">Cierre del registro</span>
                  <input type="date" value={c.cierre} onChange={(e) => setConv(id, { cierre: e.target.value })} className={`${inputBase} mt-1`} />
                </label>
              </div>
              <div className="mt-3 text-sm">
                <span className="font-medium text-gray-900">Semestre de ingreso</span>
                <p className="mt-1 flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700">
                  <Lock size={13} /> {CONVOCATORIAS_INFO[id].semestre}
                </p>
              </div>
              <fieldset className="mt-4">
                <legend className="text-sm font-medium text-gray-900">Estado</legend>
                <div className="mt-1 flex flex-wrap gap-2">
                  {[true, false].map((v) => (
                    <label key={String(v)} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${c.activa === v ? "border-primary bg-indigo-50 text-primary" : "border-gray-300"}`}>
                      <input type="radio" name={`estado-${id}`} checked={c.activa === v} onChange={() => setConv(id, { activa: v })} className="accent-[var(--color-primary)]" />
                      {v ? "Abierta (registro público)" : "Cerrada"}
                    </label>
                  ))}
                </div>
              </fieldset>
            </Tarjeta>
          );
        })}

        <Tarjeta titulo="Parámetros del proceso (ambas convocatorias)">
          <div className="mb-3 text-sm">
            <span className="font-medium text-gray-900">Programa habilitado</span>
            <p className="mt-1 flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700">
              <Lock size={13} /> {PROGRAMA}
            </p>
          </div>
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
              <TriangleAlert size={14} className="mt-0.5 shrink-0" /> Modificar fechas o reglas con una convocatoria abierta requiere confirmación y queda registrado en la bitácora.
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
              setBorrador(CONVOCATORIAS_DEFECTO);
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
