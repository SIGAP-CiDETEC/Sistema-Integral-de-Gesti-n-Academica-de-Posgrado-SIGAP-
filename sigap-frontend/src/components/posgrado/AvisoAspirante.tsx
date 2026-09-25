"use client";

import { useState } from "react";
import { Bell, CheckCircle2, Mail, Send } from "lucide-react";
import { CANAL_TEXTO, usePosgrado, type Canal } from "./PosgradoProvider";
import { Tarjeta, botonPrimario, inputBase } from "./ui";
import { fechaHora } from "@/lib/posgrado/datos";

export type Plantilla = { id: string; t: string; asunto: string; mensaje: string };

/**
 * Enviar un aviso a un aspirante por correo, por el sistema (notificación en SIGAP) o ambos.
 * Con backend: el correo sale por la cola (BullMQ) y la notificación llega en vivo (Socket.io).
 */
export function AvisoAspirante({ aspirante, nombre, plantillas }: { aspirante: string; nombre: string; plantillas: Plantilla[] }) {
  const { enviarAviso, avisos } = usePosgrado();
  const [plantilla, setPlantilla] = useState(plantillas[0]?.id ?? "");
  const p0 = plantillas[0];
  const [asunto, setAsunto] = useState(p0?.asunto ?? "");
  const [mensaje, setMensaje] = useState(p0?.mensaje ?? "");
  const [canal, setCanal] = useState<Canal>("ambos");
  const [enviado, setEnviado] = useState(false);
  const previos = avisos.filter((a) => a.aspirante === aspirante);

  return (
    <Tarjeta titulo={<span className="flex items-center gap-2"><Bell size={16} className="text-primary" /> Avisar al aspirante</span>}>
      <label className="block text-sm">
        <span className="font-medium text-gray-900">Motivo del aviso</span>
        <select
          value={plantilla}
          onChange={(e) => {
            const p = plantillas.find((x) => x.id === e.target.value);
            setPlantilla(e.target.value);
            if (p) {
              setAsunto(p.asunto);
              setMensaje(p.mensaje);
            }
            setEnviado(false);
          }}
          className={`${inputBase} mt-1`}
        >
          {plantillas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.t}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="mt-3">
        <legend className="text-sm font-medium text-gray-900">Enviar por</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {(
            [
              ["correo", "Correo", Mail],
              ["sistema", "Sistema (SIGAP)", Bell],
              ["ambos", "Ambos", Send],
            ] as const
          ).map(([id, t, Icono]) => (
            <label key={id} className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm ${canal === id ? "border-primary bg-indigo-50 text-primary" : "border-gray-300"}`}>
              <input type="radio" name={`canal-${aspirante}`} checked={canal === id} onChange={() => setCanal(id)} className="sr-only" />
              <Icono size={14} /> {t}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-3 block text-sm">
        <span className="font-medium text-gray-900">Asunto</span>
        <input value={asunto} onChange={(e) => setAsunto(e.target.value)} className={`${inputBase} mt-1`} />
      </label>
      <label className="mt-3 block text-sm">
        <span className="font-medium text-gray-900">Mensaje</span>
        <textarea rows={5} value={mensaje} onChange={(e) => setMensaje(e.target.value)} className={`${inputBase} mt-1 resize-y`} />
      </label>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {enviado ? (
          <span className="flex items-center gap-1.5 text-sm text-emerald-700">
            <CheckCircle2 size={15} /> Aviso enviado por {CANAL_TEXTO[canal]}
          </span>
        ) : (
          <span className="text-xs text-gray-500">Para: {nombre}</span>
        )}
        <button
          type="button"
          className={botonPrimario}
          disabled={!asunto.trim() || !mensaje.trim()}
          onClick={() => {
            enviarAviso([aspirante], canal, asunto.trim(), mensaje.trim());
            setEnviado(true);
          }}
        >
          <Send size={15} /> Enviar aviso
        </button>
      </div>
      {previos.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Avisos enviados</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {previos.map((a) => (
              <li key={a.id}>
                <span className="text-gray-900">{a.asunto}</span>
                <span className="block text-xs text-gray-500">
                  {fechaHora(a.fecha)} · {CANAL_TEXTO[a.canal]} · {a.usuario}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Tarjeta>
  );
}
