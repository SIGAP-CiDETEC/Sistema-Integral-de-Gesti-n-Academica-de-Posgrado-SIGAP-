import { MiAdmisionVivo } from "@/components/expediente/MiAdmisionVivo";
import { VistaAdmision } from "@/components/expediente/VistaAdmision";
import { SOLICITUDES_DEMO, esEtapa } from "@/lib/admision";

/**
 * Mi admisión (RF-13): el aspirante consulta el estado de su proceso.
 * Muestra lo que registraron Posgrado y UTEyCV; ?etapa=<id> muestra un ejemplo de cada etapa.
 * Con backend: GET /aspirantes/me/solicitud.
 */
export default async function MiAdmision({ searchParams }: PageProps<"/aspirante/admision">) {
  const { etapa } = await searchParams;
  if (esEtapa(etapa)) return <VistaAdmision solicitud={SOLICITUDES_DEMO[etapa]} demo />;
  return <MiAdmisionVivo />;
}
