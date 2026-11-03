"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, KeyRound, Loader2, Search, ShieldAlert, UserPlus, UserRoundCheck, UserRoundX } from "lucide-react";
import { api } from "@/lib/api";
import { Aviso, Etiqueta, Tarjeta, botonPrimario, botonSecundario, inputBase } from "@/components/posgrado/ui";

type Cuenta = {
  id: string;
  nombre: string;
  correo: string;
  acceso: string;
  area: string;
  puesto: string;
  activo: boolean;
  temporal: boolean;
  ultimoAcceso: string | null;
  yo: boolean;
};
type Entregada = { nombre: string; usuario: string; temporal: string; nueva?: boolean };

const AREA: Record<string, string> = {
  PROFESORES: "Profesor",
  POSGRADO: "Posgrado",
  SUBDIRECCION: "Subdirección",
  UTEYCV: "UTEyCV",
  ADMINISTRADOR: "Administrador",
};
const fecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Nunca";

/** La contraseña temporal recién generada: se muestra una sola vez. */
function TemporalEntregada({ e, cerrar }: { e: Entregada; cerrar: () => void }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div role="alert" className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950">
      <p className="font-semibold">{e.nueva ? `Cuenta creada para ${e.nombre}` : `Contraseña restablecida para ${e.nombre}`}</p>
      <p className="mt-1">
        Usuario: <b>{e.usuario}</b>
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span>Contraseña temporal:</span>
        <code className="rounded-md border border-emerald-300 bg-white px-2.5 py-1 font-mono text-base tracking-wide">{e.temporal}</code>
        <button
          type="button"
          className={botonSecundario}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(e.temporal);
              setCopiado(true);
            } catch {
              /* el navegador no permitió copiar: se puede seleccionar a mano */
            }
          }}
        >
          {copiado ? <Check size={15} /> : <Copy size={15} />} {copiado ? "Copiada" : "Copiar"}
        </button>
      </div>
      <ul className="mt-3 list-disc space-y-0.5 pl-5 text-xs text-emerald-900">
        <li>Esta contraseña <b>solo se muestra ahora</b>: al cerrar este aviso ya no se puede volver a ver.</li>
        <li>Entrégala en persona o a su correo institucional; no por WhatsApp ni por redes sociales.</li>
        <li>Al entrar, el sistema le pedirá crear su propia contraseña. {e.nueva ? "" : "Sus sesiones abiertas se cerraron."}</li>
      </ul>
      <button type="button" className={`${botonPrimario} mt-3`} onClick={cerrar}>
        Ya la entregué, cerrar
      </button>
    </div>
  );
}

/**
 * Cuentas del personal con el servidor real.
 * - admin: todas las cuentas; restablecer contraseña, activar o desactivar y crear cuentas.
 * - posgrado: solo las de los profesores; restablecer contraseña.
 */
