import { NIVELES, nuevoId, type Nivel, type Opcion, type Par, type Pregunta } from "./examen";
import { variablesEn, type Variable } from "./examen-tipos";
import type { ResultadoImportacion } from "./examen-gift";
import type { AreaEvalId } from "./posgrado/datos";

/**
 * Importa un banco exportado de Moodle en formato Moodle XML (.xml). A diferencia de GIFT, trae todos los tipos
 * de pregunta y las imágenes adjuntas.
 * - Nivel: de la etiqueta (tag) o, si no hay, de una carpeta llamada como un nivel de Bloom (…/Comprender).
 * - Tema: de la última carpeta que no sea un nivel; si no hay, del nombre (PROG_4_4.2_…: unidad 4).
 * Tipos: todos los de texto de Moodle (opción múltiple, falso/verdadero, relacionar, respuesta corta, numérica, ensayo,
 * arrastrar y soltar dentro del texto, palabras faltantes, Cloze, relacionar aleatoriamente y calculadas).
 * Los de arrastrar sobre imagen o marcadores se reportan como omitidos (próximamente).
 */

const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const NIVEL_POR_NOMBRE = new Map<string, Nivel>(NIVELES.map((n) => [n, n]));
const nivelDe = (s: string) => NIVEL_POR_NOMBRE.get(sinAcentos(s));

const TIPOS_NO_COMPATIBLES: Record<string, string> = {
  ddimageortext: "Arrastrar y soltar sobre imagen (próximamente)",
  ddmarker: "Arrastrar y soltar marcadores (próximamente)",
  ordering: "Ordenamiento (no compatible)",
};
const COMPATIBLES = ["multichoice", "truefalse", "matching", "shortanswer", "numerical", "essay", "ddwtos", "gapselect", "multianswer", "randomsamatch", "calculated", "calculatedsimple", "calculatedmulti"];
const numero = (el: Element | null | undefined) => Number((el?.textContent ?? "").trim() || 0);

const MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", svg: "image/svg+xml", webp: "image/webp" };
const escaparHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Hijo directo con ese nombre (sin entrar a subpreguntas). */
const hijo = (el: Element | null | undefined, nombre: string) => (el ? (Array.from(el.children).find((c) => c.tagName === nombre) ?? null) : null);
const hijos = (el: Element, nombre: string) => Array.from(el.children).filter((c) => c.tagName === nombre);
const textoDe = (el: Element | null | undefined) => hijo(el, "text")?.textContent ?? "";

/** Texto con formato (questiontext, answer, feedback…) a HTML, con sus imágenes incrustadas. */
function contenido(el: Element | null | undefined): string {
  if (!el) return "";
  let t = textoDe(el).trim();
  const formato = el.getAttribute("format") ?? "html";
  if (formato !== "html") t = escaparHtml(t).replace(/\n/g, "<br>");
  for (const f of hijos(el, "file")) {
    const nombre = f.getAttribute("name") ?? "";
    const ext = nombre.split(".").pop()?.toLowerCase() ?? "";
    const datos = (f.textContent ?? "").replace(/\s+/g, "");
    if (!MIME[ext] || !datos) continue;
    const ruta = `@@PLUGINFILE@@${f.getAttribute("path") ?? "/"}${nombre}`;
    const uri = `data:${MIME[ext]};base64,${datos}`;
    t = t.split(ruta).join(uri).split(ruta.replace(/ /g, "%20")).join(uri);
  }
  return t;
}

