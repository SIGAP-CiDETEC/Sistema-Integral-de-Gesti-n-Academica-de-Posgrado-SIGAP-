"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Aviso } from "@/components/posgrado/ui";
import { TextoConEnlaces } from "@/components/TextoConEnlaces";
import { MODO_API, api } from "@/lib/api";
import { mensajeDe } from "@/lib/avisos-ui";
import { marcarVistasPersonal } from "@/lib/notificaciones-personal";

type Notificacion = { id: string; fecha: string; titulo: string; mensaje: string; nueva: boolean };
const fecha = (iso: string) => new Date(iso).toLocaleString("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/** Notificaciones en SIGAP del personal: avisos que el sistema genera para su cuenta (p. ej. cambios del seminario). */
export function NotificacionesPersonal() {
  const [lista, setLista] = useState<Notificacion[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!MODO_API) return;
    api<{ lista: Notificacion[] }>("/notificaciones")
      .then((r) => {
        setLista(r.lista);
        if (r.lista.some((n) => n.nueva))
          api("/notificaciones/vistas", { metodo: "POST" })
            .then(marcarVistasPersonal)
            .catch(() => undefined);
      })
      .catch((e) => setError(mensajeDe(e)));
  }, []);

  return (
    <>
      <PageHeader titulo="Notificaciones" subtitulo="Avisos del Departamento de Posgrado y de SIGAP para tu cuenta" />
      {!MODO_API ? (
        <Aviso tono="info" titulo="Disponible con el servidor">
          Esta sección funciona con el servidor de SIGAP.
        </Aviso>
      ) : !lista ? (
        error ? (
          <Aviso tono="error" titulo="No se pudieron cargar tus notificaciones">
            {error}
          </Aviso>
        ) : (
          <p className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 size={15} className="animate-spin" /> Cargando…
          </p>
        )
      ) : !lista.length ? (
        <section className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-600">
          <Bell size={24} className="mx-auto mb-2 text-gray-400" />
          No tienes notificaciones.
        </section>
      ) : (
        <div className="space-y-3">
          {lista.map((n) => (
            <article key={n.id} className={`overflow-hidden rounded-xl border bg-white ${n.nueva ? "border-indigo-300" : "border-gray-200"}`}>
              <header className={`flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3 ${n.nueva ? "border-indigo-100 bg-indigo-50/70" : "border-gray-100 bg-gray-50"}`}>
                <p className="flex items-center gap-2 text-sm font-semibold text-navy-800">
                  <BellRing size={15} /> {n.titulo}
                  {n.nueva && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase text-white">Nueva</span>}
                </p>
                <span className="text-xs text-gray-500">{fecha(n.fecha)}</span>
              </header>
              <div className="whitespace-pre-line px-5 py-4 text-sm text-gray-700">
                <TextoConEnlaces texto={n.mensaje} />
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
