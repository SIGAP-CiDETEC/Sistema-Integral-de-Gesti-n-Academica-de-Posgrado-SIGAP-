"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * Transición aspirante → alumno (RF-29 a RF-31, RN-12). SOLO CASCARÓN.
 * Con backend: UTEyCV captura el número SICEP, el servidor cambia el usuario de acceso,
 * envía el correo con contraseña temporal y marca "debe cambiar contraseña".
 */
export type CuentaAlumno = {
  numeroRegistro: string;
  idTemporal: string;
  /** Fecha ISO en que UTEyCV registró el número SICEP */
  asignadoEl: string;
  /** Fecha ISO del cambio de contraseña (primer inicio de sesión como alumno) */
  contrasenaCambiadaEl?: string;
};

const CLAVE = "sigap-cuenta-alumno";
const EVENTO = "sigap-cuenta-alumno";

function leerRaw(): string | null {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

function parsear(raw: string | null): CuentaAlumno | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CuentaAlumno;
  } catch {
    return null;
  }
}

export const leerCuenta = () => parsear(leerRaw());

export function guardarCuenta(c: CuentaAlumno | null) {
  try {
    if (c) localStorage.setItem(CLAVE, JSON.stringify(c));
    else localStorage.removeItem(CLAVE);
  } catch {
    /* sin almacenamiento: solo en memoria de esta vista */
  }
  window.dispatchEvent(new Event(EVENTO));
}

function suscribir(cb: () => void) {
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENTO, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Cuenta del alumno (null si todavía es aspirante) y si ya se leyó del navegador. */
export function useCuentaAlumno() {
  const raw = useSyncExternalStore(suscribir, leerRaw, () => null);
  const cargado = useSyncExternalStore(suscribir, () => true, () => false);
  const cuenta = useMemo(() => parsear(raw), [raw]);
  return { cuenta, cargado };
}

export const ID_TEMPORAL_DEMO = "ASP-2026-001";

/** Todo lo que el cascarón guarda en el navegador (aspirante, alumno, Posgrado y sesión). */
const CLAVES_CASCARON = ["sigap-aspirante-registro", "sigap-expediente", "sigap-registro-borrador", "sigap-posgrado", "sigap-evaluacion-config", "sigap-accesos", "sigap-convocatoria", "sigap-sesion", CLAVE];

/**
 * Solo cascarón: borra TODO lo capturado y regresa al inicio de sesión,
 * como si nadie hubiera llenado nada todavía. Recarga la página para limpiar la memoria.
 */
export function reiniciarDemo() {
  for (const k of CLAVES_CASCARON) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignorar */
    }
  }
  // Recarga completa a propósito: así se descarta también el estado en memoria de la sesión
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = "/login";
}
