"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, Eye, Megaphone, Plus, RotateCcw, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Regresar, Tarjeta, botonPrimario, botonSecundario, inputBase } from "@/components/posgrado/ui";
import { INICIO_ASPIRANTE_DEFECTO, actualizarContenido, useContenido, type InicioAspirante, type TarjetaInicio } from "@/lib/contenido";
import { useSesion } from "@/lib/sesion";

/**
 * Panel sencillo para que el Departamento de Posgrado edite el inicio del aspirante:
 * un aviso destacado y las tarjetas de información (también se ven en el inicio público).
 */
export default function EditarInicioAspirante() {
  const { inicioAspirante, cargado } = useContenido();
  if (!cargado) return null;
  return <Editor key={inicioAspirante.actualizadoEl ?? "base"} actual={inicioAspirante} />;
}

function Editor({ actual }: { actual: InicioAspirante }) {
  const { registrarEnBitacora } = usePosgrado();
  const { sesion } = useSesion();
  const [b, setB] = useState<InicioAspirante>(actual);
  const [guardado, setGuardado] = useState(false);
  const cambiado = JSON.stringify({ a: b.aviso, t: b.tarjetas }) !== JSON.stringify({ a: actual.aviso, t: actual.tarjetas });

  const set = (x: Partial<InicioAspirante>) => {
    setB({ ...b, ...x });
    setGuardado(false);
  };
  const setTarjeta = (i: number, x: Partial<TarjetaInicio>) => set({ tarjetas: b.tarjetas.map((t, j) => (j === i ? { ...t, ...x } : t)) });
  const mover = (i: number, d: -1 | 1) => {
    const t = [...b.tarjetas];
    [t[i], t[i + d]] = [t[i + d], t[i]];
    set({ tarjetas: t });
  };
  const incompletas = b.tarjetas.some((t) => !t.titulo.trim());

  const guardar = () => {
    actualizarContenido((c) => ({ ...c, inicioAspirante: { ...b, actualizadoEl: new Date().toISOString(), actualizadoPor: sesion?.correo } }));
    registrarEnBitacora("Actualizó el inicio del aspirante");
    setGuardado(true);
  };

  return (
    <>
      <Regresar href="/posgrado" t="Inicio" />
      <PageHeader titulo="Inicio del aspirante" subtitulo="Edita el aviso y las tarjetas de información que ven los aspirantes al entrar" />

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Tarjeta titulo={<span className="flex items-center gap-2"><Megaphone size={16} className="text-primary" /> Aviso destacado</span>}>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={b.aviso.visible} onChange={(e) => set({ aviso: { ...b.aviso, visible: e.target.checked } })} className="h-4 w-4" />
              Mostrar el aviso
            </label>
            <label className="mt-3 block text-sm">
              <span className="font-medium text-gray-900">Título</span>
              <input value={b.aviso.titulo} onChange={(e) => set({ aviso: { ...b.aviso, titulo: e.target.value } })} className={`${inputBase} mt-1`} />
            </label>
            <label className="mt-3 block text-sm">
              <span className="font-medium text-gray-900">Texto</span>
              <textarea rows={3} value={b.aviso.texto} onChange={(e) => set({ aviso: { ...b.aviso, texto: e.target.value } })} className={`${inputBase} mt-1`} />
            </label>
          </Tarjeta>

          <Tarjeta
            titulo="Tarjetas de información"
            accion={
              <button
                type="button"
                className={botonSecundario}
                onClick={() => set({ tarjetas: [...b.tarjetas, { id: `t${Date.now()}`, titulo: "", texto: "", accion: "", href: "" }] })}
              >
                <Plus size={15} /> Agregar tarjeta
              </button>
            }
          >
            <ol className="space-y-4">
              {b.tarjetas.map((t, i) => (
                <li key={t.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tarjeta {i + 1}</span>
                    <span className="flex gap-1">
                      <button type="button" aria-label="Subir" disabled={i === 0} onClick={() => mover(i, -1)} className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30">
                        <ArrowUp size={15} />
                      </button>
                      <button type="button" aria-label="Bajar" disabled={i === b.tarjetas.length - 1} onClick={() => mover(i, 1)} className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30">
                        <ArrowDown size={15} />
                      </button>
                      <button type="button" aria-label="Quitar" onClick={() => set({ tarjetas: b.tarjetas.filter((_, j) => j !== i) })} className="rounded p-1 text-red-600 hover:bg-red-50">
                        <Trash2 size={15} />
                      </button>
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm sm:col-span-2">
                      <span className="font-medium text-gray-900">Título</span>
                      <input value={t.titulo} onChange={(e) => setTarjeta(i, { titulo: e.target.value })} className={`${inputBase} mt-1 ${!t.titulo.trim() ? "border-red-300" : ""}`} />
                    </label>
                    <label className="text-sm sm:col-span-2">
                      <span className="font-medium text-gray-900">Texto</span>
                      <textarea rows={2} value={t.texto} onChange={(e) => setTarjeta(i, { texto: e.target.value })} className={`${inputBase} mt-1`} />
                    </label>
                    <label className="text-sm">
                      <span className="font-medium text-gray-900">Texto del botón (opcional)</span>
                      <input value={t.accion} onChange={(e) => setTarjeta(i, { accion: e.target.value })} placeholder="Ej. Más información" className={`${inputBase} mt-1`} />
                    </label>
                    <label className="text-sm">
                      <span className="font-medium text-gray-900">Enlace del botón</span>
                      <input value={t.href} onChange={(e) => setTarjeta(i, { href: e.target.value })} placeholder="https://…" className={`${inputBase} mt-1`} />
                    </label>
                  </div>
                </li>
              ))}
              {!b.tarjetas.length && <p className="text-sm text-gray-500">Sin tarjetas. Agrega una con el botón de arriba.</p>}
            </ol>
          </Tarjeta>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button type="button" className="inline-flex items-center gap-1.5 text-xs text-gray-500 underline" onClick={() => set({ aviso: INICIO_ASPIRANTE_DEFECTO.aviso, tarjetas: INICIO_ASPIRANTE_DEFECTO.tarjetas })}>
              <RotateCcw size={12} /> Volver al contenido original
            </button>
            <div className="flex items-center gap-3">
              {guardado && !cambiado && (
                <span className="flex items-center gap-1.5 text-sm text-emerald-700">
                  <CheckCircle2 size={15} /> Publicado
                </span>
              )}
              {cambiado && (
                <button type="button" className={botonSecundario} onClick={() => setB(actual)}>
                  Descartar
                </button>
              )}
              <button type="button" className={botonPrimario} disabled={!cambiado || incompletas} onClick={guardar}>
                Guardar y publicar
              </button>
            </div>
          </div>
          {actual.actualizadoEl && (
            <p className="text-right text-xs text-gray-500">
              Última publicación: {new Date(actual.actualizadoEl).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              {actual.actualizadoPor ? ` · ${actual.actualizadoPor}` : ""}
            </p>
          )}
        </div>

        {/* Vista previa */}
        <aside className="xl:sticky xl:top-6 xl:self-start">
          <Tarjeta titulo={<span className="flex items-center gap-2"><Eye size={16} className="text-primary" /> Así lo verá el aspirante</span>}>
            <div className="space-y-3 rounded-lg bg-surface p-3">
              {b.aviso.visible && (b.aviso.titulo || b.aviso.texto) && (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-3 text-sm">
                  <p className="font-semibold text-gray-900">{b.aviso.titulo}</p>
                  <p className="mt-0.5 whitespace-pre-line text-gray-700">{b.aviso.texto}</p>
                </div>
              )}
              {b.tarjetas.map((t) => (
                <div key={t.id} className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
                  <p className="font-semibold text-gray-900">{t.titulo || "Sin título"}</p>
                  <p className="mt-0.5 whitespace-pre-line text-gray-600">{t.texto}</p>
                  {t.accion && <span className="mt-2 inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs text-primary">{t.accion}</span>}
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">Las tarjetas también aparecen en el inicio público (“Información para aspirantes”).</p>
          </Tarjeta>
        </aside>
      </div>
    </>
  );
}
