"use client";

import { useRef, useState } from "react";
import { CheckCircle2, ImageUp, RotateCcw, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Aviso, Regresar, Tarjeta, botonPeligro, botonPrimario, botonSecundario } from "@/components/posgrado/ui";
import { CONVOCATORIAS_INFO, type IdConvocatoria } from "@/lib/config";
import { CALENDARIOS_EJEMPLO, actualizarContenido, reducirImagen, useContenido } from "@/lib/contenido";
import { IDS_CONVOCATORIA, useConvocatorias } from "@/lib/convocatoria";
import { useSesion } from "@/lib/sesion";

const fh = (iso: string) => new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/**
 * Calendario de cada convocatoria (A y B): la Jefatura de Posgrado sube la imagen y se publica
 * en el inicio público, en la tarjeta de la convocatoria. Solo cascarón: se guarda en el navegador.
 */
export default function CalendarioConvocatorias() {
  const { lista } = useConvocatorias();
  const { cargado } = useContenido();
  if (!cargado) return null;
  return (
    <>
      <Regresar href="/posgrado" t="Inicio" />
      <PageHeader titulo="Calendario de convocatorias" subtitulo="Imagen del calendario que se publica en el inicio, en la tarjeta de cada convocatoria" />
      <div className="grid gap-6 lg:grid-cols-2">
        {IDS_CONVOCATORIA.map((id) => (
          <CalendarioDe key={id} id={id} nombre={lista.find((c) => c.id === id)?.nombre ?? `Convocatoria ${id}`} />
        ))}
      </div>
    </>
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

