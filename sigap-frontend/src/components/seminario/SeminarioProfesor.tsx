"use client";

import { useState } from "react";
import { CalendarCheck2, CheckCircle2, Loader2, Lock, MapPin, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Aviso, Tarjeta, botonPrimario, botonSecundario, inputBase } from "@/components/posgrado/ui";
import { TextoConEnlaces } from "@/components/TextoConEnlaces";
import { MODO_API } from "@/lib/api";
import { notificar } from "@/lib/avisos-ui";
import { LugarSesion } from "./SeminarioPosgrado";
import { detalleDe, diaSesion, diaSesionTitulo, porSesion, useSeminario, type EspacioSeminario } from "@/lib/seminario";

/**
 * Seminario de Inducción (profesor): elige el día y la hora en que presentará su laboratorio, con confirmación.
 * Puede liberar su horario mientras la elección siga abierta (salvo que Posgrado se lo haya asignado).
 */
export function SeminarioProfesor() {
  const { datos, error, accion } = useSeminario();
  const [elegido, setElegido] = useState<EspacioSeminario | null>(null);
  const [laboratorio, setLaboratorio] = useState("");
  const [trabajando, setTrabajando] = useState(false);

  if (!MODO_API)
    return (
      <>
        <PageHeader titulo="Seminario de inducción" />
        <Aviso tono="info" titulo="Disponible con el servidor">
          Esta sección funciona con el servidor de SIGAP.
        </Aviso>
      </>
    );
  if (!datos)
    return error ? (
      <Aviso tono="error" titulo="No se pudo cargar el seminario">
        {error}
      </Aviso>
    ) : (
      <p className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 size={15} className="animate-spin" /> Cargando…
      </p>
    );

  const { config } = datos;
  if (!datos.publicado)
    return (
      <>
        <PageHeader titulo="Seminario de inducción" />
        <Aviso tono="info" titulo="Aún no hay horarios">
          El Departamento de Posgrado todavía no publica las sesiones del seminario. Aquí podrás elegir tu día y hora.
        </Aviso>
      </>
    );

  const mios = datos.espacios.filter((e) => e.profesorId && e.profesorId === datos.yo);
  const puedeElegir = config.abierto && mios.length < config.maxPorProfesor;
  const ultimoLab = mios.at(-1)?.laboratorio ?? "";

  const confirmar = async () => {
    if (!elegido) return;
    setTrabajando(true);
    const e = await accion("/seminario/elegir", { espacio: elegido.id, laboratorio });
    setTrabajando(false);
    if (e) notificar(e);
    else {
      notificar("Tu horario quedó registrado.", "exito");
      setElegido(null);
    }
  };
  const liberar = async (x: EspacioSeminario) => {
    if (!window.confirm(`¿Liberar tu horario del ${diaSesion(x.fecha)} a las ${x.inicio}? Otro profesor podrá tomarlo.`)) return;
    const e = await accion("/seminario/dejar", { espacio: x.id });
    notificar(e ?? "Liberaste tu horario.", e ? "error" : "exito");
  };

  return (
    <>
      <PageHeader titulo={config.titulo} subtitulo="Elige el día y la hora en que presentarás tu laboratorio a los aspirantes" />

      <div className="mb-5 space-y-3">
        {config.lugar && !config.sesiones.some((f) => config.porSesion?.[f]?.modalidad === "en-linea") && (
          <p className="flex items-center gap-2 text-sm text-gray-700">
            <MapPin size={15} className="text-primary" /> <TextoConEnlaces texto={config.lugar} />
          </p>
        )}
        {mios.length > 0 && (
          <Aviso tono="exito" titulo={mios.length === 1 ? "Tu horario en el seminario" : "Tus horarios en el seminario"}>
            <ul className="mt-1 space-y-0.5">
              {mios.map((x) => (
                <li key={x.id}>
                  {diaSesion(x.fecha)}, de {x.inicio} a {x.fin} h{x.laboratorio ? ` · ${x.laboratorio}` : ""}
                  {detalleDe(config, x.fecha).modalidad === "en-linea" ? " · en línea" : ""}
                  {x.por === "posgrado" && " (asignado por Posgrado)"}
                </li>
              ))}
            </ul>
          </Aviso>
        )}
        {!config.abierto && (
          <Aviso tono="info" titulo="La elección de horarios está cerrada">
            Si necesitas un cambio, escribe al Departamento de Posgrado.
          </Aviso>
        )}
      </div>

      {elegido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-semibold text-gray-900">Confirma tu horario</h2>
              <button type="button" aria-label="Cerrar" onClick={() => setElegido(null)} className="rounded p-1 text-gray-500 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-700">
              Presentarás tu laboratorio el <strong>{diaSesion(elegido.fecha)}</strong>, de <strong>{elegido.inicio}</strong> a <strong>{elegido.fin}</strong> h
              {detalleDe(config, elegido.fecha).modalidad === "en-linea" ? " (sesión en línea)" : ""}.
            </p>
            <label className="mt-4 block text-sm">
              <span className="font-medium text-gray-800">Nombre de tu laboratorio</span>
              <input autoFocus value={laboratorio} maxLength={160} onChange={(e) => setLaboratorio(e.target.value)} className={`${inputBase} mt-1`} placeholder="Ej. Laboratorio de Inteligencia Artificial" />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setElegido(null)} className={botonSecundario}>
                Cancelar
              </button>
              <button type="button" disabled={trabajando || !laboratorio.trim()} onClick={confirmar} className={botonPrimario}>
                {trabajando ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Confirmar selección
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {porSesion(datos.espacios).map((s, i) => (
          <Tarjeta key={s.fecha} titulo={`Sesión ${i + 1} · ${diaSesionTitulo(s.fecha)}`} accion={<LugarSesion c={config} fecha={s.fecha} />}>
            <ul className="divide-y divide-gray-100">
              {s.espacios.map((e) => {
                const mio = !!e.profesorId && e.profesorId === datos.yo;
                return (
                  <li key={e.id} className={`flex flex-wrap items-center gap-3 py-2.5 text-sm ${mio ? "bg-emerald-50/60" : ""}`}>
                    <span className="w-28 shrink-0 pl-1 font-mono text-gray-700">
                      {e.inicio}–{e.fin}
                    </span>
                    <span className="min-w-0 flex-1">
                      {e.profesorId ? (
                        <>
                          <span className={mio ? "font-medium text-emerald-800" : "text-gray-800"}>{mio ? "Tú" : e.profesor}</span>
                          {e.laboratorio && <span className="text-gray-500"> · {e.laboratorio}</span>}
                        </>
                      ) : (
                        <span className="text-gray-400">Disponible</span>
                      )}
                    </span>
                    {mio && config.abierto && e.por !== "posgrado" && (
                      <button type="button" onClick={() => liberar(e)} className="text-xs text-gray-600 underline hover:text-red-700">
                        Liberar
                      </button>
                    )}
                    {!e.profesorId &&
                      (puedeElegir ? (
                        <button
                          type="button"
                          onClick={() => {
                            setLaboratorio(ultimoLab);
                            setElegido(e);
                          }}
                          className={`${botonSecundario} py-1.5`}
                        >
                          <CalendarCheck2 size={14} /> Elegir
                        </button>
                      ) : (
                        !config.abierto && <Lock size={14} className="text-gray-300" />
                      ))}
                  </li>
                );
              })}
            </ul>
          </Tarjeta>
        ))}
      </div>
      {config.abierto && !puedeElegir && mios.length > 0 && (
        <p className="mt-4 text-xs text-gray-500">
          {config.maxPorProfesor === 1 ? "Ya tienes un horario. Para cambiarlo, libera el que tienes y elige otro." : `Ya tienes el máximo de ${config.maxPorProfesor} horarios.`}
        </p>
      )}
    </>
  );
}
