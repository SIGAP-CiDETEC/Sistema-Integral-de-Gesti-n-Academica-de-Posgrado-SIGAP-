"use client";

import { useRef, useState } from "react";
import { CalendarRange, CheckCircle2, ImageUp, RotateCcw, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Aviso, Etiqueta, Regresar, Tarjeta, botonPeligro, botonPrimario, botonSecundario, inputBase } from "@/components/posgrado/ui";
import { CONVOCATORIAS_INFO, type IdConvocatoria } from "@/lib/config";
import { CALENDARIOS_EJEMPLO, actualizarContenido, reducirImagen, useContenido } from "@/lib/contenido";
import { IDS_CONVOCATORIA, TONO_ESTADO_CONV, estadoPorFechas, fechaResultados, guardarConvocatorias, useConvocatorias } from "@/lib/convocatoria";
import { useSesion } from "@/lib/sesion";

const fh = (iso: string) => new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/**
 * Convocatorias A y B desde la Jefatura de Posgrado: fechas de registro (la convocatoria se abre y se cierra
 * sola en esas fechas) e imagen del calendario que se publica en el inicio público. Solo cascarón: se guarda en el navegador.
 */
export default function CalendarioConvocatorias() {
  const { lista } = useConvocatorias();
  const { cargado } = useContenido();
  if (!cargado) return null;
  return (
    <>
      <Regresar href="/posgrado" t="Inicio" />
      <PageHeader titulo="Convocatorias y calendario" subtitulo="Fechas de registro de cada convocatoria e imagen del calendario que se publica en el inicio" />
      <FechasConvocatorias />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {IDS_CONVOCATORIA.map((id) => (
          <CalendarioDe key={id} id={id} nombre={lista.find((c) => c.id === id)?.nombre ?? `Convocatoria ${id}`} />
        ))}
      </div>
    </>
  );
}

