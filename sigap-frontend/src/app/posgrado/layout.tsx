import { AppShell } from "@/components/AppShell";
import { SesionRequerida } from "@/components/SesionRequerida";
import { PosgradoProvider } from "@/components/posgrado/PosgradoProvider";

export default function Layout({ children }: LayoutProps<"/posgrado">) {
  return (
    <AppShell rol="posgrado">
      <SesionRequerida rol="posgrado">
        <PosgradoProvider>{children}</PosgradoProvider>
      </SesionRequerida>
    </AppShell>
  );
}
