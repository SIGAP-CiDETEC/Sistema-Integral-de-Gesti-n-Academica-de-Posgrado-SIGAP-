import { AppShell } from "@/components/AppShell";
import { AvisoCuentaAlumno } from "@/components/alumno/AvisoCuentaAlumno";
import { BloqueoProceso } from "@/components/expediente/BloqueoProceso";
import { ExpedienteProvider } from "@/components/expediente/ExpedienteProvider";
import { DEMO_ASPIRANTES, MODO_API } from "@/lib/api";

export default function Layout({ children }: LayoutProps<"/aspirante">) {
  // Con el servidor real el portal (primera etapa) solo trae la elección de evaluación: sin expediente del navegador
  if (MODO_API && !DEMO_ASPIRANTES) return <AppShell rol="aspirante">{children}</AppShell>;
  return (
    <AppShell rol="aspirante">
      <ExpedienteProvider>
        <AvisoCuentaAlumno />
        <BloqueoProceso>{children}</BloqueoProceso>
      </ExpedienteProvider>
    </AppShell>
  );
}
