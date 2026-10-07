import { AppShell } from "@/components/AppShell";
import { SesionRequerida } from "@/components/SesionRequerida";
import { PosgradoProvider } from "@/components/posgrado/PosgradoProvider";

/** Subdirección Académica: consulta el proceso de admisión sin intervenir (solo lectura). */
export default function Layout({ children }: LayoutProps<"/subdireccion">) {
  return (
    <AppShell rol="subdireccion">
      <SesionRequerida rol="subdireccion">
        <PosgradoProvider>{children}</PosgradoProvider>
      </SesionRequerida>
    </AppShell>
  );
}
