import { NIVELES, nuevoId, type Nivel, type Opcion, type Par, type Pregunta } from "./examen";
import type { AreaEvalId } from "./posgrado/datos";

/**
 * Importa un banco exportado de Moodle en formato GIFT (.txt).
 * Toma el tema de la categoría ($CATEGORY: …/Unidad/1.1 Tema) y el nivel de la etiqueta [tag:comprender].
 * Si no hay categorías (todo en una), usa el nombre de la pregunta (PROG_4_4.2_…: unidad 4, tema 4.2).
 * Tipos: opción múltiple, verdadero/falso, relacionar columnas y respuesta corta. Las que vienen vacías u otros tipos
 * (arrastrar y soltar, calculadas…) no existen en GIFT: para esos hay que exportar en Moodle XML.
 */
export type ResultadoImportacion = { preguntas: Pregunta[]; omitidas: { nombre: string; motivo: string }[] };

// Caracteres escapados en GIFT (\: \= \~ \# \{ \}) se protegen mientras se analiza
const ESC: [string, string][] = [
  ["\\\\", "\u0000"],
  ["\\:", "\u0001"],
  ["\\=", "\u0002"],
  ["\\~", "\u0003"],
  ["\\#", "\u0004"],
  ["\\{", "\u0005"],
  ["\\}", "\u0006"],
];
const proteger = (s: string) => ESC.reduce((t, [a, b]) => t.split(a).join(b), s);
const restaurar = (s: string) =>
  ESC.reduce((t, [a, b]) => t.split(b).join(a.slice(1)), s)
    .replace(/\\n/g, " ")
    .trim();

const escaparHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function importarGift(texto: string, area: AreaEvalId, por: string): ResultadoImportacion {
  const preguntas: Pregunta[] = [];
  const omitidas: ResultadoImportacion["omitidas"] = [];
  let categoria: string[] = [];
  const ahora = new Date().toISOString();
  const bloques = texto.replace(/\r\n/g, "\n").split(/\n(?=\/\/ question: )/);
  for (const bloque of bloques) {
    const cat = /^\$CATEGORY:\s*(.+)$/m.exec(bloque);
    if (cat) {
      categoria = cat[1]
        .split("/")
        .map((x) => x.trim())
        .filter((x) => x && !x.startsWith("$") && x !== "top");
      continue;
    }
    const nombreComentario = /^\/\/ question: \d+\s+name: (.*)$/m.exec(bloque)?.[1]?.trim() ?? "";
    const etiquetas = [...bloque.matchAll(/\[tag:([^\]]+)\]/g)].map((m) => m[1].trim().toLowerCase());
    // Sin comentarios
    const cuerpo = proteger(
      bloque
        .split("\n")
        .filter((l) => !l.trimStart().startsWith("//"))
        .join("\n"),
    ).trim();
    if (!cuerpo) {
      if (nombreComentario && !nombreComentario.startsWith("Switch category")) omitidas.push({ nombre: nombreComentario, motivo: "Vino vacía en la exportación (tipo no compatible con GIFT; expórtala en Moodle XML)" });
      continue;
    }
    const m = /^(?:::(.*?)::)?\s*(?:\[(html|moodle|markdown|plain)\])?([\s\S]*?)\{([\s\S]*)\}\s*$/.exec(cuerpo);
    const nombre = restaurar(m?.[1] ?? nombreComentario);
    if (!m) {
      omitidas.push({ nombre: nombre || "(sin nombre)", motivo: "Formato no reconocido" });
      continue;
    }
    const html = m[2] === "html";
    const txt = (s: string) => (html ? restaurar(s) : escaparHtml(restaurar(s)));
    const enunciado = txt(m[3]);
    let resp = m[4];
    let retroalimentacion: string | undefined;
    const general = resp.indexOf("####");
    if (general >= 0) {
      retroalimentacion = txt(resp.slice(general + 4)) || undefined;
      resp = resp.slice(0, general);
    }
    resp = resp.trim();

    // Tema y unidad: de la categoría o del nombre (PROG_4_4.2_…)
    let unidad = categoria.length >= 2 ? categoria[categoria.length - 2] : "";
    let tema = categoria.length ? categoria[categoria.length - 1] : "";
    const porNombre = /^[A-Z]+_([0-9A-Z]+)_(\d+(?:\.\d+)?)_/.exec(nombre);
    if (categoria.length <= 1 && porNombre) {
      unidad = `Unidad ${porNombre[1]}`;
      tema = `Tema ${porNombre[2]}`;
    } else if (categoria.length <= 1) {
      unidad = "Sin unidad";
      tema = categoria[0] ? "Sin tema" : "Sin tema";
    }
    // Quita prefijos de la categoría que no aportan (p. ej. "Por defecto en …")
    if (/^por defecto/i.test(unidad)) unidad = "Sin unidad";
    const nivel = (etiquetas.find((e) => (NIVELES as readonly string[]).includes(e)) ?? "sin-nivel") as Nivel;
    const base = { id: nuevoId(), area, unidad, tema: tema || "Sin tema", nivel, enunciado, retroalimentacion, activa: true, clave: nombre, origen: "moodle" as const, actualizadoEl: ahora, actualizadoPor: por };

    const vf = /^(TRUE|FALSE|T|F)\b/i.exec(resp);
    if (vf) {
      preguntas.push({ ...base, tipo: "vf", verdadero: /^t/i.test(vf[1]) });
      continue;
    }
    if (resp.startsWith("#")) {
      // Numérica: {#3.14:0.01}, {#1..5} o varias respuestas {# =3.14:0.01 =3:0.5}
      const cuerpo = resp.slice(1).trim();
      const lista = /^[=~%]/.test(cuerpo) ? cuerpo.split(/(?=[=~])/).filter((x) => x.trim().startsWith("=") || /^~?%100%/.test(x.trim())) : [cuerpo];
      const numericas = lista
        .map((x) => restaurar(x.replace(/^[=~]/, "").replace(/^%\d+%/, "").split("#")[0]).trim())
        .map((x) => {
          const rango = /^(-?[\d.]+)\.\.(-?[\d.]+)$/.exec(x);
          if (rango) return { valor: (Number(rango[1]) + Number(rango[2])) / 2, tolerancia: Math.abs(Number(rango[2]) - Number(rango[1])) / 2 };
          const [v, t] = x.split(":");
          return { valor: Number(v), tolerancia: Math.abs(Number(t ?? 0) || 0) };
        })
        .filter((x) => Number.isFinite(x.valor) && x.valor === x.valor);
      if (!numericas.length) {
        omitidas.push({ nombre, motivo: "Numérica sin respuesta válida" });
        continue;
      }
      preguntas.push({ ...base, tipo: "numerica", numericas });
      continue;
    }
    if (!resp) {
      preguntas.push({ ...base, tipo: "ensayo" });
      continue;
    }
    const partes = resp
      .split(/(?=[=~])/)
      .map((x) => x.trim())
      .filter(Boolean);
    const quitarRetro = (s: string) => s.split("#")[0];
    if (partes.some((x) => x.includes("->"))) {
      const pares: Par[] = partes
        .filter((x) => x.startsWith("="))
        .map((x, i) => {
          const [izq, der] = quitarRetro(x.slice(1)).split("->");
          return { id: `p${i + 1}`, izquierda: txt(izq ?? ""), derecha: restaurar(der ?? "") };
        });
      preguntas.push({ ...base, tipo: "relacionar", pares });
      continue;
    }
    const conPeso = (x: string) => {
      const w = /^[=~]%(-?\d+(?:\.\d+)?)%/.exec(x);
      return { peso: w ? Number(w[1]) : x.startsWith("=") ? 100 : 0, texto: quitarRetro(x.replace(/^[=~](%-?\d+(?:\.\d+)?%)?/, "")) };
    };
    if (partes.every((x) => x.startsWith("="))) {
      preguntas.push({ ...base, tipo: "corta", respuestas: partes.map((x) => restaurar(conPeso(x).texto)).filter(Boolean) });
      continue;
    }
    const opciones: Opcion[] = partes.map((x, i) => {
      const c = conPeso(x);
      return { id: String.fromCharCode(97 + i), texto: txt(c.texto), correcta: c.peso > 0 };
    });
    if (!opciones.some((o) => o.correcta)) {
      omitidas.push({ nombre, motivo: "No tiene respuesta correcta" });
      continue;
    }
    preguntas.push({ ...base, tipo: "opcion", opciones });
  }
  return { preguntas, omitidas };
}
