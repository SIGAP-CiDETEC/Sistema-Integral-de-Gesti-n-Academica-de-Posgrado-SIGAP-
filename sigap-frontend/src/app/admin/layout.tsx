import { AppShell } from "@/components/AppShell";
import { SesionRequerida } from "@/components/SesionRequerida";

export default function Layout({ children }: LayoutProps<"/admin">) {
  return (
    <AppShell rol="admin">
      <SesionRequerida rol="admin">{children}</SesionRequerida>
    </AppShell>
  );
}
