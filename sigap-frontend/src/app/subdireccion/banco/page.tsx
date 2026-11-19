"use client";

import { PageHeader } from "@/components/PageHeader";
import { BancoPreguntas } from "@/components/examen/BancoPreguntas";
import { EnDemostracion } from "@/components/examen/ExamenPosgrado";

/** La Subdirección Académica también puede revisar y editar el banco de preguntas del examen. */
export default function Page() {
  return (
    <>
      <PageHeader titulo="Banco de preguntas" subtitulo="Preguntas del examen de admisión: revisar, corregir, agregar o importar de Moodle" />
      <EnDemostracion>
        <BancoPreguntas />
      </EnDemostracion>
    </>
  );
}
