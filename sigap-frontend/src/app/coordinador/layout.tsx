import { AppShell } from "@/components/AppShell";
import { SesionRequerida } from "@/components/SesionRequerida";
import { PosgradoProvider } from "@/components/posgrado/PosgradoProvider";

/** Coordinador del programa: únicamente firma las actas de los cursos propedéuticos (SIP-12). */
export default function Layout({ children }: LayoutProps<"/coordinador">) {
  return (
    <AppShell rol="coordinador">
      <SesionRequerida rol="coordinador">
        <PosgradoProvider>{children}</PosgradoProvider>
      </SesionRequerida>
    </AppShell>
  );
}
