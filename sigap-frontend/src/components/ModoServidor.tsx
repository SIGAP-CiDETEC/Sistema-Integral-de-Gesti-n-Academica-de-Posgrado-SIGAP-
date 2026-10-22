"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KeyRound, Lock } from "lucide-react";
import { MODO_API } from "@/lib/api";
import { NAV_SERVIDOR, type Rol } from "@/lib/nav";
import { useSesion } from "@/lib/sesion";

/** Sesiones que ya trabajan con el servidor real (prueba de la entrevista colegiada). */
export const ROLES_CON_SERVIDOR: Rol[] = ["posgrado", "profesor", "subdireccion"];

/**
 * Con el servidor real: bloquea las sesiones que aún no están conectadas y pide cambiar
 * la contraseña temporal. Sin servidor no hace nada.
 */
export function ModoServidor({ rol, children }: { rol: Rol; children: React.ReactNode }) {
  const { sesion } = useSesion();
  const ruta = usePathname();
  if (!MODO_API) return <>{children}</>;
  // Solo las pantallas del menú conectado (y sus detalles); las demás aún trabajan con datos de ejemplo
  const permitida = (NAV_SERVIDOR[rol] ?? []).some((i) => ruta === i.href || (i.href !== `/${rol}` && ruta.startsWith(`${i.href}/`)));
  if (!ROLES_CON_SERVIDOR.includes(rol) || !permitida)
    return (
      <div className="mx-auto mt-10 max-w-md rounded-xl border border-gray-200 bg-white p-6 text-center">
        <Lock size={26} className="mx-auto text-guinda" />
        <h1 className="mt-3 text-lg font-semibold text-gray-900">Sección aún no disponible</h1>
        <p className="mt-1 text-sm text-gray-600">Esta versión de SIGAP es la prueba de la entrevista colegiada; esta sección todavía no está conectada al servidor.</p>
        <Link href={ROLES_CON_SERVIDOR.includes(rol) ? `/${rol}` : "/login"} className="mt-4 inline-block text-sm text-primary underline">
          {ROLES_CON_SERVIDOR.includes(rol) ? "Volver al inicio" : "Ir al inicio de sesión"}
        </Link>
      </div>
    );
  return (
    <>
      {sesion?.debeCambiarContrasena && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="flex items-center gap-2">
            <KeyRound size={16} /> Entraste con una contraseña temporal. Cámbiala para proteger tu cuenta.
          </span>
          <Link href="/cambiar-contrasena" className="font-medium underline">
            Cambiar contraseña
          </Link>
        </div>
      )}
      {children}
    </>
  );
}
