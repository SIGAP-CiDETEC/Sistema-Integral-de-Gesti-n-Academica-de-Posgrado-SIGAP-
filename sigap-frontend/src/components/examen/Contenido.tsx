"use client";

import { useEffect, useRef } from "react";
import DOMPurify from "dompurify";
import renderMathInElement from "katex/contrib/auto-render";
import "katex/dist/katex.min.css";

/**
 * Muestra el HTML de una pregunta (enunciado, opción o retroalimentación) de forma segura y con fórmulas:
 * \( … \) en línea y $$ … $$ o \[ … \] en bloque (como en Moodle).
 */
export function Contenido({ html, className = "", como: Etiqueta = "div" }: { html: string; className?: string; como?: "div" | "span" }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = DOMPurify.sanitize(html, { FORBID_TAGS: ["style", "form", "input", "button", "iframe"], FORBID_ATTR: ["style"] });
    renderMathInElement(el, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\[", right: "\\]", display: true },
        { left: "\\(", right: "\\)", display: false },
      ],
      throwOnError: false,
    });
  }, [html]);
  return <Etiqueta ref={ref as never} className={`contenido-pregunta ${className}`} />;
}

/** Texto plano de un HTML (para listas y búsquedas). */
export const textoPlano = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
