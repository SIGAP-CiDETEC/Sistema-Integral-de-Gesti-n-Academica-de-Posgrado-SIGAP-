"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound, TriangleAlert, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Aviso, Etiqueta, Tarjeta, botonPrimario, inputBase } from "@/components/admin/ui";
import {
  NOMBRE_AREA,
  PERMISOS,
  actualizarAccesos,
  registrarEventoAdmin,
  rolDeCuenta,
  useAccesos,
  type AreaPersonal,
} from "@/lib/admin/accesos";
import { USUARIOS_DEMO, useSesion } from "@/lib/sesion";

/** Contraseña temporal legible (con backend la genera el servidor y la envía por correo). */
const temporal = () => `Sigap#${Math.floor(1000 + Math.random() * 9000)}`;

/** Alta de secretarias y analistas y asignación de su rol (RF-80, US-AD-02). */
export default function Usuarios() {
  const acc = useAccesos();
  const { sesion } = useSesion();
  const quien = sesion?.correo ?? "admin";
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [area, setArea] = useState<AreaPersonal>("posgrado");
  const [rolId, setRolId] = useState("");
  const [pass, setPass] = useState(temporal);
  const [creado, setCreado] = useState<{ correo: string; pass: string } | null>(null);
  const [aviso, setAviso] = useState("");

  const rolesArea = acc.roles.filter((r) => r.area === area);
  const rol = rolesArea.find((r) => r.id === rolId);
  const c = correo.trim().toLowerCase();
  const existentes = [...USUARIOS_DEMO.map((u) => u.correo), ...acc.usuarios.map((u) => u.correo)];
  const errores = [
    ...(c && !/^[a-z0-9._-]+@ipn\.mx$/.test(c) ? ["Usa un correo institucional @ipn.mx."] : []),
    ...(c && existentes.includes(c) ? ["Ya existe una cuenta con ese correo."] : []),
  ];
  const listo = nombre.trim() && c && !errores.length && rol && pass.length >= 8;

  const crear = () => {
    if (!rol) return;
    actualizarAccesos((e) => ({ ...e, usuarios: [...e.usuarios, { correo: c, nombre: nombre.trim(), contrasena: pass, rolId: rol.id, activo: true, creadoEl: new Date().toISOString() }] }));
    registrarEventoAdmin({ usuario: quien, modulo: "Usuarios", accion: "Creó usuario y asignó rol", detalle: `${nombre.trim()} <${c}> · ${rol.nombre}` });
    setCreado({ correo: c, pass });
    setNombre("");
    setCorreo("");
    setRolId("");
    setPass(temporal());
  };

  // Todas las cuentas del personal del proceso (precargadas + auxiliares), sin el administrador
  const filas = [
    ...USUARIOS_DEMO.filter((u) => u.rol !== "admin").map((u) => ({ correo: u.correo, nombre: u.nombre, aux: false, activo: !acc.inactivos.includes(u.correo) })),
    ...acc.usuarios.map((u) => ({ correo: u.correo, nombre: u.nombre, aux: true, activo: u.activo })),
  ];

  const cambiarRol = (correoU: string, nuevoId: string) => {
    const r = acc.roles.find((x) => x.id === nuevoId);
    actualizarAccesos((e) =>
      e.usuarios.some((u) => u.correo === correoU)
        ? { ...e, usuarios: e.usuarios.map((u) => (u.correo === correoU ? { ...u, rolId: nuevoId } : u)) }
        : { ...e, rolDe: { ...e.rolDe, [correoU]: nuevoId } },
    );
    registrarEventoAdmin({ usuario: quien, modulo: "Usuarios", accion: "Cambió rol", detalle: `${correoU} → ${r?.nombre}` });
    setAviso(`Rol de ${correoU} actualizado.`);
  };
  const alternarActivo = (correoU: string, activo: boolean) => {
    actualizarAccesos((e) =>
      e.usuarios.some((u) => u.correo === correoU)
        ? { ...e, usuarios: e.usuarios.map((u) => (u.correo === correoU ? { ...u, activo } : u)) }
        : { ...e, inactivos: activo ? e.inactivos.filter((x) => x !== correoU) : [...e.inactivos, correoU] },
    );
    registrarEventoAdmin({ usuario: quien, modulo: "Usuarios", accion: activo ? "Reactivó cuenta" : "Desactivó cuenta", detalle: correoU });
    setAviso(`Cuenta ${correoU} ${activo ? "reactivada" : "desactivada"}.`);
  };
  const restablecer = (correoU: string) => {
    const nueva = temporal();
    actualizarAccesos((e) => ({ ...e, usuarios: e.usuarios.map((u) => (u.correo === correoU ? { ...u, contrasena: nueva } : u)) }));
    registrarEventoAdmin({ usuario: quien, modulo: "Usuarios", accion: "Restableció contraseña", detalle: correoU });
    setAviso(`Nueva contraseña temporal de ${correoU}: ${nueva}`);
  };

  return (
    <>
      <PageHeader titulo="Usuarios auxiliares" subtitulo="Alta de secretarias y analistas y asignación segura de roles" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Tarjeta titulo={<span className="flex items-center gap-2"><UserPlus size={17} className="text-primary" /> Nuevo usuario</span>}>
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="font-medium text-gray-900">Nombre completo</span>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={`${inputBase} mt-1`} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-900">Correo institucional</span>
              <input value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="nombre@ipn.mx" className={`${inputBase} mt-1 ${errores.length ? "border-red-400" : ""}`} />
              {errores.map((e) => (
                <span key={e} className="block text-xs text-red-600">
                  {e}
                </span>
              ))}
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-900">Departamento</span>
              <select
                value={area}
                onChange={(e) => {
                  setArea(e.target.value as AreaPersonal);
                  setRolId("");
                }}
                className={`${inputBase} mt-1`}
              >
                <option value="posgrado">{NOMBRE_AREA.posgrado}</option>
                <option value="uteycv">{NOMBRE_AREA.uteycv}</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-900">Rol asignado</span>
              <select value={rolId} onChange={(e) => setRolId(e.target.value)} className={`${inputBase} mt-1`}>
                <option value="">Elige un rol</option>
                {rolesArea.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-900">Contraseña temporal</span>
              <div className="mt-1 flex gap-2">
                <input value={pass} onChange={(e) => setPass(e.target.value)} className={`${inputBase} font-mono`} />
                <button type="button" onClick={() => setPass(temporal())} className="shrink-0 rounded-lg border border-gray-300 px-3 text-xs text-gray-700 hover:bg-gray-50">
                  Generar
                </button>
              </div>
              <span className="text-xs text-gray-500">Mínimo 8 caracteres. Con backend se envía por correo.</span>
            </label>
            <button type="button" className={botonPrimario} disabled={!listo} onClick={crear}>
              Crear usuario
            </button>
            {creado && (
              <Aviso tono="exito" titulo="Usuario creado">
                Ya puede iniciar sesión con <span className="font-mono">{creado.correo}</span> y la contraseña temporal <span className="font-mono">{creado.pass}</span>.
              </Aviso>
            )}
          </div>
        </Tarjeta>

        <Tarjeta titulo="Resumen de acceso" accion={rol && <Etiqueta tono="bg-emerald-50 text-emerald-700">{rol.nombre}</Etiqueta>}>
          {rol ? (
            <>
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-gray-100">
                  {PERMISOS.filter((p) => p.area === area).map((p) => (
                    <tr key={p.id}>
                      <td className="py-2.5 text-gray-800">{p.nombre}</td>
                      <td className={`py-2.5 text-right text-xs font-medium ${rol.permisos.includes(p.id) ? "text-emerald-700" : "text-gray-400"}`}>
                        {rol.permisos.includes(p.id) ? "Permitido" : "Sin acceso"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-gray-500">Al entrar verá solo estas pestañas en la sesión de {NOMBRE_AREA[area]}.</p>
            </>
          ) : (
            <p className="text-sm text-gray-500">Elige un rol para ver a qué tendrá acceso.</p>
          )}
          <div className="mt-4">
            <Aviso tono="alerta" titulo="Principio de menor privilegio">
              <span className="flex items-start gap-1.5">
                <TriangleAlert size={14} className="mt-0.5 shrink-0" /> Evita acumular roles. Revisa accesos periódicamente y retira permisos que ya no se necesiten.
              </span>
            </Aviso>
          </div>
        </Tarjeta>
      </div>

      <Tarjeta titulo="Cuentas del personal" className="mt-6">
        {aviso && (
          <p className="mb-3 flex items-center gap-1.5 text-sm text-emerald-700">
            <CheckCircle2 size={15} /> {aviso}
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="py-2 font-medium">Usuario</th>
                <th className="py-2 font-medium">Departamento</th>
                <th className="py-2 font-medium">Rol</th>
                <th className="py-2 font-medium">Estado</th>
                <th className="py-2 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filas.map((f) => {
                const r = rolDeCuenta(acc, f.correo);
                return (
                  <tr key={f.correo} className={f.activo ? "" : "text-gray-400"}>
                    <td className="py-2.5">
                      <p className="font-medium">{f.nombre}</p>
                      <p className="text-xs text-gray-500">
                        {f.correo} {f.aux ? "· auxiliar" : "· cuenta precargada"}
                      </p>
                    </td>
                    <td className="py-2.5">{r ? NOMBRE_AREA[r.area] : "—"}</td>
                    <td className="py-2.5">
                      <select aria-label={`Rol de ${f.correo}`} value={r?.id ?? ""} onChange={(e) => cambiarRol(f.correo, e.target.value)} className={`${inputBase} max-w-[240px] py-1.5`}>
                        {acc.roles
                          .filter((x) => !r || x.area === r.area)
                          .map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.nombre}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="py-2.5">
                      <Etiqueta tono={f.activo ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}>{f.activo ? "Activa" : "Desactivada"}</Etiqueta>
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex justify-end gap-3 text-xs">
                        {f.aux && (
                          <button type="button" onClick={() => restablecer(f.correo)} className="inline-flex items-center gap-1 text-primary hover:underline">
                            <KeyRound size={12} /> Restablecer contraseña
                          </button>
                        )}
                        <button type="button" onClick={() => alternarActivo(f.correo, !f.activo)} className={f.activo ? "text-red-700 hover:underline" : "text-primary hover:underline"}>
                          {f.activo ? "Desactivar" : "Reactivar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-500">Los cambios de rol y de estado aplican en cuanto el usuario vuelve a cargar su sesión.</p>
      </Tarjeta>
    </>
  );
}
