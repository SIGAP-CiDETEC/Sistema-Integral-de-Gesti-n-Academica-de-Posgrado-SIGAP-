/* Copia de sigap-frontend/src/lib/examen-tipos.ts: mantener ambas iguales (la calificación del servidor debe coincidir con la vista previa del front). */
/**
 * Piezas de los tipos de pregunta "de Moodle" que no son de una sola respuesta:
 * fórmulas (calculadas), huecos en el texto (arrastrar y soltar / palabras faltantes) y respuestas incrustadas (Cloze).
 * Sin dependencias de React ni del almacenamiento: solo texto y números.
 */

// ---------- Fórmulas (preguntas calculadas) ----------

export type Variable = { nombre: string; min: number; max: number; decimales: number };

const FUNCIONES: Record<string, (...a: number[]) => number> = {
  abs: Math.abs,
  sqrt: Math.sqrt,
  exp: Math.exp,
  log: Math.log,
  ln: Math.log,
  log10: Math.log10,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  floor: Math.floor,
  ceil: Math.ceil,
  round: (x, d = 0) => Math.round(x * 10 ** d) / 10 ** d,
  pow: Math.pow,
  min: Math.min,
  max: Math.max,
  pi: () => Math.PI,
  fmod: (a, b) => a % b,
};
export const FUNCIONES_FORMULA = Object.keys(FUNCIONES);

/**
 * Evalúa una fórmula como las de Moodle: {x} + 2*{y}, pow({a}, 2), sqrt(...), pi(), etc.
 * Solo números, variables, + - * / ^ ( ) y las funciones de la lista: no ejecuta código.
 */
export function evaluarFormula(formula: string, valores: Record<string, number>): number {
  const texto = formula.replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, v: string) => {
    if (!(v in valores)) throw new Error(`Falta la variable {${v}}`);
    return `(${valores[v]})`;
  });
  const t = texto.match(/\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|\.\d+|[A-Za-z_][A-Za-z0-9_]*|\*\*|[-+*/^(),%]|\S/g) ?? [];
  let i = 0;
  const ver = () => t[i];
  const tomar = (esperado?: string) => {
    const x = t[i++];
    if (esperado && x !== esperado) throw new Error(`Se esperaba «${esperado}»`);
    return x;
  };
  const expresion = (): number => {
    let v = termino();
    while (ver() === "+" || ver() === "-") v = tomar() === "+" ? v + termino() : v - termino();
    return v;
  };
  const termino = (): number => {
    let v = unario();
    while (ver() === "*" || ver() === "/" || ver() === "%") {
      const op = tomar();
      const d = unario();
      v = op === "*" ? v * d : op === "/" ? v / d : v % d;
    }
    return v;
  };
  const unario = (): number => {
    if (ver() === "-") {
      tomar();
      return -unario();
    }
    if (ver() === "+") {
      tomar();
      return unario();
    }
    return potencia();
  };
  const potencia = (): number => {
    const b = primario();
    if (ver() === "^" || ver() === "**") {
      tomar();
      return Math.pow(b, unario());
    }
    return b;
  };
  const primario = (): number => {
    const x = ver();
    if (x === undefined) throw new Error("Fórmula incompleta");
    if (x === "(") {
      tomar();
      const v = expresion();
      tomar(")");
      return v;
    }
    if (/^[\d.]/.test(x)) {
      tomar();
      return Number(x);
    }
    if (/^[A-Za-z_]/.test(x)) {
      tomar();
      const f = FUNCIONES[x.toLowerCase()];
      if (!f) throw new Error(`Función desconocida: ${x}`);
      tomar("(");
      const args: number[] = [];
      if (ver() !== ")") {
        args.push(expresion());
        while (ver() === ",") {
          tomar();
          args.push(expresion());
        }
      }
      tomar(")");
      return f(...args);
    }
    throw new Error(`Símbolo inesperado: ${x}`);
  };
  const v = expresion();
  if (i < t.length) throw new Error(`Sobra «${t[i]}» en la fórmula`);
  if (!Number.isFinite(v)) throw new Error("El resultado no es un número");
  return v;
}

