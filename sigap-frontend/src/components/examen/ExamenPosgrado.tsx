"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Regresar } from "@/components/posgrado/ui";
import { AplicacionExamen } from "./AplicacionExamen";
import { BancoPreguntas } from "./BancoPreguntas";
import { ConfigExamenPosgrado } from "./ConfigExamen";

const PESTANAS = [
  { id: "banco", t: "Banco de preguntas" },
  { id: "config", t: "Configuración" },
  { id: "aplicacion", t: "Aplicación y resultados" },
] as const;

/** Examen de admisión en línea (Posgrado): banco, configuración y aplicación. */
export function ExamenPosgrado() {
  const [p, setP] = useState<(typeof PESTANAS)[number]["id"]>("banco");
  return (
    <>
      <Regresar href="/posgrado/evaluacion" t="Evaluación" />
      <PageHeader titulo="Examen en línea" subtitulo="Banco de preguntas, configuración y aplicación del examen de admisión" />
      <EnDemostracion>
        <div className="mb-5 flex flex-wrap gap-1 border-b border-gray-200" role="tablist">
          {PESTANAS.map((x) => (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={p === x.id}
              onClick={() => setP(x.id)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${p === x.id ? "border-primary text-primary" : "border-transparent text-gray-600 hover:text-gray-900"}`}
            >
              {x.t}
            </button>
          ))}
        </div>
        {p === "banco" && <BancoPreguntas />}
        {p === "config" && <ConfigExamenPosgrado />}
        {p === "aplicacion" && <AplicacionExamen />}
      </EnDemostracion>
    </>
  );
}

/** Envoltura del módulo (antes solo existía en la demostración; ahora también funciona con el servidor). */
export function EnDemostracion({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
