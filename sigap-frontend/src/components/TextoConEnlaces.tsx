"use client";

import { Fragment } from "react";

/** http(s)://… o dominios de videollamada escritos sin https (meet.google.com/…, zoom.us/…, teams.microsoft.com/…). */
const URL = /(https?:\/\/[^\s<>"']+|(?:[a-z0-9-]+\.)*(?:meet\.google\.com|zoom\.us|teams\.microsoft\.com|teams\.live\.com|webex\.com)\/[^\s<>"']*)/gi;

/**
 * Muestra un texto (p. ej. la sala o el enlace de la entrevista) con los enlaces que contenga como vínculos que se
 * abren en otra pestaña. El resto del texto queda igual.
 */
export function TextoConEnlaces({ texto, className = "" }: { texto?: string | null; className?: string }) {
  if (!texto) return null;
  const partes = texto.split(URL);
  return (
    <>
      {partes.map((p, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{p}</Fragment>;
        // Puntuación final pegada al enlace (“…/abc.”) no es parte de él
        const [, url, cola] = p.match(/^(.*?)([.,;:)]*)$/) ?? [p, p, ""];
        return (
          <Fragment key={i}>
            <a
              href={/^https?:\/\//i.test(url) ? url : `https://${url}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`break-all font-medium text-primary underline underline-offset-2 hover:text-primary/80 ${className}`}
            >
              {url}
            </a>
            {cola}
          </Fragment>
        );
      })}
    </>
  );
}
