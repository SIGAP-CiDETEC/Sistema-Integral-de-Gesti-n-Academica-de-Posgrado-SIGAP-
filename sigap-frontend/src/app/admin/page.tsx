"use client";

import Link from "next/link";
import { CalendarCog, ShieldCheck, UserPlus, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Etiqueta, Kpi, Tarjeta } from "@/components/admin/ui";
import { NOMBRE_AREA, rolDeCuenta, useAccesos } from "@/lib/admin/accesos";
import { useConvocatoria } from "@/lib/convocatoria";
import { USUARIOS_DEMO } from "@/lib/sesion";

/** Inicio del Administrador: convocatoria, usuarios y actividad reciente. */
export default function AdminInicio() {
  const acc = useAccesos();
  const { conv, config, cargada } = useConvocatoria();
  if (!cargada) return null;
  const cuentas = [
    ...USUARIOS_DEMO.filter((u) => u.rol !== "admin").map((u) => ({ correo: u.correo, nombre: u.nombre, activo: !acc.inactivos.includes(u.correo) })),
    ...acc.usuarios.map((u) => ({ correo: u.correo, nombre: u.nombre, activo: u.activo })),
  ];
  const fallidos = acc.bitacora.filter((e) => e.accion === "Intento fallido").length;

  return (
    <>
      <PageHeader titulo="Administración" subtitulo="Proceso de admisión · convocatoria, roles y usuarios" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi valor={config.activa ? "Activa" : "Cerrada"} etiqueta={conv.nombre} color={config.activa ? "text-emerald-700" : "text-gray-500"} href="/admin/convocatoria" />
        <Kpi valor={cuentas.filter((c) => c.activo).length} etiqueta="Cuentas del personal activas" color="text-primary" href="/admin/usuarios" />
        <Kpi valor={acc.roles.length} etiqueta="Roles por departamento" color="text-guinda" href="/admin/roles" />
        <Kpi valor={fallidos} etiqueta="Intentos de acceso fallidos" color={fallidos ? "text-red-700" : "text-gray-500"} href="/admin/bitacora" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <Tarjeta titulo="Personal con acceso al proceso" accion={<Link href="/admin/usuarios" className="inline-flex items-center gap-1 text-sm text-primary hover:underline"><UserPlus size={14} /> Agregar analista</Link>}>
          <ul className="divide-y divide-gray-100 text-sm">
            {cuentas.map((c) => {
              const r = rolDeCuenta(acc, c.correo);
              return (
                <li key={c.correo} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span>
                    <span className={`font-medium ${c.activo ? "text-gray-900" : "text-gray-400"}`}>{c.nombre}</span>
                    <span className="block text-xs text-gray-500">
                      {c.correo} · {r ? NOMBRE_AREA[r.area] : ""}
                    </span>
                  </span>
                  <Etiqueta tono={c.activo ? "bg-indigo-50 text-primary" : "bg-gray-100 text-gray-500"}>{c.activo ? r?.nombre : "Desactivada"}</Etiqueta>
                </li>
              );
            })}
          </ul>
        </Tarjeta>
        <Tarjeta titulo="Actividad reciente">
          {acc.bitacora.length ? (
            <ul className="space-y-2.5 text-sm">
              {acc.bitacora.slice(0, 8).map((e, i) => (
                <li key={i}>
                  <span className={e.accion === "Intento fallido" ? "text-red-700" : "text-gray-900"}>{e.accion}</span>
                  <span className="block text-xs text-gray-500">
                    {new Date(e.fecha).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {e.usuario}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">Sin actividad todavía.</p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <Link href="/admin/convocatoria" className="flex items-center gap-1.5 rounded-lg border border-gray-200 p-2 hover:bg-gray-50"><CalendarCog size={14} /> Convocatoria</Link>
            <Link href="/admin/roles" className="flex items-center gap-1.5 rounded-lg border border-gray-200 p-2 hover:bg-gray-50"><ShieldCheck size={14} /> Roles</Link>
            <Link href="/admin/usuarios" className="flex items-center gap-1.5 rounded-lg border border-gray-200 p-2 hover:bg-gray-50"><Users size={14} /> Usuarios</Link>
          </div>
        </Tarjeta>
      </div>
    </>
  );
}
