"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, Megaphone, Paperclip } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import { mensajeDe } from "@/lib/avisos-ui";
import { marcarNotificacionesVistas } from "@/lib/portal";
import { TextoConEnlaces } from "@/components/TextoConEnlaces";
import { Cargando, fechaHoraCorta } from "./PortalComun";

type Notificacion = { id: string; fecha: string; titulo: string; mensaje: string; origen: "aviso" | "comunicado" | "proceso"; adjuntos?: string[]; nueva: boolean };

const ORIGEN = { aviso: "Departamento de Posgrado", comunicado: "Comunicado de Posgrado", proceso: "SIGAP" };

/** Notificaciones en SIGAP (servidor real): avisos y comunicados de Posgrado y avisos automáticos de tu proceso. */
export function NotificacionesServidor() {
  const [lista, setLista] = useState<Notificacion[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<{ lista: Notificacion[] }>("/portal/notificaciones")
      .then((r) => {
        setLista(r.lista);
        // Al abrirlas quedan vistas (se siguen marcando como nuevas en esta visita)
        if (r.lista.some((n) => n.nueva))
          api("/portal/notificaciones/vistas", { metodo: "POST" })
            .then(marcarNotificacionesVistas)
            .catch(() => undefined);
      })
      .catch((e) => setError(mensajeDe(e)));
  }, []);

  return (
    <>
      <PageHeader titulo="Notificaciones" subtitulo="Avisos de tu proceso de admisión" />
      {!lista ? (
        <Cargando error={error} />
      ) : !lista.length ? (
        <section className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-600">
          <Bell size={24} className="mx-auto mb-2 text-gray-400" />
          Aún no tienes notificaciones. Aquí verás los avisos del Departamento de Posgrado y de tu proceso.
        </section>
      ) : (
        <div className="space-y-3">
          {lista.map((n) => {
            const Icono = n.origen === "comunicado" ? Megaphone : n.origen === "proceso" ? BellRing : Bell;
            return (
              <article key={n.id} className={`overflow-hidden rounded-xl border bg-white ${n.nueva ? "border-indigo-300" : "border-gray-200"}`}>
                <header className={`flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3 ${n.nueva ? "border-indigo-100 bg-indigo-50/70" : "border-gray-100 bg-gray-50"}`}>
                  <p className="flex items-center gap-2 text-sm font-semibold text-navy-800">
                    <Icono size={15} /> {n.titulo}
                    {n.nueva && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase text-white">Nueva</span>}
                  </p>
                  <span className="text-xs text-gray-500">
                    {fechaHoraCorta(n.fecha)} · {ORIGEN[n.origen]}
                  </span>
                </header>
                <div className="whitespace-pre-line px-5 py-4 text-sm text-gray-700">
                  <TextoConEnlaces texto={n.mensaje} />
                </div>
                {!!n.adjuntos?.length && (
                  <p className="flex items-center gap-1.5 border-t border-gray-100 px-5 py-2 text-xs text-gray-500">
                    <Paperclip size={12} /> Adjuntos: {n.adjuntos.join(", ")} (solicítalos al Departamento de Posgrado si no los recibiste)
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
