import { AppShell } from "@/components/AppShell";
import { AvisoCuentaAlumno } from "@/components/alumno/AvisoCuentaAlumno";
import { BloqueoProceso } from "@/components/expediente/BloqueoProceso";
import { ExpedienteProvider } from "@/components/expediente/ExpedienteProvider";

export default function Layout({ children }: LayoutProps<"/aspirante">) {
  return (
    <AppShell rol="aspirante">
      <ExpedienteProvider>
        <AvisoCuentaAlumno />
        <BloqueoProceso>{children}</BloqueoProceso>
      </ExpedienteProvider>
    </AppShell>
  );
}
