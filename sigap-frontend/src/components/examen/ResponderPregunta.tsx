"use client";

import { useState } from "react";
import { inputBase } from "@/components/posgrado/ui";
import { barajar, esCalculada, type ItemIntento, type Pregunta, type Respuesta } from "@/lib/examen";
import { prepararCloze, prepararHuecos, sustituir } from "@/lib/examen-tipos";
import { Contenido } from "./Contenido";
import { TextoConHuecos } from "./TextoConHuecos";

/** Orden en que se muestran opciones, parejas o elecciones: se revuelve cada vez que el aspirante entra a la pregunta. */
export type Orden = { a: string[]; b: string[] };
export const SIN_ORDEN: Orden = { a: [], b: [] };

export function nuevoOrden(p?: Pregunta, item?: Pick<ItemIntento, "pares" | "derechas">): Orden {
  if (!p) return SIN_ORDEN;
  if (p.tipo === "opcion" || p.tipo === "calculadaOpcion") return { a: barajar((p.opciones ?? []).map((o) => o.id)), b: [] };
  const pares = p.tipo === "aleatoria" ? item?.pares : p.tipo === "relacionar" ? p.pares : undefined;
  if (pares) return { a: barajar(pares.map((x) => x.id)), b: barajar((item?.derechas ?? pares).map((x) => x.id)) };
  if (p.tipo === "arrastrar") return { a: barajar((p.elecciones ?? []).map((_, i) => String(i + 1))), b: [] };
  return SIN_ORDEN;
}

/** ¿Ya respondió todo lo que pide la pregunta? */
export function estaContestada(p: Pregunta | undefined, r: Respuesta, item?: Pick<ItemIntento, "pares">): boolean {
  if (r === undefined || r === "" || !p) return false;
  const llenos = (n: number) => Object.values(r as Record<string, string>).filter(Boolean).length >= n;
  if (p.tipo === "relacionar") return llenos(p.pares?.length ?? 0);
  if (p.tipo === "aleatoria") return llenos(item?.pares?.length ?? 0);
  if (p.tipo === "arrastrar" || p.tipo === "faltantes") return llenos(prepararHuecos(p.enunciado).correctas.length);
  if (p.tipo === "cloze") return llenos(prepararCloze(p.enunciado).partes.length);
  return true;
}

/** Enunciado y respuestas de una pregunta tal como la ve el aspirante (en el examen y en la vista previa del banco). */
export function ResponderPregunta({
  p,
  item,
  orden,
  valor,
  onCambio,
}: {
  p: Pregunta;
  item?: Pick<ItemIntento, "valores" | "pares" | "derechas">;
  orden: Orden;
  valor: Respuesta;
  onCambio: (v: Respuesta) => void;
}) {
  const mapa = (typeof valor === "object" ? valor : {}) as Record<string, string>;
  const cambiar = (k: string, v: string) => onCambio({ ...mapa, [k]: v });
  const enunciado = esCalculada(p.tipo) ? sustituir(p.enunciado, item?.valores, p.decimales ?? 2) : p.enunciado;
  const claseTexto = "text-[15px] leading-relaxed text-gray-900";

  // Huecos dentro del texto
  if (p.tipo === "faltantes" || p.tipo === "arrastrar") {
    const { html, correctas } = prepararHuecos(p.enunciado);
    const elecciones = p.elecciones ?? [];
    const delGrupo = (i: number) => elecciones.map((e, k) => ({ ...e, n: String(k + 1) })).filter((e) => e.grupo === (elecciones[correctas[i] - 1]?.grupo ?? 1));
    if (p.tipo === "faltantes")
      return (
        <TextoConHuecos
          html={html}
          className={claseTexto}
          hueco={(i) => (
            <select value={mapa[String(i)] ?? ""} onChange={(e) => cambiar(String(i), e.target.value)} className="mx-1 inline-block rounded-md border border-gray-300 bg-white px-1.5 py-0.5 text-sm" aria-label={`Hueco ${i + 1}`}>
              <option value="" />
              {delGrupo(i).map((e) => (
                <option key={e.n} value={e.n}>
                  {e.texto}
                </option>
              ))}
            </select>
          )}
        />
      );
    return <ArrastrarEnTexto html={html} elecciones={elecciones} orden={orden} mapa={mapa} grupoDe={(i) => elecciones[correctas[i] - 1]?.grupo ?? 1} onCambio={cambiar} claseTexto={claseTexto} />;
  }

  // Respuestas incrustadas (Cloze)
  if (p.tipo === "cloze") {
    const { html, partes } = prepararCloze(p.enunciado);
    return (
      <TextoConHuecos
        html={html}
        className={claseTexto}
        hueco={(i) => {
          const parte = partes[i];
          const k = String(i);
          if (parte.tipo !== "opcion")
            return (
              <input
                value={mapa[k] ?? ""}
                onChange={(e) => cambiar(k, e.target.value)}
                inputMode={parte.tipo === "numerica" ? "decimal" : undefined}
                className="mx-1 inline-block w-32 rounded-md border border-gray-300 px-1.5 py-0.5 text-sm"
                autoComplete="off"
                spellCheck={false}
                aria-label={`Respuesta ${i + 1}`}
              />
            );
          if (parte.vista === "menu")
            return (
              <select value={mapa[k] ?? ""} onChange={(e) => cambiar(k, e.target.value)} className="mx-1 inline-block rounded-md border border-gray-300 bg-white px-1.5 py-0.5 text-sm" aria-label={`Respuesta ${i + 1}`}>
                <option value="" />
                {parte.respuestas.map((r, j) => (
                  <option key={j} value={String(j)}>
                    {r.texto}
                  </option>
                ))}
              </select>
            );
          return (
            <span className={`mx-1 inline-flex gap-x-3 gap-y-1 align-top ${parte.vista === "vertical" ? "flex-col" : "flex-wrap"}`}>
              {parte.respuestas.map((r, j) => (
                <label key={j} className="inline-flex items-center gap-1 text-sm">
                  <input type="radio" name={`${p.id}-${i}`} checked={mapa[k] === String(j)} onChange={() => cambiar(k, String(j))} /> {r.texto}
                </label>
              ))}
            </span>
          );
        }}
      />
    );
  }

  return (
    <>
      <Contenido html={enunciado} className={claseTexto} />
      <div className="mt-4">
        <Controles p={p} item={item} orden={orden} valor={valor} mapa={mapa} onCambio={onCambio} cambiar={cambiar} />
      </div>
    </>
  );
}

