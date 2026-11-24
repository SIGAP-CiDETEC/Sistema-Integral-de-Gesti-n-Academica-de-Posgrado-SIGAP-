"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Contenido } from "./Contenido";

/**
 * Muestra un HTML con huecos (<span data-hueco="i">) y monta en cada uno el control que se le indique:
 * así los menús o casillas quedan dentro del texto, sin romper sus fórmulas ni su formato.
 */
export function TextoConHuecos({ html, hueco, className = "" }: { html: string; hueco: (i: number) => ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [destinos, setDestinos] = useState<HTMLElement[]>([]);
  useEffect(() => {
    // Contenido pinta el HTML en su propio efecto (que corre antes que este)
    const els = Array.from(ref.current?.querySelectorAll<HTMLElement>("[data-hueco]") ?? []);
    setDestinos(els);
  }, [html]);
  return (
    <div ref={ref}>
      <Contenido html={html} className={className} />
      {destinos.map((el) => createPortal(hueco(Number(el.dataset.hueco)), el, el.dataset.hueco))}
    </div>
  );
}
