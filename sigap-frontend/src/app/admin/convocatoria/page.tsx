"use client";

import { useState } from "react";
import { CheckCircle2, Lock, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Aviso, Etiqueta, Tarjeta, botonPrimario, botonSecundario, inputBase } from "@/components/admin/ui";
import { CONVOCATORIAS_INFO, PROGRAMA } from "@/lib/config";
import { CONVOCATORIAS_DEFECTO, TONO_ESTADO_CONV, guardarConvocatorias, useConvocatorias, type ConfigConvocatorias } from "@/lib/convocatoria";
import { registrarEventoAdmin } from "@/lib/admin/accesos";
import { useSesion } from "@/lib/sesion";

const fechaLarga = (f: string) => new Date(`${f}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
const fh = (iso: string) => new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Parámetros de las convocatorias A y B (RF-81). Las fechas las define Posgrado y el estado se calcula solo. */
export default function ConfiguracionConvocatoria() {
  const { config, lista, cargada } = useConvocatorias();
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

  const cambios: string[] = [];
  const errores: string[] = [];
  if (b.limiteMB !== config.limiteMB) cambios.push(`Límite por archivo: ${b.limiteMB} MB`);
  if (b.limiteMB < 1 || b.limiteMB > 20) errores.push("El límite por archivo debe estar entre 1 y 20 MB.");
  // Con alguna convocatoria abierta, cualquier cambio es crítico: pide confirmación (mockup)
  const critico = lista.some((c) => c.activa) && cambios.length > 0;

  const guardar = () => {
    const nuevo: ConfigConvocatorias = {
      ...config,
      limiteMB: b.limiteMB,
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
      <PageHeader titulo="Configuración de convocatorias" subtitulo="Parámetros del proceso; las fechas de registro las define el Departamento de Posgrado" />
      {config.actualizadoEl && (
        <p className="mb-5 text-xs text-gray-500">
          Última actualización: {fh(config.actualizadoEl)} · {config.actualizadoPor}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {lista.map((c) => (
          <Tarjeta key={c.id} titulo={`Convocatoria ${c.id} · ${CONVOCATORIAS_INFO[c.id].periodo}`} accion={<Etiqueta tono={TONO_ESTADO_CONV[c.estado]}>{c.estado}</Etiqueta>}>
            <dl className="space-y-3 text-sm">
              {[
                ["Nombre", c.nombre],
                ["Periodo de registro", `${fechaLarga(c.inicioISO)} al ${fechaLarga(c.cierreISO)}`],
                ["Semestre de ingreso", CONVOCATORIAS_INFO[c.id].semestre],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="font-medium text-gray-900">{k}</dt>
                  <dd className="mt-1 flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700">
                    <Lock size={13} /> {v}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-gray-500">
              Las fechas las define el Departamento de Posgrado (Convocatorias y calendario). La convocatoria se abre y se cierra sola en esas fechas.
            </p>
          </Tarjeta>
        ))}

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
              ["Profesores entrevistadores", "3 profesores colegiados vigentes o de asignatura, que eligen sus entrevistas"],
              ["Segunda oportunidad", "Examen de admisión después del propedéutico"],
              ["Fechas de registro de las convocatorias", "Las define el Departamento de Posgrado; se abren y cierran solas"],
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
              <TriangleAlert size={14} className="mt-0.5 shrink-0" /> Modificar reglas con una convocatoria abierta requiere confirmación y queda registrado en la bitácora.
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
              setBorrador({ ...config, limiteMB: CONVOCATORIAS_DEFECTO.limiteMB });
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
