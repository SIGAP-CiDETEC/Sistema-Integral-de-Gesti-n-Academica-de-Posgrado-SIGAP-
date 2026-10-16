"use client";

import { useSyncExternalStore } from "react";
import { ID_EJEMPLO_OBSERVACION } from "./posgrado/datos";

/**
 * Qué aspirante usa el portal del aspirante en este navegador. SOLO CASCARÓN.
 * - ASP-2026-001: el aspirante que se llena en este navegador (registro, documentos, formatos…).
 * - ASP-2026-050: perfil de ejemplo con un documento observado (entra con ese ID en el login).
 * Con backend esto no existe: el aspirante es el de la sesión (JWT).
 */
export const ID_EN_VIVO = "ASP-2026-001";
const CLAVE = "sigap-aspirante-activo";
const EVENTO = "sigap-aspirante-activo";

export function leerAspiranteActivo(): string {
  try {
    return localStorage.getItem(CLAVE) === ID_EJEMPLO_OBSERVACION ? ID_EJEMPLO_OBSERVACION : ID_EN_VIVO;
  } catch {
    return ID_EN_VIVO;
  }
}

export function fijarAspiranteActivo(id: string) {
  try {
    if (id === ID_EJEMPLO_OBSERVACION) localStorage.setItem(CLAVE, id);
    else localStorage.removeItem(CLAVE);
  } catch {
    /* ignorar */
  }
  window.dispatchEvent(new Event(EVENTO));
}

const suscribir = (cb: () => void) => {
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENTO, cb);
    window.removeEventListener("storage", cb);
  };
};

/** ID del aspirante con el que se está usando el portal. */
export function useAspiranteActivo(): string {
  return useSyncExternalStore(suscribir, leerAspiranteActivo, () => ID_EN_VIVO);
}

/** Claves de almacenamiento del expediente: el perfil de ejemplo guarda aparte para no mezclarse con el aspirante en vivo. */
export const claveDe = (base: string, id: string) => (id === ID_EN_VIVO ? base : `${base}:${id}`);
