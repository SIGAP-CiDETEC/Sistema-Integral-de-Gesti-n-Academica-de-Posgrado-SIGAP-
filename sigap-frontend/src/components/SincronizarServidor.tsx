"use client";

import { useEffect } from "react";
import { MODO_API } from "@/lib/api";
import { sincronizarAlmacenes } from "@/lib/almacen-remoto";
import { useSesion } from "@/lib/sesion";

/** Con el servidor real: trae la configuración compartida al abrir el sistema y cada vez que cambia la sesión. */
export function SincronizarServidor() {
  const { sesion } = useSesion();
  const quien = sesion?.correo ?? "";
  useEffect(() => {
    if (MODO_API) void sincronizarAlmacenes();
  }, [quien]);
  return null;
}
