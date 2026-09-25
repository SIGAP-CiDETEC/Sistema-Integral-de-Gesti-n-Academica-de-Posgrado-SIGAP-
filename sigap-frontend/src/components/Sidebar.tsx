"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logos } from "./Logos";
import { NavIcon } from "./NavIcon";
import { NAV, ROL_LABEL, USUARIO_DEMO, type Rol } from "@/lib/nav";
import { cerrarSesion, usePermisos, useSesion } from "@/lib/sesion";
import { permisoDeRuta } from "@/lib/admin/accesos";

export function Sidebar({ rol }: { rol: Rol }) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const permisos = usePermisos();
  // Solo las pestañas que su rol permite (RF-80, menor privilegio)
  const items = NAV[rol].filter((i) => {
    const p = permisoDeRuta(i.href);
    return !p || !permisos || permisos.has(p.id);
  });
  const { sesion } = useSesion();
  const personal = sesion && sesion.rol === rol ? sesion : null;

  // La ruta raíz del rol (/aspirante) solo se marca activa si coincide exacto
  const esActivo = (href: string) =>
    href === items[0].href ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {/* Barra superior en móvil (RNF-03 diseño responsivo) */}
      <div className="sticky top-0 z-30 flex items-center justify-between bg-navy-900 px-4 py-3 text-white lg:hidden">
        <span className="font-semibold">SIGAP</span>
        <button
          onClick={() => setAbierto(true)}
          aria-label="Abrir menú"
          className="rounded-md p-1 hover:bg-white/10"
        >
          <Menu size={22} />
        </button>
      </div>

      {abierto && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setAbierto(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-navy-900 px-4 py-6 text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setAbierto(false)}
          aria-label="Cerrar menú"
          className="absolute right-3 top-3 rounded-md p-1 hover:bg-white/10 lg:hidden"
        >
          <X size={20} />
        </button>

        <Logos size={44} onDark className="self-start" />

        <div className="mt-4">
          <p className="text-lg font-semibold leading-tight">SIGAP</p>
          <p className="text-[11px] tracking-wide text-white/60">CIDETEC · IPN</p>
        </div>

        <span className="mt-4 self-start rounded-full bg-guinda-soft px-3 py-0.5 text-xs font-medium text-guinda">
          {ROL_LABEL[rol]}
        </span>

        <nav className="mt-6 flex flex-col gap-1">
          {items.map((item) => {
            const activo = esActivo(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setAbierto(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  activo
                    ? "bg-primary font-medium text-white"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                <NavIcon name={item.icon} size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-white/10 pt-4">
          <p className="text-sm">{personal?.nombre ?? USUARIO_DEMO[rol]}</p>
          {personal && <p className="truncate text-[11px] text-white/60">{personal.puesto}</p>}
          {personal && <p className="truncate text-[11px] text-white/60">{personal.correo}</p>}
          <p className="text-xs text-white/60">
            Sesión segura ·{" "}
            <Link href={personal ? "/login" : "/"} onClick={() => personal && cerrarSesion()} className="underline-offset-2 hover:underline">
              Cerrar sesión
            </Link>
          </p>
        </div>
      </aside>
    </>
  );
}
