import { AppShell } from "@/components/AppShell";
import { BloqueoProceso } from "@/components/expediente/BloqueoProceso";
import { ExpedienteProvider } from "@/components/expediente/ExpedienteProvider";

export default function Layout({ children }: LayoutProps<"/aspirante">) {
  return (
    <AppShell rol="aspirante">
      <ExpedienteProvider>
        <BloqueoProceso>{children}</BloqueoProceso>
      </ExpedienteProvider>
    </AppShell>
  );
}
