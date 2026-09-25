"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Tarjeta, botonSecundario, inputBase } from "@/components/admin/ui";
import { useAccesos } from "@/lib/admin/accesos";

type Evento = { fecha: string; usuario: string; modulo: string; accion: string; detalle: string };

const leerRaw = () => {
  try {
    return localStorage.getItem("sigap-posgrado");
  } catch {
    return null;
  }
};
const suscribir = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};

/** Acciones del proceso de admisión (Posgrado y UTEyCV) en el formato de la bitácora general. */
const aEventos = (raw: string | null): Evento[] => {
  try {
    const e = JSON.parse(raw ?? "{}");
    return ((e.bitacora ?? []) as { fecha: string; usuario: string; aspirante?: string; accion: string }[]).map((b) => ({
      fecha: b.fecha,
      usuario: b.usuario,
      modulo: "Admisión",
      accion: b.accion.split(/[:—(]/)[0].trim(),
      detalle: `${b.aspirante ? `${b.aspirante} · ` : ""}${b.accion}`,
    }));
  } catch {
    return [];
  }
};

const fh = (iso: string) => new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Bitácora de auditoría y seguridad: administración + proceso de admisión (RF-82, RNF-11). */
export default function BitacoraAdmin() {
  const acc = useAccesos();
  const [usuario, setUsuario] = useState("");
  const [modulo, setModulo] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [texto, setTexto] = useState("");
  const raw = useSyncExternalStore(suscribir, leerRaw, () => null);
  const proceso = useMemo(() => aEventos(raw), [raw]);

  const todos = [...acc.bitacora, ...proceso].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const usuarios = [...new Set(todos.map((e) => e.usuario))];
  const lista = todos.filter(
    (e) =>
      (!usuario || e.usuario === usuario) &&
      (!modulo || e.modulo === modulo) &&
      (!desde || e.fecha.slice(0, 10) >= desde) &&
      (!hasta || e.fecha.slice(0, 10) <= hasta) &&
      (!texto || `${e.accion} ${e.detalle}`.toLowerCase().includes(texto.toLowerCase())),
  );

  const exportar = () => {
    const filas = [["Fecha", "Usuario", "IP", "Módulo", "Acción", "Detalle"], ...lista.map((e) => [fh(e.fecha), e.usuario, "", e.modulo, e.accion, e.detalle])];
    const csv = "﻿" + filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `Bitacora_SIGAP_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader titulo="Bitácora de auditoría" subtitulo="Trazabilidad de cambios críticos y accesos" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm">
          <span className="font-medium text-gray-900">Desde</span>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={`${inputBase} mt-1`} />
        </label>
        <label className="text-sm">
          <span className="font-medium text-gray-900">Hasta</span>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={`${inputBase} mt-1`} />
        </label>
        <label className="text-sm">
          <span className="font-medium text-gray-900">Usuario</span>
          <select value={usuario} onChange={(e) => setUsuario(e.target.value)} className={`${inputBase} mt-1`}>
            <option value="">Todos</option>
            {usuarios.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="font-medium text-gray-900">Módulo</span>
          <select value={modulo} onChange={(e) => setModulo(e.target.value)} className={`${inputBase} mt-1`}>
            <option value="">Todos</option>
            {["Acceso", "Usuarios", "Roles", "Convocatoria", "Admisión"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="font-medium text-gray-900">Buscar</span>
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Acción o detalle" className={`${inputBase} mt-1`} />
        </label>
      </div>

      <Tarjeta titulo={`Eventos registrados · ${lista.length}`} className="mt-5" accion={<button type="button" className={botonSecundario} onClick={exportar} disabled={!lista.length}><Download size={15} /> Exportar CSV</button>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="py-2 font-medium">Fecha / hora</th>
                <th className="py-2 font-medium">Usuario</th>
                <th className="py-2 font-medium">IP</th>
                <th className="py-2 font-medium">Módulo</th>
                <th className="py-2 font-medium">Acción</th>
                <th className="py-2 font-medium">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lista.slice(0, 200).map((e, i) => (
                <tr key={i} className={e.accion === "Intento fallido" ? "bg-red-50/50" : ""}>
                  <td className="whitespace-nowrap py-2 text-xs text-gray-500">{fh(e.fecha)}</td>
                  <td className="py-2 text-gray-800">{e.usuario}</td>
                  <td className="py-2 text-xs text-gray-400">con backend</td>
                  <td className="py-2 text-gray-700">{e.modulo}</td>
                  <td className="py-2 text-gray-900">{e.accion}</td>
                  <td className="max-w-[360px] py-2 text-xs text-gray-600">{e.detalle}</td>
                </tr>
              ))}
              {!lista.length && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    Sin eventos con estos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-500">Registros inmutables · Con backend se guardan en la base de datos con la IP de origen y no se pueden editar ni borrar (RNF-11).</p>
      </Tarjeta>
    </>
  );
}
