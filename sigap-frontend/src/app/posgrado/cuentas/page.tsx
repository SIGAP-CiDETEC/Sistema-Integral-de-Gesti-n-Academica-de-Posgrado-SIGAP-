"use client";

import { PageHeader } from "@/components/PageHeader";
import { CuentasServidor } from "@/components/CuentasServidor";
import { Regresar } from "@/components/posgrado/ui";

/** Posgrado atiende a los profesores que olvidaron su contraseña (sin esperar al Administrador). */
export default function CuentasProfesores() {
  return (
    <>
      <Regresar href="/posgrado" t="Inicio" />
      <PageHeader titulo="Cuentas de profesores" subtitulo="Restablece la contraseña de un profesor que la olvidó" />
      <CuentasServidor alcance="posgrado" />
    </>
  );
}
