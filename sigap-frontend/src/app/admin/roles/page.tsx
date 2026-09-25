"use client";

import { useState } from "react";
import { CheckCircle2, Info, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Aviso, Etiqueta, Tarjeta, botonPrimario, botonSecundario, inputBase } from "@/components/admin/ui";
import {
  NOMBRE_AREA,
  PERMISOS,
  actualizarAccesos,
  registrarEventoAdmin,
  rolDeCuenta,
  useAccesos,
  type AreaPersonal,
  type RolPersonal,
} from "@/lib/admin/accesos";
import { USUARIOS_DEMO, useSesion } from "@/lib/sesion";

/** Roles por departamento con permisos granulares (RF-79, US-AD-01, RNF-01). */
export default function Roles() {
  const acc = useAccesos();
  const { sesion } = useSesion();
  const [selId, setSelId] = useState<string | null>(acc.roles[0]?.id ?? null);
  const [borrador, setBorrador] = useState<RolPersonal | null>(null);
  const [guardado, setGuardado] = useState("");

  const cuentas = [...USUARIOS_DEMO.filter((u) => u.rol !== "admin").map((u) => u.correo), ...acc.usuarios.map((u) => u.correo)];
  const usuariosDe = (id: string) => cuentas.filter((c) => rolDeCuenta(acc, c)?.id === id).length;
  const actual = acc.roles.find((r) => r.id === selId);
  const r = borrador ?? actual;
  const nuevo = !!borrador && !acc.roles.some((x) => x.id === borrador.id);
  const quien = sesion?.correo ?? "admin";

  const editar = (patch: Partial<RolPersonal>) => {
    setBorrador({ ...(r as RolPersonal), ...patch });
    setGuardado("");
  };

  const guardar = () => {
    if (!r) return;
    const antes = acc.roles.find((x) => x.id === r.id);
    const quitados = antes ? antes.permisos.filter((p) => !r.permisos.includes(p)) : [];
    const agregados = r.permisos.filter((p) => !antes?.permisos.includes(p));
    const nombreP = (id: string) => PERMISOS.find((p) => p.id === id)?.nombre ?? id;
    actualizarAccesos((e) => ({ ...e, roles: antes ? e.roles.map((x) => (x.id === r.id ? { ...r, nombre: r.nombre.trim() } : x)) : [...e.roles, { ...r, nombre: r.nombre.trim() }] }));
    registrarEventoAdmin({
      usuario: quien,
      modulo: "Roles",
      accion: antes ? "Editó rol" : "Creó rol",
      detalle: [`${r.nombre.trim()} (${NOMBRE_AREA[r.area]})`, agregados.length ? `agregó: ${agregados.map(nombreP).join(", ")}` : "", quitados.length ? `retiró: ${quitados.map(nombreP).join(", ")}` : ""].filter(Boolean).join(" · "),
    });
    setBorrador(null);
    setSelId(r.id);
    setGuardado(antes ? "Rol actualizado. Los usuarios con este rol ven los cambios de inmediato." : "Rol creado; ya se puede asignar a usuarios.");
  };

  const eliminar = () => {
    if (!actual) return;
    actualizarAccesos((e) => ({ ...e, roles: e.roles.filter((x) => x.id !== actual.id) }));
    registrarEventoAdmin({ usuario: quien, modulo: "Roles", accion: "Eliminó rol", detalle: actual.nombre });
    setSelId(acc.roles.find((x) => x.id !== actual.id)?.id ?? null);
    setGuardado("Rol eliminado.");
  };

  return (
    <>
      <PageHeader titulo="Roles por departamento" subtitulo="Control de acceso basado en menor privilegio" />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Tarjeta titulo="Roles existentes">
          <ul className="space-y-1.5">
            {acc.roles.map((x) => (
              <li key={x.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelId(x.id);
                    setBorrador(null);
                    setGuardado("");
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm ${selId === x.id && !nuevo ? "bg-indigo-50 text-primary" : "hover:bg-gray-50"}`}
                >
                  <span className="block font-medium">{x.nombre}</span>
                  <span className="text-xs text-gray-500">
                    {NOMBRE_AREA[x.area]} · {usuariosDe(x.id)} usuario(s) · {x.permisos.length} permiso(s)
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className={`${botonSecundario} mt-3 w-full`}
            onClick={() => {
              setBorrador({ id: `rol-${Date.now()}`, nombre: "", area: "posgrado", permisos: [] });
              setGuardado("");
            }}
          >
            <Plus size={15} /> Crear rol
          </button>
        </Tarjeta>

        {r ? (
          <div className="space-y-4">
            <Tarjeta titulo={nuevo ? "Nuevo rol" : `Editar rol · ${actual?.nombre}`} accion={r.base ? <Etiqueta>Rol principal del área</Etiqueta> : undefined}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="font-medium text-gray-900">Nombre del rol</span>
                  <input value={r.nombre} onChange={(e) => editar({ nombre: e.target.value })} placeholder="Ej. Analista de validaciones de Posgrado" className={`${inputBase} mt-1`} />
                </label>
                <label className="text-sm">
                  <span className="font-medium text-gray-900">Departamento</span>
                  <select
                    value={r.area}
                    disabled={!nuevo}
                    onChange={(e) => editar({ area: e.target.value as AreaPersonal, permisos: [] })}
                    className={`${inputBase} mt-1 disabled:bg-gray-50`}
                  >
                    <option value="posgrado">{NOMBRE_AREA.posgrado}</option>
                    <option value="uteycv">{NOMBRE_AREA.uteycv}</option>
                  </select>
                </label>
              </div>
              <table className="mt-4 w-full text-left text-sm">
                <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="py-2 font-medium">Permiso</th>
                    <th className="py-2 text-right font-medium">Asignado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {PERMISOS.filter((p) => p.area === r.area).map((p) => {
                    const on = r.permisos.includes(p.id);
                    return (
                      <tr key={p.id}>
                        <td className="py-2.5 text-gray-800">{p.nombre}</td>
                        <td className="py-2.5 text-right">
                          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-gray-600">
                            {on ? "Sí" : "No"}
                            <input
                              type="checkbox"
                              aria-label={p.nombre}
                              checked={on}
                              onChange={() => editar({ permisos: on ? r.permisos.filter((x) => x !== p.id) : [...r.permisos, p.id] })}
                              className="h-4 w-4 accent-[var(--color-primary)]"
                            />
                          </label>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-gray-500">El Inicio del área siempre está disponible; cada permiso abre una pestaña.</p>
            </Tarjeta>

            <Aviso tono="info" titulo="Menor privilegio">
              <span className="flex items-start gap-1.5">
                <Info size={14} className="mt-0.5 shrink-0" /> Asigna únicamente los permisos indispensables para las funciones del rol.
              </span>
            </Aviso>
            {guardado && (
              <p className="flex items-center gap-1.5 text-sm text-emerald-700">
                <CheckCircle2 size={15} /> {guardado}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2">
              {!nuevo && actual && !actual.base ? (
                <button
                  type="button"
                  disabled={usuariosDe(actual.id) > 0}
                  title={usuariosDe(actual.id) ? "Tiene usuarios asignados: reasígnalos primero" : undefined}
                  onClick={eliminar}
                  className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 size={14} /> Eliminar rol
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                {borrador && (
                  <button type="button" className={botonSecundario} onClick={() => setBorrador(null)}>
                    Cancelar
                  </button>
                )}
                <button type="button" className={botonPrimario} disabled={!borrador || !r.nombre.trim() || !r.permisos.length} onClick={guardar}>
                  Guardar rol
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Selecciona un rol.</p>
        )}
      </div>
    </>
  );
}
