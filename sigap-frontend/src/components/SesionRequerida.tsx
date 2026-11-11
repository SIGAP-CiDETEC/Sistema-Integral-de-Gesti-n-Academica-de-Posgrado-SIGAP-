"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { permisoDeRuta, useAccesos } from "@/lib/admin/accesos";
import type { Rol } from "@/lib/nav";
import { cambiarRolSesion, refrescarSesionApi, usePermisos, useSesion } from "@/lib/sesion";

/** Solo deja ver la sesión del personal a quien inició sesión con sus credenciales. */
export function SesionRequerida({ rol, children }: { rol: Rol; children: React.ReactNode }) {
  const { sesion, cargado } = useSesion();
  const router = useRouter();
  const acc = useAccesos();
  // Si el administrador desactiva la cuenta, la sesión deja de valer
  const desactivada = !!sesion && (acc.inactivos.includes(sesion.correo) || acc.usuarios.some((u) => u.correo === sesion.correo && !u.activo));
  // Una cuenta con varias áreas (p. ej. profesora y Subdirección) entra a cualquiera de sus sesiones
  const otraPropia = !!sesion && sesion.rol !== rol && !!sesion.roles?.includes(rol);
  const valida = !!sesion && (sesion.rol === rol || otraPropia) && !desactivada;
  const permisos = usePermisos();
  const ruta = usePathname();
  const requerido = permisoDeRuta(ruta);

  useEffect(() => {
    // Con sesión de otra área (p. ej. ya no tiene Subdirección): a su propio inicio; sin sesión: al login
    if (cargado && !valida) router.replace(sesion && !desactivada && sesion.rol !== rol ? `/${sesion.rol}` : "/login");
  }, [cargado, valida, router, sesion, desactivada, rol]);
  useEffect(() => {
    if (otraPropia) cambiarRolSesion(rol);
  }, [otraPropia, rol]);
  useEffect(() => {
    if (cargado && sesion) void refrescarSesionApi();
  }, [cargado, sesion]);

  if (!valida || otraPropia)
    return (
      <p className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 size={16} className="animate-spin" /> Verificando sesión…
      </p>
    );
  if (requerido && permisos && !permisos.has(requerido.id))
    return (
      <div className="mx-auto mt-10 max-w-md rounded-xl border border-gray-200 bg-white p-6 text-center">
        <ShieldAlert size={28} className="mx-auto text-guinda" />
        <h1 className="mt-3 text-lg font-semibold text-gray-900">No tienes acceso a esta sección</h1>
        <p className="mt-1 text-sm text-gray-600">
          Tu rol ({sesion?.puesto}) no incluye el permiso “{requerido.nombre}”. Si lo necesitas, pídelo al administrador del sistema.
        </p>
        <Link href={`/${rol}`} className="mt-4 inline-block text-sm text-primary underline">
          Volver al inicio
        </Link>
      </div>
    );
  return <>{children}</>;
}