/** Fechas de registro: el estado (Próxima, Abierta, Cerrada) se calcula solo con la fecha de hoy. */
function FechasConvocatorias() {
  const { config, lista } = useConvocatorias();
  const { registrarEnBitacora } = usePosgrado();
  const { sesion } = useSesion();
  const [b, setB] = useState<Record<IdConvocatoria, { inicio: string; cierre: string; resultados: string }> | null>(null);
  const [ok, setOk] = useState("");
  const actual = b ?? {
    A: { inicio: config.A.inicio, cierre: config.A.cierre, resultados: fechaResultados(config, "A") },
    B: { inicio: config.B.inicio, cierre: config.B.cierre, resultados: fechaResultados(config, "B") },
  };
  const cambios = IDS_CONVOCATORIA.filter(
    (id) => actual[id].inicio !== config[id].inicio || actual[id].cierre !== config[id].cierre || actual[id].resultados !== fechaResultados(config, id),
  );
  const errores = [
    ...IDS_CONVOCATORIA.filter((id) => !actual[id].inicio || !actual[id].cierre || actual[id].cierre < actual[id].inicio).map(
      (id) => `Convocatoria ${id}: la fecha de cierre debe ser igual o posterior a la de inicio.`,
    ),
    ...IDS_CONVOCATORIA.filter((id) => !actual[id].resultados || actual[id].resultados <= actual[id].cierre).map(
      (id) => `Convocatoria ${id}: la publicación de resultados debe ser después del cierre del registro.`,
    ),
  ];
  const set = (id: IdConvocatoria, campo: "inicio" | "cierre" | "resultados", v: string) => {
    setB({ ...actual, [id]: { ...actual[id], [campo]: v } });
    setOk("");
  };
  const guardar = () => {
    guardarConvocatorias({
      ...config,
      A: { ...config.A, ...actual.A },
      B: { ...config.B, ...actual.B },
      actualizadoEl: new Date().toISOString(),
      actualizadoPor: sesion?.correo,
    });
    const texto = cambios
      .map((id) => `${config[id].nombre}: registro del ${actual[id].inicio} al ${actual[id].cierre}, resultados el ${actual[id].resultados}`)
      .join("; ");
    registrarEnBitacora(`Cambió las fechas de las convocatorias: ${texto}`);
    setB(null);
    setOk(`${cambios.length} convocatoria(s) actualizada(s).`);
  };

  return (
    <Tarjeta titulo={<span className="flex items-center gap-2"><CalendarRange size={17} className="text-primary" /> Fechas de registro y de resultados</span>}>
      <p className="mb-4 text-sm text-gray-600">
        Cada convocatoria se <b>abre</b> sola el día de inicio y se <b>cierra</b> sola al terminar el día de cierre; ya no hace falta que el Administrador la
        abra o la cierre.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {IDS_CONVOCATORIA.map((id) => {
          const estado = estadoPorFechas(actual[id]);
          const vista = lista.find((c) => c.id === id);
          return (
            <fieldset key={id} className="rounded-lg border border-gray-200 p-3" data-convocatoria={id}>
              <legend className="flex items-center gap-2 px-1 text-sm font-semibold text-gray-900">
                {vista?.nombre ?? `Convocatoria ${id}`} <Etiqueta tono={TONO_ESTADO_CONV[estado]}>{estado}</Etiqueta>
              </legend>
              <div className="grid gap-2 sm:grid-cols-3">
                <label className="text-xs text-gray-700">
                  Inicio del registro
                  <input type="date" aria-label={`Inicio del registro ${id}`} value={actual[id].inicio} onChange={(e) => set(id, "inicio", e.target.value)} className={`${inputBase} mt-0.5`} />
                </label>
                <label className="text-xs text-gray-700">
                  Cierre del registro
                  <input type="date" aria-label={`Cierre del registro ${id}`} value={actual[id].cierre} onChange={(e) => set(id, "cierre", e.target.value)} className={`${inputBase} mt-0.5`} />
                </label>
                <label className="text-xs text-gray-700">
                  Publicación de resultados
                  <input
                    type="date"
                    aria-label={`Publicación de resultados ${id}`}
                    value={actual[id].resultados}
                    onChange={(e) => set(id, "resultados", e.target.value)}
                    className={`${inputBase} mt-0.5`}
                  />
                </label>
              </div>
              <p className="mt-2 text-xs text-gray-500">{CONVOCATORIAS_INFO[id].semestre}</p>
            </fieldset>
          );
        })}
      </div>
      {errores.length > 0 && (
        <div className="mt-3">
          <Aviso tono="error" titulo={errores.join(" ")} />
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        {ok && (
          <span className="mr-auto flex items-center gap-1.5 text-sm text-emerald-700">
            <CheckCircle2 size={15} /> {ok}
          </span>
        )}
        {b && (
          <button type="button" className={botonSecundario} onClick={() => setB(null)}>
            Descartar
          </button>
        )}
        <button type="button" className={botonPrimario} disabled={!cambios.length || errores.length > 0} onClick={guardar}>
          Guardar fechas
        </button>
      </div>
    </Tarjeta>
  );
}

function CalendarioDe({ id, nombre }: { id: IdConvocatoria; nombre: string }) {
  const { calendarioDe } = useContenido();
  const { registrarEnBitacora } = usePosgrado();
  const { sesion } = useSesion();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const cal = calendarioDe(id);
  const esEjemplo = cal?.imagen === CALENDARIOS_EJEMPLO[id].imagen;

  const guardar = (valor: Parameters<typeof actualizarContenido>[0], mensaje: string) => {
    const bien = actualizarContenido(valor);
    if (!bien) return setError("La imagen es demasiado pesada para guardarse en el navegador. Usa una más ligera.");
    registrarEnBitacora(`${mensaje} (${nombre})`);
    setError("");
    setOk(mensaje);
  };

  const subir = async (file: File | undefined) => {
    setOk("");
    if (!file) return;
    if (!/^image\/(png|jpeg)$/.test(file.type)) return setError("Sube una imagen JPG o PNG (puedes exportar el PDF del calendario como imagen).");
    if (file.size > 10 * 1024 * 1024) return setError("La imagen no debe pasar de 10 MB.");
    try {
      const imagen = await reducirImagen(file);
      guardar(
        (c) => ({ ...c, calendarios: { ...c.calendarios, [id]: { imagen, nombre: file.name, subidoEl: new Date().toISOString(), subidoPor: sesion?.correo } } }),
        "Publicó el calendario",
      );
    } catch {
      setError("No se pudo leer la imagen.");
    }
    if (input.current) input.current.value = "";
  };

  return (
    <Tarjeta titulo={`${nombre} · ${CONVOCATORIAS_INFO[id].periodo}`}>
      {cal ? (
        <a href={cal.imagen} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element -- imagen subida por el usuario (data URL) */}
          <img src={cal.imagen} alt={`Calendario de la ${nombre}`} className="max-h-[520px] w-full object-contain" />
        </a>
      ) : (
        <p className="rounded-lg border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">Sin calendario publicado. En el inicio solo se verán el periodo y las fechas de registro.</p>
      )}
      {cal && (
        <p className="mt-2 text-xs text-gray-500">
          {esEjemplo ? "Calendario de ejemplo (del PDF de la convocatoria)" : cal.nombre}
          {cal.subidoEl && ` · publicado el ${fh(cal.subidoEl)}${cal.subidoPor ? ` por ${cal.subidoPor}` : ""}`}
        </p>
      )}

      <input ref={input} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => subir(e.target.files?.[0])} />
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={botonPrimario} onClick={() => input.current?.click()}>
          <ImageUp size={15} /> {cal ? "Reemplazar imagen" : "Subir imagen"}
        </button>
        {cal && (
          <button type="button" className={botonPeligro} onClick={() => guardar((c) => ({ ...c, calendarios: { ...c.calendarios, [id]: null } }), "Quitó el calendario")}>
            <Trash2 size={15} /> Quitar
          </button>
        )}
        {!esEjemplo && (
          <button
            type="button"
            className={botonSecundario}
            onClick={() => guardar((c) => ({ ...c, calendarios: { ...c.calendarios, [id]: undefined } }), "Restauró el calendario de ejemplo")}
          >
            <RotateCcw size={15} /> Usar el de ejemplo
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-gray-500">JPG o PNG. Se muestra en el inicio público, en la tarjeta de esta convocatoria.</p>
      {error && (
        <div className="mt-3">
          <Aviso tono="error" titulo={error} />
        </div>
      )}
      {ok && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-emerald-700">
          <CheckCircle2 size={15} /> {ok}.
        </p>
      )}
    </Tarjeta>
  );
}

