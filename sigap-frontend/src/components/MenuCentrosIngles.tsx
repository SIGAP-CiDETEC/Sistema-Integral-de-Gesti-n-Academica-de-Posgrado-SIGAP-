"use client";

import { ChevronDown, ExternalLink } from "lucide-react";
import { CENTROS_INGLES } from "@/lib/contenido";

/** Botón "Ver centros" que despliega los CENLEX del IPN; cada uno abre su información en otra pestaña. */
export function MenuCentrosIngles() {
  return (
    <details className="group relative self-start">
      <summary className="flex cursor-pointer list-none items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-primary hover:bg-indigo-100 [&::-webkit-details-marker]:hidden">
        Ver centros <ChevronDown size={12} className="transition-transform group-open:rotate-180" />
      </summary>
      <ul className="absolute left-0 z-20 mt-1.5 w-64 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg">
        {CENTROS_INGLES.map((c) => (
          <li key={c.nombre}>
            <a href={c.href} target="_blank" rel="noopener noreferrer" className="flex items-start justify-between gap-2 px-3 py-2 hover:bg-gray-50">
              <span>
                <span className="block font-medium text-gray-900">{c.nombre}</span>
                <span className="block text-xs text-gray-500">{c.detalle}</span>
              </span>
              <ExternalLink size={13} className="mt-1 shrink-0 text-gray-400" />
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