export function importarMoodleXml(xml: string, area: AreaEvalId, por: string): ResultadoImportacion {
  const preguntas: Pregunta[] = [];
  const omitidas: ResultadoImportacion["omitidas"] = [];
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (doc.getElementsByTagName("parsererror").length || doc.documentElement?.tagName !== "quiz") return { preguntas, omitidas: [{ nombre: "(archivo)", motivo: "No es un XML de Moodle válido" }] };
  const ahora = new Date().toISOString();
  let categoria: string[] = [];

  for (const q of hijos(doc.documentElement, "question")) {
    const tipo = q.getAttribute("type") ?? "";
    if (tipo === "category") {
      categoria = textoDe(hijo(q, "category"))
        .split("/")
        .map((x) => x.trim())
        .filter((x) => x && !x.startsWith("$") && x !== "top" && !/^por defecto/i.test(x));
      continue;
    }
    if (tipo === "description" || tipo === "random") continue;
    const nombre = textoDe(hijo(q, "name")).trim() || "(sin nombre)";
    if (TIPOS_NO_COMPATIBLES[tipo] || !COMPATIBLES.includes(tipo)) {
      omitidas.push({ nombre, motivo: TIPOS_NO_COMPATIBLES[tipo] ?? `Tipo «${tipo}» no compatible` });
      continue;
    }

    // Nivel: etiqueta, o carpeta con nombre de nivel
    const etiquetas = Array.from(q.getElementsByTagName("tag")).map((t) => textoDe(t));
    const carpetaNivel = categoria.map(nivelDe).find(Boolean);
    const nivel: Nivel = etiquetas.map(nivelDe).find(Boolean) ?? carpetaNivel ?? "sin-nivel";

    // Tema y unidad: carpetas que no son niveles ni la carpeta del banco; si no hay, el nombre
    const temas = categoria.filter((c) => !nivelDe(c)).slice(1);
    let unidad = temas.length >= 2 ? temas[temas.length - 2] : "";
    let tema = temas.length ? temas[temas.length - 1] : "";
    if (!tema) {
      const porNombre = /^[A-Z]+_([0-9A-Z]+)_/.exec(nombre);
      unidad = porNombre ? `Unidad ${porNombre[1]}` : "Sin unidad";
      tema = unidad;
    }

    const retroalimentacion = contenido(hijo(q, "generalfeedback")) || undefined;
    const base = { id: nuevoId(), area, unidad: unidad || "Sin unidad", tema, nivel, enunciado: contenido(hijo(q, "questiontext")), retroalimentacion, activa: true, clave: nombre, origen: "moodle" as const, actualizadoEl: ahora, actualizadoPor: por };
    const respuestas = hijos(q, "answer").map((a) => ({ texto: contenido(a), plano: textoDe(a).trim(), fraccion: Number(a.getAttribute("fraction") ?? 0) }));

    if (tipo === "essay") {
      preguntas.push({ ...base, tipo: "ensayo" });
      continue;
    }
    if (tipo === "numerical") {
      const numericas = hijos(q, "answer")
        .filter((a) => Number(a.getAttribute("fraction") ?? 0) >= 100)
        .map((a) => ({ valor: Number(textoDe(a).trim()), tolerancia: Math.abs(numero(hijo(a, "tolerance"))) }))
        .filter((x) => Number.isFinite(x.valor));
      if (!numericas.length) {
        omitidas.push({ nombre, motivo: "No tiene respuesta correcta" });
        continue;
      }
      preguntas.push({ ...base, tipo: "numerica", numericas });
      continue;
    }
    if (tipo === "ddwtos" || tipo === "gapselect") {
      const elecciones = hijos(q, tipo === "ddwtos" ? "dragbox" : "selectoption").map((d) => ({ texto: textoDe(d).trim(), grupo: numero(hijo(d, "group")) || 1 }));
      if (!elecciones.length || !/\[\[\d+\]\]/.test(base.enunciado)) {
        omitidas.push({ nombre, motivo: "No tiene huecos [[n]] o elecciones" });
        continue;
      }
      preguntas.push({ ...base, tipo: tipo === "ddwtos" ? "arrastrar" : "faltantes", elecciones });
      continue;
    }
    if (tipo === "multianswer") {
      if (!/\{\d*:[A-Z_]+:/.test(base.enunciado)) {
        omitidas.push({ nombre, motivo: "Cloze sin respuestas incrustadas" });
        continue;
      }
      preguntas.push({ ...base, tipo: "cloze" });
      continue;
    }
    if (tipo === "randomsamatch") {
      preguntas.push({ ...base, tipo: "aleatoria", cantidadAleatoria: Math.max(2, numero(hijo(q, "choose")) || 3) });
      continue;
    }
    if (tipo === "calculated" || tipo === "calculatedsimple" || tipo === "calculatedmulti") {
      // Variables: dataset_definitions (rango y decimales)
      const defs = Array.from(q.getElementsByTagName("dataset_definition")).map((d) => ({
        nombre: textoDe(hijo(d, "name")).trim(),
        min: Number(textoDe(hijo(d, "minimum")) || 1),
        max: Number(textoDe(hijo(d, "maximum")) || 10),
        decimales: Number(textoDe(hijo(d, "decimals")) || 0),
      }));
      const answers = hijos(q, "answer");
      const textos = answers.map((a) => textoDe(a).trim());
      const variables: Variable[] = variablesEn(base.enunciado, ...textos).map((n) => defs.find((d) => d.nombre === n) ?? { nombre: n, min: 1, max: 10, decimales: 0 });
      const primera = answers.find((a) => Number(a.getAttribute("fraction") ?? 0) >= 100) ?? answers[0];
      const decimales = numero(hijo(primera, "correctanswerlength")) || 2;
      if (tipo === "calculatedmulti") {
        const mejor = Math.max(...answers.map((a) => Number(a.getAttribute("fraction") ?? 0)));
        const opciones: Opcion[] = answers.map((a, i) => ({ id: String.fromCharCode(97 + i), texto: contenido(a), correcta: mejor > 0 && Number(a.getAttribute("fraction") ?? 0) === mejor }));
        preguntas.push({ ...base, tipo: "calculadaOpcion", opciones, variables, decimales });
        continue;
      }
      if (!primera) {
        omitidas.push({ nombre, motivo: "Calculada sin fórmula" });
        continue;
      }
      // tolerancetype: 1 relativa, 2 nominal, 3 geométrica (se trata como relativa)
      const tt = numero(hijo(primera, "tolerancetype")) || 1;
      preguntas.push({
        ...base,
        tipo: tipo === "calculated" ? "calculada" : "calculadaSimple",
        formula: textoDe(primera).trim(),
        variables,
        tolerancia: Math.abs(numero(hijo(primera, "tolerance"))),
        toleranciaTipo: tt === 2 ? "absoluta" : "relativa",
        decimales,
      });
      continue;
    }
    if (tipo === "truefalse") {
      const correcta = respuestas.find((r) => r.fraccion > 0);
      if (!correcta) {
        omitidas.push({ nombre, motivo: "No tiene respuesta correcta" });
        continue;
      }
      preguntas.push({ ...base, tipo: "vf", verdadero: /^(true|verdadero|t|v)$/i.test(correcta.plano) });
      continue;
    }
    if (tipo === "shortanswer") {
      const validas = respuestas.filter((r) => r.fraccion >= 100).map((r) => r.plano).filter(Boolean);
      if (!validas.length) {
        omitidas.push({ nombre, motivo: "No tiene respuesta correcta" });
        continue;
      }
      preguntas.push({ ...base, tipo: "corta", respuestas: validas });
      continue;
    }
    if (tipo === "matching") {
      const pares: Par[] = hijos(q, "subquestion")
        .map((s) => ({ izquierda: contenido(s), derecha: textoDe(hijo(s, "answer")).trim() }))
        .filter((p) => p.izquierda && p.derecha)
        .map((p, i) => ({ id: `p${i + 1}`, ...p }));
      if (pares.length < 2) {
        omitidas.push({ nombre, motivo: "Relacionar columnas con menos de dos parejas" });
        continue;
      }
      preguntas.push({ ...base, tipo: "relacionar", pares });
      continue;
    }
    // multichoice
    if (hijo(q, "single")?.textContent?.trim() === "false" && respuestas.filter((r) => r.fraccion > 0).length > 1) {
      omitidas.push({ nombre, motivo: "Opción múltiple con varias respuestas correctas (aún no compatible)" });
      continue;
    }
    const mejor = Math.max(...respuestas.map((r) => r.fraccion));
    const opciones: Opcion[] = respuestas.map((r, i) => ({ id: String.fromCharCode(97 + i), texto: r.texto, correcta: mejor > 0 && r.fraccion === mejor }));
    if (!opciones.some((o) => o.correcta)) {
      omitidas.push({ nombre, motivo: "No tiene respuesta correcta" });
      continue;
    }
    preguntas.push({ ...base, tipo: "opcion", opciones });
  }
  return { preguntas, omitidas };
}

/** Elige el lector según el contenido del archivo. */
export const esMoodleXml = (texto: string) => /^\s*(<\?xml[^>]*>\s*)?<quiz[\s>]/.test(texto);
