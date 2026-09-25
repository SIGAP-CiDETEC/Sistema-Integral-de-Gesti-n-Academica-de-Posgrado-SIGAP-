"use client";

import Link from "next/link";
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { inputBase } from "@/components/posgrado/ui";
import { guardarConfigEvaluacion } from "@/lib/evaluacion-config";
import { fechaHora } from "@/lib/posgrado/datos";
import { useSesion } from "@/lib/sesion";

/** Bitácora de acciones del personal (RNF-11). Con backend incluye IP y es inalterable. */
export function BitacoraVista({ subtitulo }: { subtitulo: string }) {
  const { bitacora, cargado, porId, reiniciar } = usePosgrado();
  const { sesion } = useSesion();
  // Posgrado abre el expediente; UTEyCV abre su pantalla de matrícula
  const enlace = (id: string) => (sesion?.rol === "uteycv" ? `/uteycv/matricula?id=${id}` : `/posgrado/aspirantes/${id}`);
  const [usuario, setUsuario] = useState("");
  if (!cargado) return null;
  const usuarios = [...new Set(bitacora.map((b) => b.usuario))];
  const lista = bitacora.filter((b) => !usuario || b.usuario === usuario);

  return (
    <>
      <PageHeader titulo="Bitácora" subtitulo={subtitulo} />
      <label className="mb-4 block max-w-xs text-sm">
        <span className="font-medium text-gray-900">Usuario</span>
        <select value={usuario} onChange={(e) => setUsuario(e.target.value)} className={`${inputBase} mt-1`}>
          <option value="">Todos</option>
          {usuarios.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
      </label>
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Fecha</th>
                <th className="px-3 py-2.5 font-medium">Usuario</th>
                <th className="px-3 py-2.5 font-medium">Aspirante</th>
                <th className="px-5 py-2.5 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lista.map((b, i) => (
                <tr key={i}>
                  <td className="whitespace-nowrap px-5 py-2.5 text-xs text-gray-500">{fechaHora(b.fecha)}</td>
                  <td className="px-3 py-2.5 text-gray-700">{b.usuario}</td>
                  <td className="px-3 py-2.5">
                    {b.aspirante ? (
                      <Link href={enlace(b.aspirante)} className="text-primary hover:underline">
                        {porId(b.aspirante)?.nombre ?? b.aspirante}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-gray-800">{b.accion}</td>
                </tr>
              ))}
              {!lista.length && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-gray-500">
                    Sin movimientos todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <p className="mt-3 text-xs text-gray-400">Con backend cada registro guarda además la IP y no se puede modificar ni borrar.</p>

      <div className="mt-10 border-t border-dashed border-gray-300 pt-4">
        <p className="text-xs text-gray-500">Vista de prueba (solo cascarón):</p>
        <button
          type="button"
          onClick={() => {
            reiniciar();
            guardarConfigEvaluacion(null);
          }}
          className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
        >
          <RotateCcw size={12} /> Reiniciar lo hecho por Posgrado (aspirantes de ejemplo, avisos, fechas y horarios, acta y bitácora)
        </button>
      </div>
    </>
  );
}
