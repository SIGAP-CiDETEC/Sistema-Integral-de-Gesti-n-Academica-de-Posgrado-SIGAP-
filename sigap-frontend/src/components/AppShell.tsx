import { Sidebar } from "./Sidebar";
import type { Rol } from "@/lib/nav";

/** Estructura común de las sesiones: menú lateral azul marino + contenido. */
export function AppShell({ rol, children }: { rol: Rol; children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:flex">
      <Sidebar rol={rol} />
      <main className="flex-1 px-4 py-6 sm:px-8 lg:py-8">{children}</main>
    </div>
  );
}
