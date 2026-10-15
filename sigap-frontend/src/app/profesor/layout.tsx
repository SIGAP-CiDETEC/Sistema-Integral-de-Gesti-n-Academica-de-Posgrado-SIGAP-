import { AppShell } from "@/components/AppShell";
import { SesionRequerida } from "@/components/SesionRequerida";
import { PosgradoProvider } from "@/components/posgrado/PosgradoProvider";
import { ProfesorActual } from "@/components/profesor/ProfesorActual";

/** Profesores (colegiados y de asignatura): sínodo de entrevistas (acta MTC-EC) y calificaciones del propedéutico. */
export default function Layout({ children }: LayoutProps<"/profesor">) {
  return (
    <AppShell rol="profesor">
      <SesionRequerida rol="profesor">
        <PosgradoProvider>
          <ProfesorActual />
          {children}
        </PosgradoProvider>
      </SesionRequerida>
    </AppShell>
  );
}
