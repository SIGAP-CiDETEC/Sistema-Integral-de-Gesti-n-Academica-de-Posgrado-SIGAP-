"use client";

import { useMemo, useState } from "react";
import { Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { botonPrimario, botonSecundario, inputBase } from "@/components/posgrado/ui";
import { NIVELES, NOMBRE_NIVEL, TIPO, TIPOS, cortasPara, esCalculada, resultadoCalculada, useExamen, type Nivel, type Pregunta, type Respuesta, type TipoPregunta } from "@/lib/examen";
import { formatoNumero, generarValores, prepararCloze, prepararHuecos, sustituir, variablesEn, type Variable } from "@/lib/examen-tipos";
import { AREAS_EVAL, type AreaEvalId } from "@/lib/posgrado/datos";
import { ResponderPregunta, SIN_ORDEN } from "./ResponderPregunta";

const letra = (i: number) => String.fromCharCode(97 + i);

/** Pone los campos que necesita cada tipo (con valores de ejemplo vacíos) al crear o cambiar de tipo. */
export function prepararTipo(p: Pregunta, tipo: TipoPregunta): Pregunta {
  const conOpciones = tipo === "opcion" || tipo === "calculadaOpcion";
  return {
    ...p,
    tipo,
    opciones: conOpciones ? (p.opciones?.length ? p.opciones : [0, 1, 2, 3].map((i) => ({ id: letra(i), texto: "", correcta: i === 0 }))) : p.opciones,
    verdadero: tipo === "vf" ? (p.verdadero ?? true) : p.verdadero,
    pares: tipo === "relacionar" ? (p.pares?.length ? p.pares : [0, 1, 2].map((i) => ({ id: `p${i + 1}`, izquierda: "", derecha: "" }))) : p.pares,
    respuestas: tipo === "corta" ? (p.respuestas?.length ? p.respuestas : [""]) : p.respuestas,
    numericas: tipo === "numerica" ? (p.numericas?.length ? p.numericas : [{ valor: 0, tolerancia: 0 }]) : p.numericas,
    elecciones: tipo === "arrastrar" || tipo === "faltantes" ? (p.elecciones?.length ? p.elecciones : [{ texto: "", grupo: 1 }, { texto: "", grupo: 1 }]) : p.elecciones,
    tolerancia: esCalculada(tipo) ? (p.tolerancia ?? 0.01) : p.tolerancia,
    toleranciaTipo: esCalculada(tipo) ? (p.toleranciaTipo ?? "relativa") : p.toleranciaTipo,
    decimales: esCalculada(tipo) ? (p.decimales ?? 2) : p.decimales,
    cantidadAleatoria: tipo === "aleatoria" ? (p.cantidadAleatoria ?? 3) : p.cantidadAleatoria,
  };
}

/** Variables {x} de una calculada, conservando el rango que ya tenían. */
const variablesDe = (p: Pregunta): Variable[] =>
  variablesEn(p.enunciado, p.formula, ...(p.tipo === "calculadaOpcion" ? (p.opciones ?? []).map((o) => o.texto) : [])).map(
    (n) => p.variables?.find((v) => v.nombre === n) ?? { nombre: n, min: 1, max: 10, decimales: 0 },
  );

const AYUDA: Partial<Record<TipoPregunta, string>> = {
  arrastrar: "Escribe [[1]], [[2]]… en el enunciado donde va la elección 1, 2… (la correcta). Las elecciones del mismo grupo (color) son las que caben en ese hueco.",
  faltantes: "Escribe [[1]], [[2]]… en el enunciado donde va la elección 1, 2… (la correcta). En cada hueco aparece un menú con las elecciones de su mismo grupo.",
  cloze: "Escribe las respuestas dentro del texto, como en Moodle: {1:MULTICHOICE:=correcta~otra~otra} (menú), {1:MCV:…} (vertical), {1:MCH:…} (horizontal), {1:SHORTANSWER:=respuesta} y {1:NUMERICAL:=3.14:0.01} (valor:tolerancia). El número del inicio es el peso de esa parte; %50% da medio punto.",
  calculada: "Usa variables entre llaves en el enunciado, como {a} y {b}. La fórmula calcula la respuesta: {a} * {b} + 2, sqrt({a}), pow({a}, 2), pi(). Cada aspirante recibe valores distintos.",
  calculadaSimple: "Usa variables entre llaves en el enunciado, como {a} y {b}. La fórmula calcula la respuesta: {a} * {b} + 2, sqrt({a}), pow({a}, 2), pi(). Cada aspirante recibe valores distintos.",
  calculadaOpcion: "Usa variables entre llaves, como {a}. En las opciones, {={a}*2} se cambia por el resultado de la fórmula. Cada aspirante recibe valores distintos.",
  aleatoria: "Escribe la indicación (p. ej. «Relaciona cada pregunta con su respuesta»). Al presentar el examen se toman al azar preguntas de respuesta corta del mismo tema y se relacionan con su respuesta.",
  ensayo: "Respuesta abierta que se califica a mano: puede guardarse en el banco, pero no sale en el examen de admisión.",
  numerica: "La respuesta del aspirante es correcta si está dentro de ± la tolerancia de alguna respuesta (acepta punto o coma decimal).",
};

/** Crear o editar una pregunta del banco, con vista previa (fórmulas entre \( … \) o $$ … $$). */
export function EditorPregunta({
  inicial,
  temas,
  unidades,
  onGuardar,
  onCancelar,
}: {
  inicial: Pregunta;
  temas: string[];
  unidades: string[];
  onGuardar: (p: Pregunta) => void;
  onCancelar: () => void;
}) {
  const [p, setP] = useState<Pregunta>(inicial);
  const [error, setError] = useState("");
  const set = <K extends keyof Pregunta>(k: K, v: Pregunta[K]) => setP({ ...p, [k]: v });
  const { config } = useExamen();
  const pesoNivel = p.nivel === "sin-nivel" ? 0 : config.pesos[p.nivel];

  const { banco } = useExamen();
  const cambiarTipo = (tipo: TipoPregunta) => setP(prepararTipo(p, tipo));
  const variables = variablesDe(p);
  const setVariable = (n: string, cambio: Partial<Variable>) => set("variables", variables.map((v) => (v.nombre === n ? { ...v, ...cambio } : v)));
  const huecos = p.tipo === "arrastrar" || p.tipo === "faltantes" ? prepararHuecos(p.enunciado).correctas : [];
  const partesCloze = p.tipo === "cloze" ? prepararCloze(p.enunciado).partes : [];
  const cortas = p.tipo === "aleatoria" ? cortasPara(p, banco) : [];

  // Vista previa: valores al azar para las calculadas y parejas para "relacionar aleatoriamente"
  const [semilla, setSemilla] = useState(0);
  const [prueba, setPrueba] = useState<Respuesta>(undefined);
  const claveVars = JSON.stringify(variables);
  const item = useMemo(() => {
    void semilla;
    const vs: Variable[] = JSON.parse(claveVars);
    return {
      valores: vs.length ? generarValores(vs) : undefined,
      pares: p.tipo === "aleatoria" ? cortas.slice(0, Math.max(2, p.cantidadAleatoria ?? 3)).map((x, i) => ({ id: `a${i + 1}`, izquierda: x.enunciado, derecha: x.respuestas![0] })) : undefined,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveVars, semilla, p.tipo, p.cantidadAleatoria, cortas.length]);
  const resultado = esCalculada(p.tipo) && p.tipo !== "calculadaOpcion" ? resultadoCalculada(p, item.valores) : null;

  const validar = (): string => {
    if (!p.tema.trim()) return "Escribe el tema.";
    if (!p.enunciado.trim()) return "Escribe el enunciado.";
    if (!TIPO[p.tipo]?.disponible) return "Este tipo de pregunta todavía no se puede crear en SIGAP.";
    if (p.tipo === "numerica" && !(p.numericas ?? []).some((x) => Number.isFinite(x.valor))) return "Escribe al menos una respuesta numérica.";
    if (p.tipo === "arrastrar" || p.tipo === "faltantes") {
      const n = (p.elecciones ?? []).filter((e) => e.texto.trim()).length;
      if (!huecos.length) return "Marca en el enunciado al menos un hueco con [[1]].";
      if (huecos.some((h) => h < 1 || h > n)) return `Hay un hueco que apunta a una elección que no existe (hay ${n}).`;
    }
    if (p.tipo === "cloze" && !partesCloze.length) return "Escribe al menos una respuesta incrustada, p. ej. {1:SHORTANSWER:=respuesta}.";
    if (p.tipo === "cloze" && partesCloze.some((x) => !x.respuestas.some((r) => r.fraccion > 0))) return "Cada respuesta incrustada necesita una correcta (marcada con =).";
    if (esCalculada(p.tipo)) {
      if (variables.some((v) => !(v.min <= v.max))) return "En cada variable, el mínimo debe ser menor o igual al máximo.";
      if (p.tipo !== "calculadaOpcion" && resultado === null) return "La fórmula no se puede calcular: revísala (variables entre llaves, como {a}).";
      if (p.tipo === "calculadaOpcion" && (p.opciones ?? []).some((o) => /\{=/.test(sustituir(o.texto, item.valores ?? {}, p.decimales ?? 2))))
        return "Alguna fórmula {=…} de las opciones no se puede calcular.";
    }
    if (p.tipo === "aleatoria" && cortas.length < 2) return "Para relacionar aleatoriamente se necesitan al menos 2 preguntas de respuesta corta activas en esta área.";
    if (p.tipo === "opcion" || p.tipo === "calculadaOpcion") {
      const ops = (p.opciones ?? []).filter((o) => o.texto.trim());
      if (ops.length < 2) return "Agrega al menos dos opciones.";
      if (ops.filter((o) => o.correcta).length !== 1) return "Marca exactamente una opción correcta.";
    }
    if (p.tipo === "relacionar" && (p.pares ?? []).filter((x) => x.izquierda.trim() && x.derecha.trim()).length < 2) return "Agrega al menos dos parejas completas.";
    if (p.tipo === "corta" && !(p.respuestas ?? []).some((x) => x.trim())) return "Escribe al menos una respuesta aceptada.";
    return "";
  };
  const guardar = () => {
    const e = validar();
    if (e) return setError(e);
    onGuardar({
      ...p,
      tema: p.tema.trim(),
      unidad: p.unidad.trim(),
      opciones: p.tipo === "opcion" || p.tipo === "calculadaOpcion" ? (p.opciones ?? []).filter((o) => o.texto.trim()) : undefined,
      numericas: p.tipo === "numerica" ? (p.numericas ?? []).filter((x) => Number.isFinite(x.valor)) : undefined,
      elecciones: p.tipo === "arrastrar" || p.tipo === "faltantes" ? p.elecciones : undefined,
      formula: esCalculada(p.tipo) && p.tipo !== "calculadaOpcion" ? p.formula?.trim() : undefined,
      variables: esCalculada(p.tipo) ? variables : undefined,
      tolerancia: esCalculada(p.tipo) ? p.tolerancia : undefined,
      toleranciaTipo: esCalculada(p.tipo) ? p.toleranciaTipo : undefined,
      decimales: esCalculada(p.tipo) ? p.decimales : undefined,
      cantidadAleatoria: p.tipo === "aleatoria" ? p.cantidadAleatoria : undefined,
      pares: p.tipo === "relacionar" ? (p.pares ?? []).filter((x) => x.izquierda.trim() && x.derecha.trim()) : undefined,
      respuestas: p.tipo === "corta" ? (p.respuestas ?? []).map((x) => x.trim()).filter(Boolean) : undefined,
      verdadero: p.tipo === "vf" ? !!p.verdadero : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h2 className="font-semibold text-gray-900">{inicial.enunciado ? "Editar pregunta" : "Nueva pregunta"}</h2>
          <button type="button" aria-label="Cerrar" onClick={onCancelar} className="rounded p-1 text-gray-500 hover:bg-gray-100">
            <X size={18} />
          </button>
        </header>
        <div className="space-y-4 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="font-medium text-gray-900">Área</span>
              <select value={p.area} onChange={(e) => set("area", e.target.value as AreaEvalId)} className={`${inputBase} mt-1`}>
                {AREAS_EVAL.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="font-medium text-gray-900">Unidad</span>
              <input list="unidades-banco" value={p.unidad} onChange={(e) => set("unidad", e.target.value)} className={`${inputBase} mt-1`} />
              <datalist id="unidades-banco">
                {unidades.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </label>
            <label className="text-sm">
              <span className="font-medium text-gray-900">Tema</span>
              <input list="temas-banco" value={p.tema} onChange={(e) => set("tema", e.target.value)} className={`${inputBase} mt-1`} placeholder="Ej. 2.1 Combinatoria" />
              <datalist id="temas-banco">
                {temas.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label className="text-sm">
                <span className="font-medium text-gray-900">Nivel</span>
                <select value={p.nivel} onChange={(e) => set("nivel", e.target.value as Nivel)} className={`${inputBase} mt-1`}>
                  {[...NIVELES, "sin-nivel" as const].map((n) => (
                    <option key={n} value={n}>
                      {NOMBRE_NIVEL[n]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="font-medium text-gray-900">Valor</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={p.valor ?? ""}
                  placeholder={`${pesoNivel} (nivel)`}
                  onChange={(e) => set("valor", e.target.value === "" ? undefined : Math.max(0, Math.min(100, Number(e.target.value))))}
                  className={`${inputBase} mt-1`}
                  title="Puntos que vale esta pregunta. Vacío: vale lo que pesa su nivel."
                />
              </label>
              <label className="text-sm">
                <span className="font-medium text-gray-900">Tipo</span>
                <select value={p.tipo} onChange={(e) => cambiarTipo(e.target.value as TipoPregunta)} className={`${inputBase} mt-1`}>
                  {TIPOS.filter((t) => t.disponible || t.id === p.tipo).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <label className="block text-sm">
            <span className="font-medium text-gray-900">Enunciado</span>
            <textarea value={p.enunciado} onChange={(e) => set("enunciado", e.target.value)} rows={4} className={`${inputBase} mt-1 font-mono text-xs`} />
            <span className="mt-0.5 block text-xs text-gray-500">
              Fórmulas: <code>\(x^2\)</code> en línea o <code>$$\sum_i x_i$$</code> en bloque. Se admite HTML (párrafos, negritas, <code>&lt;pre&gt;</code> para código).
            </span>
          </label>
          {AYUDA[p.tipo] && <p className="rounded-lg bg-indigo-50/70 px-3 py-2 text-xs text-indigo-900">{AYUDA[p.tipo]}</p>}

          {(p.tipo === "opcion" || p.tipo === "calculadaOpcion") && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900">Opciones (marca la correcta)</p>
              {(p.opciones ?? []).map((o, i) => (
                <div key={o.id} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correcta"
                    checked={o.correcta}
                    onChange={() => set("opciones", (p.opciones ?? []).map((x) => ({ ...x, correcta: x.id === o.id })))}
                    aria-label={`La opción ${letra(i)} es la correcta`}
                  />
                  <input
                    value={o.texto}
                    onChange={(e) => set("opciones", (p.opciones ?? []).map((x) => (x.id === o.id ? { ...x, texto: e.target.value } : x)))}
                    className={`${inputBase} flex-1 py-1.5 ${o.correcta ? "border-emerald-400" : ""}`}
                    placeholder={`Opción ${letra(i)}`}
                  />
                  <button type="button" aria-label="Quitar opción" onClick={() => set("opciones", (p.opciones ?? []).filter((x) => x.id !== o.id))} className="rounded p-1.5 text-gray-400 hover:text-red-700">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button type="button" className="inline-flex items-center gap-1 text-sm text-primary" onClick={() => set("opciones", [...(p.opciones ?? []), { id: `o${Date.now().toString(36)}`, texto: "", correcta: false }])}>
                <Plus size={14} /> Agregar opción
              </button>
            </div>
          )}

          {p.tipo === "vf" && (
            <div className="flex gap-4 text-sm">
              <span className="font-medium text-gray-900">Respuesta correcta:</span>
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={!!p.verdadero} onChange={() => set("verdadero", true)} /> Verdadero
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={!p.verdadero} onChange={() => set("verdadero", false)} /> Falso
              </label>
            </div>
          )}

          {p.tipo === "relacionar" && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900">Parejas (izquierda → la que le corresponde)</p>
              {(p.pares ?? []).map((x) => (
                <div key={x.id} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                  <input value={x.izquierda} onChange={(e) => set("pares", (p.pares ?? []).map((y) => (y.id === x.id ? { ...y, izquierda: e.target.value } : y)))} className={`${inputBase} py-1.5`} placeholder="Concepto" />
                  <span className="text-gray-400">→</span>
                  <input value={x.derecha} onChange={(e) => set("pares", (p.pares ?? []).map((y) => (y.id === x.id ? { ...y, derecha: e.target.value } : y)))} className={`${inputBase} py-1.5`} placeholder="Descripción" />
                  <button type="button" aria-label="Quitar pareja" onClick={() => set("pares", (p.pares ?? []).filter((y) => y.id !== x.id))} className="rounded p-1.5 text-gray-400 hover:text-red-700">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button type="button" className="inline-flex items-center gap-1 text-sm text-primary" onClick={() => set("pares", [...(p.pares ?? []), { id: `p${Date.now().toString(36)}`, izquierda: "", derecha: "" }])}>
                <Plus size={14} /> Agregar pareja
              </button>
            </div>
          )}

          {p.tipo === "corta" && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900">Respuestas aceptadas (no distingue mayúsculas ni acentos)</p>
              {(p.respuestas ?? []).map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={r} onChange={(e) => set("respuestas", (p.respuestas ?? []).map((x, j) => (j === i ? e.target.value : x)))} className={`${inputBase} flex-1 py-1.5`} />
                  <button type="button" aria-label="Quitar respuesta" onClick={() => set("respuestas", (p.respuestas ?? []).filter((_, j) => j !== i))} className="rounded p-1.5 text-gray-400 hover:text-red-700">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button type="button" className="inline-flex items-center gap-1 text-sm text-primary" onClick={() => set("respuestas", [...(p.respuestas ?? []), ""])}>
                <Plus size={14} /> Agregar respuesta
              </button>
            </div>
          )}

          {p.tipo === "numerica" && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900">Respuestas numéricas</p>
              {(p.numericas ?? []).map((x, i) => (
                <div key={i} className="grid grid-cols-[9rem_auto_7rem_auto] items-center gap-2 text-sm">
                  <input type="number" step="any" value={Number.isFinite(x.valor) ? x.valor : ""} onChange={(e) => set("numericas", (p.numericas ?? []).map((y, j) => (j === i ? { ...y, valor: e.target.value === "" ? NaN : Number(e.target.value) } : y)))} className={`${inputBase} w-36 py-1.5`} placeholder="Respuesta" />
                  <span className="text-gray-500">±</span>
                  <input type="number" step="any" min={0} value={x.tolerancia} onChange={(e) => set("numericas", (p.numericas ?? []).map((y, j) => (j === i ? { ...y, tolerancia: Math.abs(Number(e.target.value) || 0) } : y)))} className={`${inputBase} w-28 py-1.5`} placeholder="Tolerancia" />
                  <button type="button" aria-label="Quitar respuesta" onClick={() => set("numericas", (p.numericas ?? []).filter((_, j) => j !== i))} className="rounded p-1.5 text-gray-400 hover:text-red-700">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button type="button" className="inline-flex items-center gap-1 text-sm text-primary" onClick={() => set("numericas", [...(p.numericas ?? []), { valor: 0, tolerancia: 0 }])}>
                <Plus size={14} /> Agregar respuesta
              </button>
            </div>
          )}

          {(p.tipo === "arrastrar" || p.tipo === "faltantes") && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-900">Elecciones ({huecos.length} hueco{huecos.length === 1 ? "" : "s"} en el texto)</p>
                <button type="button" className="text-xs text-primary" onClick={() => set("enunciado", `${p.enunciado}[[${(p.elecciones ?? []).length || 1}]]`)}>
                  + Insertar hueco [[n]] al final del enunciado
                </button>
              </div>
              {(p.elecciones ?? []).map((e, i) => (
                <div key={i} className="grid grid-cols-[2.5rem_1fr_auto_4.5rem_auto] items-center gap-2 text-sm">
                  <span className="font-mono text-xs text-gray-500">[[{i + 1}]]</span>
                  <input value={e.texto} onChange={(ev) => set("elecciones", (p.elecciones ?? []).map((y, j) => (j === i ? { ...y, texto: ev.target.value } : y)))} className={`${inputBase} flex-1 py-1.5`} placeholder={`Elección ${i + 1}`} />
                  <span className="text-xs text-gray-600">Grupo</span>
                    <select aria-label="Grupo" value={e.grupo} onChange={(ev) => set("elecciones", (p.elecciones ?? []).map((y, j) => (j === i ? { ...y, grupo: Number(ev.target.value) } : y)))} className={`${inputBase} w-16 py-1`}>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  <button type="button" aria-label="Quitar elección" onClick={() => set("elecciones", (p.elecciones ?? []).filter((_, j) => j !== i))} className="rounded p-1.5 text-gray-400 hover:text-red-700">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button type="button" className="inline-flex items-center gap-1 text-sm text-primary" onClick={() => set("elecciones", [...(p.elecciones ?? []), { texto: "", grupo: 1 }])}>
                <Plus size={14} /> Agregar elección
              </button>
              <p className="text-xs text-gray-500">Las elecciones que no corresponden a ningún hueco sirven como distractores.</p>
            </div>
          )}

          {p.tipo === "cloze" && partesCloze.length > 0 && (
            <div className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700">
              <p className="font-medium text-gray-900">{partesCloze.length} respuesta(s) incrustada(s):</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-5">
                {partesCloze.map((x, i) => (
                  <li key={i}>
                    {x.tipo === "opcion" ? "Opción múltiple" : x.tipo === "numerica" ? "Numérica" : "Respuesta corta"} · peso {x.peso} · correcta:{" "}
                    <strong>{x.respuestas.filter((r) => r.fraccion === 1).map((r) => r.texto + (r.tolerancia ? ` ± ${r.tolerancia}` : "")).join(" / ") || "—"}</strong>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {esCalculada(p.tipo) && (
            <div className="space-y-3">
              {p.tipo !== "calculadaOpcion" && (
                <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr]">
                  <label className="text-sm">
                    <span className="font-medium text-gray-900">Fórmula de la respuesta</span>
                    <input value={p.formula ?? ""} onChange={(e) => set("formula", e.target.value)} className={`${inputBase} mt-1 font-mono`} placeholder="{a} * {b} + 2" spellCheck={false} />
                  </label>
                  <label className="text-sm">
                    <span className="font-medium text-gray-900">Tolerancia</span>
                    <span className="sr-only">relativa: 0.01 = 1 %</span>
                    <input type="number" step="any" min={0} value={p.tolerancia ?? 0} onChange={(e) => set("tolerancia", Math.abs(Number(e.target.value) || 0))} className={`${inputBase} mt-1`} />
                  </label>
                  <label className="text-sm">
                    <span className="font-medium text-gray-900">Tipo</span>
                    <select value={p.toleranciaTipo ?? "relativa"} onChange={(e) => set("toleranciaTipo", e.target.value as "relativa" | "absoluta")} className={`${inputBase} mt-1`}>
                      <option value="relativa">Relativa</option>
                      <option value="absoluta">Nominal (±)</option>
                    </select>
                  </label>
                  <label className="text-sm">
                    <span className="font-medium text-gray-900">Decimales</span>
                    <input type="number" min={0} max={10} value={p.decimales ?? 2} onChange={(e) => set("decimales", Math.max(0, Math.min(10, Number(e.target.value) || 0)))} className={`${inputBase} mt-1`} />
                  </label>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">Variables {variables.length ? "" : "(escribe {a}, {b}… en el texto)"}</p>
                {variables.map((v) => (
                  <div key={v.nombre} className="mt-1.5 grid grid-cols-[4rem_auto_6rem_auto_6rem_auto_4.5rem_auto] items-center gap-2 text-sm">
                    <span className="w-16 font-mono text-gray-700">{`{${v.nombre}}`}</span>
                    <span className="text-xs text-gray-500">de</span>
                    <input type="number" step="any" value={v.min} onChange={(e) => setVariable(v.nombre, { min: Number(e.target.value) })} className={`${inputBase} w-24 py-1`} />
                    <span className="text-xs text-gray-500">a</span>
                    <input type="number" step="any" value={v.max} onChange={(e) => setVariable(v.nombre, { max: Number(e.target.value) })} className={`${inputBase} w-24 py-1`} />
                    <span className="text-xs text-gray-500">con</span>
                    <input type="number" min={0} max={6} value={v.decimales} onChange={(e) => setVariable(v.nombre, { decimales: Math.max(0, Math.min(6, Number(e.target.value) || 0)) })} className={`${inputBase} w-16 py-1`} />
                    <span className="text-xs text-gray-500">decimales</span>
                  </div>
                ))}
              </div>
              {variables.length > 0 && (
                <p className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                  Ejemplo: {Object.entries(item.valores ?? {}).map(([k, v]) => `${k} = ${formatoNumero(v)}`).join(", ")}
                  {resultado !== null && (
                    <>
                      {" "}
                      → respuesta <strong className="text-emerald-700">{formatoNumero(Number(resultado.toFixed(p.decimales ?? 2)))}</strong>
                    </>
                  )}
                  <button type="button" onClick={() => setSemilla(semilla + 1)} className="inline-flex items-center gap-1 text-primary">
                    <RefreshCw size={12} /> Otros valores
                  </button>
                </p>
              )}
            </div>
          )}

          {p.tipo === "aleatoria" && (
            <label className="block text-sm">
              <span className="font-medium text-gray-900">Número de preguntas a relacionar</span>
              <span className="mt-1 flex items-center gap-2">
                <input type="number" min={2} max={10} value={p.cantidadAleatoria ?? 3} onChange={(e) => set("cantidadAleatoria", Math.max(2, Math.min(10, Number(e.target.value) || 2)))} className={`${inputBase} w-20`} />
                <span className={`text-xs ${cortas.length >= (p.cantidadAleatoria ?? 3) ? "text-gray-500" : "text-red-700"}`}>
                  Hay {cortas.length} preguntas de respuesta corta activas {cortas.some((x) => x.tema === p.tema) && cortas.every((x) => x.tema === p.tema) ? "en este tema" : "en esta área"}.
                </span>
              </span>
            </label>
          )}

          {p.enunciado.trim() && TIPO[p.tipo]?.disponible && (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-3">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-500">Vista previa (así la ve el aspirante; puedes probar respuestas)</p>
              <ResponderPregunta p={p} item={item} orden={SIN_ORDEN} valor={prueba} onCambio={setPrueba} />
            </div>
          )}

          <label className="block text-sm">
            <span className="font-medium text-gray-900">Retroalimentación (opcional)</span>
            <textarea value={p.retroalimentacion ?? ""} onChange={(e) => set("retroalimentacion", e.target.value || undefined)} rows={2} className={`${inputBase} mt-1`} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={p.activa} onChange={(e) => set("activa", e.target.checked)} /> Activa (puede salir en el examen)
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <footer className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
          <button type="button" className={botonSecundario} onClick={onCancelar}>
            Cancelar
          </button>
          <button type="button" className={botonPrimario} onClick={guardar}>
            <Save size={15} /> Guardar
          </button>
        </footer>
      </div>
    </div>
  );
}