function Controles({
  p,
  item,
  orden,
  valor,
  mapa,
  onCambio,
  cambiar,
}: {
  p: Pregunta;
  item?: Pick<ItemIntento, "valores" | "pares" | "derechas">;
  orden: Orden;
  valor: Respuesta;
  mapa: Record<string, string>;
  onCambio: (v: Respuesta) => void;
  cambiar: (k: string, v: string) => void;
}) {
  if (p.tipo === "opcion" || p.tipo === "calculadaOpcion") {
    const ops = (orden.a.length ? orden.a : (p.opciones ?? []).map((o) => o.id)).map((oid) => p.opciones?.find((o) => o.id === oid)).filter((o) => !!o);
    return (
      <ul className="space-y-2">
        {ops.map((o, k) => (
          <li key={o.id}>
            <label className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm ${valor === o.id ? "border-primary bg-indigo-50" : "border-gray-200 hover:bg-gray-50"}`}>
              <input type="radio" name={p.id} checked={valor === o.id} onChange={() => onCambio(o.id)} className="mt-1" />
              <span className="font-medium text-gray-500">{String.fromCharCode(97 + k)})</span>
              <Contenido html={p.tipo === "calculadaOpcion" ? sustituir(o.texto, item?.valores, p.decimales ?? 2) : o.texto} como="span" className="text-gray-900" />
            </label>
          </li>
        ))}
      </ul>
    );
  }
  if (p.tipo === "vf")
    return (
      <div className="flex gap-3">
        {[false, true].map((v) => (
          <label key={String(v)} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm ${valor === v ? "border-primary bg-indigo-50" : "border-gray-200 hover:bg-gray-50"}`}>
            <input type="radio" name={p.id} checked={valor === v} onChange={() => onCambio(v)} /> {v ? "Verdadero" : "Falso"}
          </label>
        ))}
      </div>
    );
  if (p.tipo === "corta" || p.tipo === "numerica" || p.tipo === "calculada" || p.tipo === "calculadaSimple")
    return (
      <input
        value={typeof valor === "string" ? valor : ""}
        onChange={(e) => onCambio(e.target.value)}
        inputMode={p.tipo === "corta" ? undefined : "decimal"}
        className={`${inputBase} max-w-sm`}
        placeholder={p.tipo === "corta" ? "Escribe tu respuesta" : "Escribe un número"}
        autoComplete="off"
        spellCheck={false}
      />
    );
  if (p.tipo === "ensayo")
    return <textarea value={typeof valor === "string" ? valor : ""} onChange={(e) => onCambio(e.target.value)} rows={6} className={`${inputBase} w-full`} placeholder="Escribe tu respuesta" />;
  if (p.tipo === "relacionar" || p.tipo === "aleatoria") {
    const todos = (p.tipo === "aleatoria" ? item?.pares : p.pares) ?? [];
    const pares = (orden.a.length ? orden.a : todos.map((x) => x.id)).map((pid) => todos.find((x) => x.id === pid)).filter((x) => !!x);
    // Con el servidor, la columna derecha llega aparte con claves al azar
    const lista = item?.derechas ?? todos.map((x) => ({ id: x.id, texto: x.derecha }));
    const derechas = orden.b.length ? orden.b.map((pid) => lista.find((x) => x.id === pid)).filter((x) => !!x) : [...lista].sort((a, b) => a.texto.localeCompare(b.texto, "es"));
    if (!todos.length) return <p className="text-sm text-gray-500">Las parejas se arman al azar con las preguntas de respuesta corta del tema cuando el aspirante presenta el examen.</p>;
    return (
      <div className="space-y-2">
        {pares.map((x) => (
          <div key={x.id} className="grid gap-2 rounded-lg border border-gray-200 px-3 py-2 sm:grid-cols-2 sm:items-center">
            <Contenido html={x.izquierda} className="text-sm text-gray-900" />
            <select value={mapa[x.id] ?? ""} onChange={(e) => cambiar(x.id, e.target.value)} className={`${inputBase} py-1.5`} aria-label="Elige la que corresponde">
              <option value="">Elige…</option>
              {derechas.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.texto}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    );
  }
  return <p className="text-sm text-gray-500">Este tipo de pregunta todavía no se puede presentar en SIGAP.</p>;
}

/** Arrastrar y soltar dentro del texto: se arrastra una elección al hueco (o se toca la elección y luego el hueco). */
function ArrastrarEnTexto({
  html,
  elecciones,
  orden,
  mapa,
  grupoDe,
  onCambio,
  claseTexto,
}: {
  html: string;
  elecciones: { texto: string; grupo: number }[];
  orden: Orden;
  mapa: Record<string, string>;
  grupoDe: (i: number) => number;
  onCambio: (k: string, v: string) => void;
  claseTexto: string;
}) {
  const [tomada, setTomada] = useState<string | null>(null);
  const ids = orden.a.length ? orden.a : elecciones.map((_, i) => String(i + 1));
  const COLORES = ["bg-sky-100 border-sky-300", "bg-amber-100 border-amber-300", "bg-emerald-100 border-emerald-300", "bg-rose-100 border-rose-300", "bg-violet-100 border-violet-300"];
  const color = (g: number) => COLORES[(g - 1) % COLORES.length];
  const soltar = (i: number, n: string | null) => {
    if (!n || elecciones[Number(n) - 1]?.grupo !== grupoDe(i)) return;
    onCambio(String(i), n);
    setTomada(null);
  };
  return (
    <div>
      <TextoConHuecos
        html={html}
        className={claseTexto}
        hueco={(i) => {
          const n = mapa[String(i)];
          const e = n ? elecciones[Number(n) - 1] : undefined;
          return (
            <span
              role="button"
              tabIndex={0}
              onDragOver={(ev) => ev.preventDefault()}
              onDrop={(ev) => {
                ev.preventDefault();
                soltar(i, ev.dataTransfer.getData("text/plain"));
              }}
              onClick={() => (tomada ? soltar(i, tomada) : n && onCambio(String(i), ""))}
              onKeyDown={(ev) => ev.key === "Enter" && tomada && soltar(i, tomada)}
              title={e ? "Toca para quitar" : "Suelta aquí una respuesta"}
              className={`mx-1 inline-block min-w-[5rem] rounded-md border-2 border-dashed px-2 py-0.5 text-center text-sm align-baseline ${e ? `${color(e.grupo)} border-solid` : `border-gray-300 ${tomada ? "bg-indigo-50" : "bg-white"}`}`}
            >
              {e?.texto ?? " "}
            </span>
          );
        }}
      />
      <div className="mt-4 flex flex-wrap gap-2" aria-label="Respuestas para arrastrar">
        {ids.map((n) => {
          const e = elecciones[Number(n) - 1];
          if (!e) return null;
          return (
            <button
              key={n}
              type="button"
              draggable
              onDragStart={(ev) => ev.dataTransfer.setData("text/plain", n)}
              onClick={() => setTomada(tomada === n ? null : n)}
              className={`cursor-grab rounded-md border px-2.5 py-1 text-sm ${color(e.grupo)} ${tomada === n ? "ring-2 ring-primary" : ""}`}
            >
              {e.texto}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-gray-500">Arrastra cada respuesta a su lugar, o tócala y luego toca el hueco. Toca un hueco lleno para vaciarlo.</p>
    </div>
  );
}