/** Variables {x} que aparecen en un texto o fórmula (sin las {=…}). */
export const variablesEn = (...textos: (string | undefined)[]) => [...new Set(textos.flatMap((t) => [...(t ?? "").matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)].map((m) => m[1])))];

/** Valores al azar para las variables (cada aspirante recibe los suyos). */
export function generarValores(variables: Variable[]): Record<string, number> {
  return Object.fromEntries(
    variables.map((v) => {
      const x = v.min + Math.random() * (v.max - v.min);
      return [v.nombre, Number(x.toFixed(Math.max(0, Math.min(10, v.decimales))))];
    }),
  );
}

export const formatoNumero = (x: number) => (Number.isInteger(x) ? String(x) : String(Number(x.toPrecision(10))));

/** Sustituye {x} por su valor y {=fórmula} por su resultado (texto de la pregunta y opciones calculadas). */
export function sustituir(texto: string, valores: Record<string, number> | undefined, decimales = 2): string {
  if (!valores) return texto;
  return texto
    .replace(/\{=([^{}]*(?:\{[A-Za-z_][A-Za-z0-9_]*\}[^{}]*)*)\}/g, (m, f: string) => {
      try {
        return formatoNumero(Number(evaluarFormula(f, valores).toFixed(decimales)));
      } catch {
        return m;
      }
    })
    .replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (m, v: string) => (v in valores ? formatoNumero(valores[v]) : m));
}

/** ¿La respuesta numérica está dentro de la tolerancia? */
export function dentroDeTolerancia(respuesta: number, correcta: number, tolerancia: number, tipo: "absoluta" | "relativa" = "absoluta") {
  const margen = tipo === "relativa" ? Math.abs(correcta * tolerancia) : Math.abs(tolerancia);
  return Math.abs(respuesta - correcta) <= margen + 1e-9;
}

