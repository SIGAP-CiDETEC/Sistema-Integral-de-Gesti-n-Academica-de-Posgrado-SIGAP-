"use client";

import { CheckCircle2, Circle } from "lucide-react";
import type { Pregunta } from "@/lib/examen";
import { Contenido } from "./Contenido";

/** Respuestas de una pregunta con la correcta marcada (solo para quien edita el banco). */
export function VistaRespuestas({ p }: { p: Pregunta }) {
  if (p.tipo === "opcion")
    return (
      <ul className="space-y-1 text-sm">
        {(p.opciones ?? []).map((o) => (
          <li key={o.id} className={`flex items-start gap-2 rounded-lg px-2 py-1 ${o.correcta ? "bg-emerald-50 text-emerald-900" : "text-gray-700"}`}>
            {o.correcta ? <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" /> : <Circle size={15} className="mt-0.5 shrink-0 text-gray-300" />}
            <Contenido html={o.texto} como="span" />
          </li>
        ))}
      </ul>
    );
  if (p.tipo === "vf")
    return (
      <p className="text-sm">
        Respuesta correcta: <strong className="text-emerald-700">{p.verdadero ? "Verdadero" : "Falso"}</strong>
      </p>
    );
  if (p.tipo === "corta")
    return (
      <p className="text-sm">
        Respuestas aceptadas: <strong className="text-emerald-700">{(p.respuestas ?? []).join(" · ")}</strong>{" "}
        <span className="text-xs text-gray-500">(sin distinguir mayúsculas ni acentos)</span>
      </p>
    );
  return (
    <table className="w-full text-left text-sm">
      <tbody className="divide-y divide-gray-100">
        {(p.pares ?? []).map((x) => (
          <tr key={x.id}>
            <td className="py-1 pr-3 text-gray-800">
              <Contenido html={x.izquierda} como="span" />
            </td>
            <td className="py-1 text-gray-400">→</td>
            <td className="py-1 pl-3 text-emerald-800">{x.derecha}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
