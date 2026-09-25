import { AppShell } from "@/components/AppShell";
import { SesionRequerida } from "@/components/SesionRequerida";
import { PosgradoProvider } from "@/components/posgrado/PosgradoProvider";

/** Control Escolar (UTEyCV): comparte el estado del proceso de admisión con Posgrado. */
export default function Layout({ children }: LayoutProps<"/uteycv">) {
  return (
    <AppShell rol="uteycv">
      <SesionRequerida rol="uteycv">
        <PosgradoProvider>{children}</PosgradoProvider>
      </SesionRequerida>
    </AppShell>
  );
}
