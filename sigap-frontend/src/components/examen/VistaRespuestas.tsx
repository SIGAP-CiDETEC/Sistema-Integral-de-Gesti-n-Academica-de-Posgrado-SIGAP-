"use client";

import { CheckCircle2, Circle } from "lucide-react";
import type { Pregunta } from "@/lib/examen";
import { prepararCloze, prepararHuecos } from "@/lib/examen-tipos";
import { Contenido } from "./Contenido";

/** Respuestas de una pregunta con la correcta marcada (solo para quien edita el banco). */
export function VistaRespuestas({ p }: { p: Pregunta }) {
  if (p.tipo === "numerica")
    return (
      <p className="text-sm">
        Respuesta{(p.numericas ?? []).length > 1 ? "s" : ""}: <strong className="text-emerald-700">{(p.numericas ?? []).map((x) => `${x.valor}${x.tolerancia ? ` ± ${x.tolerancia}` : ""}`).join(" · ")}</strong>
      </p>
    );
  if (p.tipo === "ensayo") return <p className="text-sm text-gray-600">Respuesta abierta: se califica a mano (no sale en el examen de admisión).</p>;
  if (p.tipo === "calculada" || p.tipo === "calculadaSimple" || p.tipo === "calculadaOpcion")
    return (
      <div className="space-y-1 text-sm">
        {p.formula && (
          <p>
            Fórmula: <code className="rounded bg-gray-100 px-1">{p.formula}</code> · tolerancia {p.tolerancia ?? 0} {p.toleranciaTipo === "absoluta" ? "(nominal)" : "(relativa)"}
          </p>
        )}
        <p className="text-gray-600">Variables: {(p.variables ?? []).map((v) => `{${v.nombre}} de ${v.min} a ${v.max}`).join(" · ") || "—"}</p>
        {p.tipo === "calculadaOpcion" && <VistaOpciones p={p} />}
      </div>
    );
  if (p.tipo === "aleatoria")
    return <p className="text-sm text-gray-600">Relaciona al azar {p.cantidadAleatoria ?? 3} preguntas de respuesta corta del tema «{p.tema}» con sus respuestas.</p>;
  if (p.tipo === "arrastrar" || p.tipo === "faltantes") {
    const { correctas } = prepararHuecos(p.enunciado);
    return (
      <div className="text-sm">
        <ol className="list-decimal space-y-0.5 pl-5">
          {correctas.map((n, i) => (
            <li key={i}>
              Hueco {i + 1}: <strong className="text-emerald-700">{p.elecciones?.[n - 1]?.texto ?? "—"}</strong>
            </li>
          ))}
        </ol>
        <p className="mt-1 text-xs text-gray-500">Elecciones: {(p.elecciones ?? []).map((e) => e.texto).join(" · ")}</p>
      </div>
    );
  }
  if (p.tipo === "cloze") {
    const { partes } = prepararCloze(p.enunciado);
    return (
      <ol className="list-decimal space-y-0.5 pl-5 text-sm">
        {partes.map((x, i) => (
          <li key={i}>
            {x.tipo === "opcion" ? "Opción múltiple" : x.tipo === "numerica" ? "Numérica" : "Respuesta corta"}:{" "}
            <strong className="text-emerald-700">{x.respuestas.filter((r) => r.fraccion === 1).map((r) => r.texto + (r.tolerancia ? ` ± ${r.tolerancia}` : "")).join(" / ")}</strong>
          </li>
        ))}
      </ol>
    );
  }
  if (p.tipo === "opcion") return <VistaOpciones p={p} />;
  return <VistaBasica p={p} />;
}

function VistaOpciones({ p }: { p: Pregunta }) {
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
}

function VistaBasica({ p }: { p: Pregunta }) {
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
