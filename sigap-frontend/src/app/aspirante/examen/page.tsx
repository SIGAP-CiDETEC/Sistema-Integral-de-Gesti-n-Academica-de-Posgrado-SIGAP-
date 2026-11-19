"use client";

import { PresentarExamen } from "@/components/examen/PresentarExamen";
import { EnDemostracion } from "@/components/examen/ExamenPosgrado";

/** Examen de admisión en línea del aspirante (lo habilita el Departamento de Posgrado). */
export default function Page() {
  return (
    <EnDemostracion>
      <PresentarExamen />
    </EnDemostracion>
  );
}