export function CuentasServidor({ alcance }: { alcance: "admin" | "posgrado" }) {
  const [cuentas, setCuentas] = useState<Cuenta[] | null>(null);
  const [error, setError] = useState("");
  const [busca, setBusca] = useState("");
  const [confirmar, setConfirmar] = useState<{ c: Cuenta; accion: "restablecer" | "desactivar" | "activar" } | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [entregada, setEntregada] = useState<Entregada | null>(null);
  const [nueva, setNueva] = useState({ nombre: "", correo: "", area: "POSGRADO", puesto: "" });
  const [creando, setCreando] = useState(false);
  const admin = alcance === "admin";

  const [version, setVersion] = useState(0);
  const cargar = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let vigente = true;
    api<Cuenta[]>("/usuarios")
      .then((r) => vigente && setCuentas(r))
      .catch((e) => vigente && setError(e instanceof Error ? e.message : "No se pudieron cargar las cuentas"));
    return () => {
      vigente = false;
    };
  }, [version]);

  const visibles = useMemo(() => {
    const q = busca
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
    const sin = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
    return (cuentas ?? []).filter((c) => !q || sin(`${c.nombre} ${c.correo} ${c.acceso} ${c.puesto}`).includes(q));
  }, [cuentas, busca]);

  const ejecutar = async () => {
    if (!confirmar) return;
    setTrabajando(true);
    try {
      if (confirmar.accion === "restablecer") {
        const r = await api<{ temporal: string; nombre: string; usuario: string }>(`/usuarios/${confirmar.c.id}/restablecer`, { metodo: "POST", cuerpo: {} });
        setEntregada(r);
      } else {
        await api(`/usuarios/${confirmar.c.id}`, { metodo: "PATCH", cuerpo: { activo: confirmar.accion === "activar" } });
      }
      setConfirmar(null);
      setError("");
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar");
      setConfirmar(null);
    } finally {
      setTrabajando(false);
    }
  };

  const crear = async () => {
    setCreando(true);
    try {
      const r = await api<{ temporal: string; nombre: string; usuario: string }>("/usuarios", { metodo: "POST", cuerpo: { ...nueva, correo: nueva.correo.trim() } });
      setEntregada({ ...r, nueva: true });
      setNueva({ nombre: "", correo: "", area: "POSGRADO", puesto: "" });
      setError("");
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la cuenta");
    } finally {
      setCreando(false);
    }
  };

  return (
    <div className="space-y-5">
      {entregada && <TemporalEntregada e={entregada} cerrar={() => setEntregada(null)} />}
      {error && (
        <Aviso tono="error" titulo="No se pudo completar">
          {error}
        </Aviso>
      )}

      {confirmar && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="flex items-center gap-2 font-semibold">
            <ShieldAlert size={16} />
            {confirmar.accion === "restablecer"
              ? `¿Restablecer la contraseña de ${confirmar.c.nombre}?`
              : confirmar.accion === "desactivar"
                ? `¿Desactivar la cuenta de ${confirmar.c.nombre}?`
                : `¿Reactivar la cuenta de ${confirmar.c.nombre}?`}
          </p>
          <p className="mt-1">
            {confirmar.accion === "restablecer"
              ? "Antes, confirma que es esa persona quien lo pide (en persona, por teléfono de la oficina o desde su correo institucional). Su contraseña actual dejará de funcionar y se cerrarán sus sesiones abiertas."
              : confirmar.accion === "desactivar"
                ? "Ya no podrá iniciar sesión y se cerrarán sus sesiones; su historial (entrevistas, actas, bitácora) se conserva."
                : "Podrá volver a iniciar sesión con su contraseña."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={botonPrimario} disabled={trabajando} onClick={ejecutar}>
              {trabajando && <Loader2 size={15} className="animate-spin" />} Sí, {confirmar.accion}
            </button>
            <button type="button" className={botonSecundario} disabled={trabajando} onClick={() => setConfirmar(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <Tarjeta
        titulo={admin ? `Cuentas del personal${cuentas ? ` (${cuentas.length})` : ""}` : `Cuentas de profesores${cuentas ? ` (${cuentas.length})` : ""}`}
        accion={
          <label className="flex items-center gap-2 rounded-lg border border-gray-300 px-2.5">
            <Search size={15} className="text-gray-500" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nombre o correo" aria-label="Buscar cuenta" className="w-56 py-1.5 text-sm outline-none" />
          </label>
        }
      >
        {!cuentas ? (
          <p className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 size={15} className="animate-spin" /> Cargando cuentas…
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Nombre</th>
                  <th className="py-2 pr-3 font-medium">Usuario</th>
                  {admin && <th className="py-2 pr-3 font-medium">Área</th>}
                  <th className="py-2 pr-3 font-medium">Estado</th>
                  <th className="py-2 pr-3 font-medium">Último acceso</th>
                  <th className="py-2 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibles.map((c) => (
                  <tr key={c.id} className={c.activo ? "" : "text-gray-400"}>
                    <td className="py-2.5 pr-3">
                      <span className="font-medium text-gray-900">{c.nombre}</span>
                      {c.yo && <span className="ml-1 text-xs text-gray-500">(tú)</span>}
                      {admin && <span className="block text-xs text-gray-500">{c.puesto}</span>}
                    </td>
                    <td className="py-2.5 pr-3 text-xs">
                      {c.correo || "—"}
                      {c.acceso && <span className="block text-gray-500">o {c.acceso}</span>}
                    </td>
                    {admin && <td className="py-2.5 pr-3 text-xs">{AREA[c.area] ?? c.area}</td>}
                    <td className="py-2.5 pr-3">
                      {!c.activo ? (
                        <Etiqueta>Desactivada</Etiqueta>
                      ) : c.temporal ? (
                        <Etiqueta tono="bg-amber-100 text-amber-800">Con contraseña temporal</Etiqueta>
                      ) : (
                        <Etiqueta tono="bg-emerald-100 text-emerald-800">Activa</Etiqueta>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-xs">{fecha(c.ultimoAcceso)}</td>
                    <td className="py-2.5 text-right">
                      {!c.yo && (
                        <span className="inline-flex flex-wrap justify-end gap-1.5">
                          {c.activo && (
                            <button type="button" className={botonSecundario} onClick={() => setConfirmar({ c, accion: "restablecer" })}>
                              <KeyRound size={14} /> Restablecer contraseña
                            </button>
                          )}
                          {admin &&
                            (c.activo ? (
                              <button type="button" className={botonSecundario} onClick={() => setConfirmar({ c, accion: "desactivar" })}>
                                <UserRoundX size={14} /> Desactivar
                              </button>
                            ) : (
                              <button type="button" className={botonSecundario} onClick={() => setConfirmar({ c, accion: "activar" })}>
                                <UserRoundCheck size={14} /> Reactivar
                              </button>
                            ))}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {!visibles.length && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-sm text-gray-500">
                      No hay cuentas que coincidan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      {admin && (
        <Tarjeta titulo={<span className="flex items-center gap-2"><UserPlus size={17} /> Nueva cuenta del personal</span>}>
          <p className="mb-3 text-sm text-gray-600">Para secretarias, analistas o la Subdirección. Los profesores se dan de alta con la carga de profesores del Colegio.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-gray-800">
              Nombre completo
              <input className={`${inputBase} mt-1`} value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} />
            </label>
            <label className="text-sm text-gray-800">
              Correo institucional
              <input className={`${inputBase} mt-1`} type="email" value={nueva.correo} onChange={(e) => setNueva({ ...nueva, correo: e.target.value })} placeholder="nombre@ipn.mx" />
            </label>
            <label className="text-sm text-gray-800">
              Área
              <select className={`${inputBase} mt-1`} value={nueva.area} onChange={(e) => setNueva({ ...nueva, area: e.target.value })}>
                <option value="POSGRADO">Departamento de Posgrado</option>
                <option value="SUBDIRECCION">Subdirección</option>
                <option value="UTEYCV">UTEyCV</option>
                <option value="ADMINISTRADOR">Administrador del sistema</option>
              </select>
            </label>
            <label className="text-sm text-gray-800">
              Puesto
              <input className={`${inputBase} mt-1`} value={nueva.puesto} onChange={(e) => setNueva({ ...nueva, puesto: e.target.value })} placeholder="Ej. Analista de Posgrado" />
            </label>
          </div>
          <button
            type="button"
            className={`${botonPrimario} mt-4`}
            disabled={creando || nueva.nombre.trim().length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nueva.correo.trim()) || nueva.puesto.trim().length < 3}
            onClick={crear}
          >
            {creando ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />} Crear cuenta
          </button>
        </Tarjeta>
      )}
    </div>
  );
}

/** Bitácora de accesos y de cuentas (Administrador, servidor real). */
export function ActividadServidor() {
  const [ev, setEv] = useState<{ fecha: string; usuario: string; accion: string; ip: string }[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<{ fecha: string; usuario: string; accion: string; ip: string }[]>("/usuarios/actividad")
      .then(setEv)
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar la bitácora"));
  }, []);
  if (error)
    return (
      <Aviso tono="error" titulo="No se pudo cargar">
        {error}
      </Aviso>
    );
  return (
    <Tarjeta titulo="Accesos y cambios de cuentas (últimos 300)">
      {!ev ? (
        <p className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 size={15} className="animate-spin" /> Cargando…
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="py-2 pr-3 font-medium">Fecha</th>
                <th className="py-2 pr-3 font-medium">Usuario</th>
                <th className="py-2 pr-3 font-medium">Acción</th>
                <th className="py-2 font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ev.map((e, i) => (
                <tr key={i} className={e.accion === "Intento fallido" ? "text-red-700" : ""}>
                  <td className="whitespace-nowrap py-2 pr-3 text-xs">{fecha(e.fecha)}</td>
                  <td className="py-2 pr-3">{e.usuario}</td>
                  <td className="py-2 pr-3">{e.accion}</td>
                  <td className="py-2 text-xs text-gray-500">{e.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Tarjeta>
  );
}
