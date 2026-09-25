"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { permisoDeRuta, useAccesos } from "@/lib/admin/accesos";
import type { Rol } from "@/lib/nav";
import { usePermisos, useSesion } from "@/lib/sesion";

/** Solo deja ver la sesión del personal a quien inició sesión con sus credenciales. */
export function SesionRequerida({ rol, children }: { rol: Rol; children: React.ReactNode }) {
  const { sesion, cargado } = useSesion();
  const router = useRouter();
  const acc = useAccesos();
  // Si el administrador desactiva la cuenta, la sesión deja de valer
  const desactivada = !!sesion && (acc.inactivos.includes(sesion.correo) || acc.usuarios.some((u) => u.correo === sesion.correo && !u.activo));
  const valida = !!sesion && sesion.rol === rol && !desactivada;
  const permisos = usePermisos();
  const ruta = usePathname();
  const requerido = permisoDeRuta(ruta);

  useEffect(() => {
    if (cargado && !valida) router.replace("/login");
  }, [cargado, valida, router]);

  if (!valida)
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