/** Lee un número escrito por el aspirante (acepta coma decimal). */
export function leerNumero(s: unknown): number | null {
  if (typeof s !== "string" || !s.trim()) return null;
  const n = Number(s.trim().replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// ---------- Huecos [[n]] (arrastrar y soltar dentro del texto / seleccionar palabras faltantes) ----------

export type Eleccion = { texto: string; grupo: number };

/** Marca de un hueco dentro del HTML, donde se monta el control de respuesta. */
export const marcaHueco = (i: number) => `<span data-hueco="${i}"></span>`;

/** Cambia cada [[n]] por un hueco; devuelve qué elección (n, desde 1) es la correcta en cada uno. */
export function prepararHuecos(html: string): { html: string; correctas: number[] } {
  const correctas: number[] = [];
  const salida = html.replace(/\[\[(\d+)\]\]/g, (_, n: string) => {
    correctas.push(Number(n));
    return marcaHueco(correctas.length - 1);
  });
  return { html: salida, correctas };
}

// ---------- Respuestas incrustadas (Cloze) ----------

export type ParteCloze = {
  tipo: "corta" | "numerica" | "opcion";
  /** Peso de la parte dentro de la pregunta */
  peso: number;
  /** Respuestas con su fracción (0 a 1); en numéricas, con tolerancia */
  respuestas: { texto: string; fraccion: number; tolerancia?: number }[];
  /** Cómo se muestra una opción múltiple: menú, vertical u horizontal */
  vista?: "menu" | "vertical" | "horizontal";
};

const TIPO_CLOZE: Record<string, { tipo: ParteCloze["tipo"]; vista?: ParteCloze["vista"] }> = {};
for (const k of ["SHORTANSWER", "SA", "MW", "SHORTANSWER_C", "SAC", "MWC"]) TIPO_CLOZE[k] = { tipo: "corta" };
for (const k of ["NUMERICAL", "NM"]) TIPO_CLOZE[k] = { tipo: "numerica" };
for (const k of ["MULTICHOICE", "MC", "MULTICHOICE_S", "MCS"]) TIPO_CLOZE[k] = { tipo: "opcion", vista: "menu" };
for (const k of ["MULTICHOICE_V", "MCV", "MULTICHOICE_VS", "MCVS", "MULTIRESPONSE", "MR", "MULTIRESPONSE_S", "MRS"]) TIPO_CLOZE[k] = { tipo: "opcion", vista: "vertical" };
for (const k of ["MULTICHOICE_H", "MCH", "MULTICHOICE_HS", "MCHS", "MULTIRESPONSE_H", "MRH", "MULTIRESPONSE_HS", "MRHS"]) TIPO_CLOZE[k] = { tipo: "opcion", vista: "horizontal" };

const RE_CLOZE = /\{(\d*):([A-Z_]+):((?:\\.|[^}\\])*)\}/g;
const partirSinEscape = (s: string, sep: string) => {
  const partes: string[] = [];
  let actual = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\" && i + 1 < s.length) {
      actual += s[i] + s[i + 1];
      i++;
    } else if (s[i] === sep) {
      partes.push(actual);
      actual = "";
    } else actual += s[i];
  }
  partes.push(actual);
  return partes;
};
const quitarEscapes = (s: string) => s.replace(/\\([~#}{:=%\\/"])/g, "$1");

/** Separa las respuestas incrustadas {1:MULTICHOICE:=a~b} del texto y deja un hueco en su lugar. */
export function prepararCloze(html: string): { html: string; partes: ParteCloze[] } {
  const partes: ParteCloze[] = [];
  const salida = html.replace(RE_CLOZE, (m, peso: string, clave: string, cuerpo: string) => {
    const t = TIPO_CLOZE[clave];
    if (!t) return m;
    const respuestas = partirSinEscape(cuerpo, "~")
      .map((r) => {
        let x = r.trim();
        let fraccion = 0;
        const pct = /^%(-?\d+(?:\.\d+)?)%/.exec(x);
        if (x.startsWith("=")) {
          fraccion = 1;
          x = x.slice(1);
        } else if (pct) {
          fraccion = Number(pct[1]) / 100;
          x = x.slice(pct[0].length);
        }
        x = partirSinEscape(x, "#")[0];
        let tolerancia: number | undefined;
        if (t.tipo === "numerica") {
          const [valor, tol] = partirSinEscape(x, ":");
          x = valor;
          tolerancia = Number(tol ?? 0) || 0;
        }
        return { texto: quitarEscapes(x).trim(), fraccion, tolerancia };
      })
      .filter((r) => r.texto !== "");
    partes.push({ tipo: t.tipo, vista: t.vista, peso: Number(peso) || 1, respuestas });
    return marcaHueco(partes.length - 1);
  });
  return { html: salida, partes };
}

const normalizar = (s: string) =>
  s
    .replace(/<[^>]*>/g, " ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** Fracción (0 a 1) que obtiene una respuesta en una parte de Cloze. */
export function puntajeParteCloze(parte: ParteCloze, r: string | undefined): number {
  if (r === undefined || r === "") return 0;
  if (parte.tipo === "opcion") return parte.respuestas[Number(r)]?.fraccion ?? 0;
  if (parte.tipo === "numerica") {
    const n = leerNumero(r);
    if (n === null) return 0;
    return Math.max(0, ...parte.respuestas.filter((x) => x.texto === "*" || dentroDeTolerancia(n, Number(x.texto), x.tolerancia ?? 0)).map((x) => x.fraccion));
  }
  const comodin = (patron: string) => new RegExp(`^${normalizar(patron).replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`);
  return Math.max(0, ...parte.respuestas.filter((x) => comodin(x.texto).test(normalizar(r))).map((x) => x.fraccion));
}
