"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { IdConvocatoria } from "./config";

/**
 * Contenido editable por el Departamento de Posgrado (solo cascarón: se guarda en el navegador).
 * - Calendario de cada convocatoria (imagen que publica la Jefatura de Posgrado; se ve en el inicio público).
 * - Inicio del aspirante: aviso destacado y tarjetas de información.
 * Con backend: GET/PUT /contenido/calendarios y /contenido/inicio-aspirante (las imágenes a almacenamiento de archivos).
 */

export type Calendario = { imagen: string; nombre: string; subidoEl?: string; subidoPor?: string };
export type TarjetaInicio = { id: string; titulo: string; texto: string; accion: string; href: string };
export type AvisoInicio = { visible: boolean; titulo: string; texto: string };
export type InicioAspirante = { aviso: AvisoInicio; tarjetas: TarjetaInicio[]; actualizadoEl?: string; actualizadoPor?: string };

type Contenido = {
  /** null = la Jefatura quitó el calendario de esa convocatoria */
  calendarios: Partial<Record<IdConvocatoria, Calendario | null>>;
  inicioAspirante?: InicioAspirante;
};

/** Calendarios de ejemplo: los de la convocatoria A27/B27 de CIDETEC (convertidos de los PDF oficiales). */
export const CALENDARIOS_EJEMPLO: Record<IdConvocatoria, Calendario> = {
  A: { imagen: "/img/calendario-a27.jpg", nombre: "CalendarioAdmision-A27-CIDETEC" },
  B: { imagen: "/img/calendario-b27.jpg", nombre: "CalendarioAdmision-B27-CIDETEC" },
};

export const INICIO_ASPIRANTE_DEFECTO: InicioAspirante = {
  aviso: {
    visible: true,
    titulo: "Bienvenida/o al proceso de admisión",
    texto: "Revisa en “Mi admisión” en qué etapa vas y qué sigue. Cualquier duda, escríbenos a posgrado.cidetec@ipn.mx.",
  },
  tarjetas: [
    { id: "calendario", titulo: "Calendario IPN", texto: "Periodos escolares, registro, exámenes y resultados del IPN.", accion: "Consultar calendario", href: "https://www.ipn.mx/calendario-academico.html" },
    { id: "convocatorias", titulo: "Convocatorias", texto: "Convocatorias vigentes, requisitos y fechas importantes.", accion: "Ver convocatorias", href: "/#convocatoria" },
    { id: "ingles", titulo: "Lugares para liberar el inglés", texto: "Centros autorizados para acreditar o liberar el inglés.", accion: "Ver centros", href: "#" },
  ],
};

const CLAVE = "sigap-contenido";
const EVENTO = "sigap-contenido";

const leerRaw = () => {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
};
const suscribir = (cb: () => void) => {
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENTO, cb);
    window.removeEventListener("storage", cb);
  };
};
const interpretar = (raw: string | null): Contenido => {
  try {
    const g = raw ? (JSON.parse(raw) as Partial<Contenido>) : {};
    return { ...g, calendarios: g.calendarios ?? {} };
  } catch {
    return { calendarios: {} };
  }
};

/** Guarda un cambio. Devuelve false si el navegador no tuvo espacio (p. ej. imagen muy pesada). */
export function actualizarContenido(fn: (c: Contenido) => Contenido): boolean {
  let ok = true;
  try {
    localStorage.setItem(CLAVE, JSON.stringify(fn(interpretar(leerRaw()))));
  } catch {
    ok = false;
  }
  window.dispatchEvent(new Event(EVENTO));
  return ok;
}

export function useContenido() {
  const raw = useSyncExternalStore(suscribir, leerRaw, () => null);
  const cargado = useSyncExternalStore(suscribir, () => true, () => false);
  return useMemo(() => {
    const c = interpretar(raw);
    const calendarioDe = (id: IdConvocatoria): Calendario | null => (c.calendarios[id] === undefined ? CALENDARIOS_EJEMPLO[id] : c.calendarios[id] ?? null);
    return { cargado, calendarioDe, inicioAspirante: c.inicioAspirante ?? INICIO_ASPIRANTE_DEFECTO, inicioEditado: !!c.inicioAspirante };
  }, [raw, cargado]);
}

/** Reduce una imagen (JPG/PNG) a un ancho máximo para guardarla sin exceder el espacio del navegador. */
export function reducirImagen(file: File, ancho = 1000): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const esc = Math.min(1, ancho / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * esc);
      canvas.height = Math.round(img.height * esc);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("sin canvas"));
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => reject(new Error("imagen inválida"));
    img.src = url;
  });
}
