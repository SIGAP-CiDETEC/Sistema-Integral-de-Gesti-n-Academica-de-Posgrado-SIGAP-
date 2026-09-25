import { PageHeader } from "@/components/PageHeader";
import { NotificacionesAspirante } from "@/components/alumno/NotificacionesAspirante";

export default function AspiranteNotificaciones() {
  return (
    <>
      <PageHeader titulo="Notificaciones" subtitulo="Avisos de tu proceso de admisión" />
      <NotificacionesAspirante />
    </>
  );
}
