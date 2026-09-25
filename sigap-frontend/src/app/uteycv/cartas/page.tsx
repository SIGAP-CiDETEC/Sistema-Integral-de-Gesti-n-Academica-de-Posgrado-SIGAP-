"use client";

import { CheckCircle2, Circle, Mail } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePosgrado } from "@/components/posgrado/PosgradoProvider";
import { Etiqueta, botonSecundario } from "@/components/posgrado/ui";
import { fechaCorta } from "@/lib/posgrado/datos";

/** Carta protesta (SIP-05) y carta compromiso (SIP-06) firmadas: las recibe Control Escolar. */
export default function Cartas() {
  const { aspirantes, cargado, actualizarUteycv, enviarAviso } = usePosgrado();
  if (!cargado) return null;
  const lista = aspirantes.filter((a) => !a.concluido && a.etapa !== "registro");

  const Marca = ({ ok }: { ok: boolean }) =>
    ok ? (
      <span className="inline-flex items-center gap-1 text-emerald-700">
        <CheckCircle2 size={14} /> Recibida
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-gray-400">
        <Circle size={14} /> Pendiente
      </span>
    );

  return (
    <>
      <PageHeader titulo="Cartas SIP-05 y SIP-06" subtitulo="El aspirante las imprime, firma y sube; Control Escolar las valida" />
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Aspirante</th>
                <th className="px-3 py-2.5 font-medium">SIP-05 · Carta protesta</th>
                <th className="px-3 py-2.5 font-medium">SIP-06 · Carta compromiso</th>
                <th className="px-3 py-2.5 font-medium">Estado</th>
                <th className="px-5 py-2.5 text-right font-medium">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lista.map((a) => {
                const ambas = !!a.formatos["sip-05"] && !!a.formatos["sip-06"];
                const validadas = a.uteycv?.cartasValidadasEl;
                return (
                  <tr key={a.id}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{a.nombre}</p>
                      <p className="font-mono text-xs text-gray-500">{a.id}</p>
                    </td>
                    <td className="px-3 py-3">
                      <Marca ok={!!a.formatos["sip-05"]} />
                    </td>
                    <td className="px-3 py-3">
                      <Marca ok={!!a.formatos["sip-06"]} />
                    </td>
                    <td className="px-3 py-3">
                      {validadas ? (
                        <Etiqueta tono="bg-emerald-50 text-emerald-700">Validadas {fechaCorta(validadas)}</Etiqueta>
                      ) : ambas ? (
                        <Etiqueta tono="bg-amber-50 text-amber-800">Por validar</Etiqueta>
                      ) : (
                        <Etiqueta>Esperando al aspirante</Etiqueta>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {!validadas && ambas && (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className={botonSecundario}
                            onClick={() =>
                              enviarAviso([a.id], "ambos", "Corrige tus cartas SIP-05 y SIP-06", `Estimado(a) ${a.nombre.split(" ")[0]}:\n\nRevisa tus cartas SIP-05 y SIP-06: deben estar firmadas con tinta azul y escaneadas completas. Vuelve a subirlas en SIGAP (fase 2 · Documentos).\n\nAtentamente,\nControl Escolar (UTEyCV) · CIDETEC`)
                            }
                          >
                            <Mail size={14} /> Pedir corrección
                          </button>
                          <button type="button" className={botonSecundario} onClick={() => actualizarUteycv(a.id, { cartasValidadasEl: new Date().toISOString() }, "Validó las cartas SIP-05 y SIP-06")}>
                            <CheckCircle2 size={14} /> Validar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <p className="mt-3 text-xs text-gray-400">María (ASP-2026-001) muestra lo que subió en la sesión de aspirante de este navegador.</p>
    </>
  );
}
