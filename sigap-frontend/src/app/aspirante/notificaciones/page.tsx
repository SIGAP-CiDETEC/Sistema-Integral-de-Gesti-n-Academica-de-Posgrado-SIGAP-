"use client";

import { DEMO_ASPIRANTES, MODO_API } from "@/lib/api";
import { NotificacionesServidor } from "@/components/portal/NotificacionesServidor";
import { PageHeader } from "@/components/PageHeader";
import { NotificacionesAspirante } from "@/components/alumno/NotificacionesAspirante";

export default function AspiranteNotificaciones() {
  if (MODO_API && !DEMO_ASPIRANTES) return <NotificacionesServidor />;
  return (
    <>
      <PageHeader titulo="Notificaciones" subtitulo="Avisos de tu proceso de admisión" />
      <NotificacionesAspirante />
    </>
  );
}
