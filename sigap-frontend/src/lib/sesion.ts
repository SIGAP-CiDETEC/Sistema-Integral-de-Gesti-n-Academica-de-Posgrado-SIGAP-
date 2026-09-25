"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Rol } from "./nav";
import { leerAccesos, registrarEventoAdmin, rolDeCuenta, useAccesos, type AreaPersonal } from "./admin/accesos";

/**
 * Cuentas del personal con credenciales únicas (RF-32, AD-02). SOLO CASCARÓN.
 * Con backend: POST /auth/login (JWT + hash de contraseñas); cada acción queda
 * a nombre de quien inició sesión (bitácora, RNF-11). Estas cuentas NO son reales.
 */
export type Usuario = { correo: string; contrasena: string; nombre: string; puesto: string; rol: Rol };

export const USUARIOS_DEMO: Usuario[] = [
  {
    correo: "analista.posgrado@ipn.mx",
    contrasena: "Posgrado#2026",
    nombre: "Analista de Posgrado",
    puesto: "Analista · Departamento de Posgrado",
    rol: "posgrado",
  },
  {
    correo: "jefatura.posgrado@ipn.mx",
    contrasena: "Jefatura#2026",
    nombre: "Jefatura de Posgrado",
    puesto: "Jefa del Departamento de Posgrado",
    rol: "posgrado",
  },
  {
    correo: "control.escolar@ipn.mx",
    contrasena: "Uteycv#2026",
    nombre: "Control Escolar (UTEyCV)",
    puesto: "Analista · UTEyCV (Control Escolar)",
    rol: "uteycv",
  },
  { correo: "admin.sigap@ipn.mx", contrasena: "Admin#2026", nombre: "Admin CIDETEC", puesto: "Administrador del sistema", rol: "admin" },
];

export type Sesion = { correo: string; nombre: string; puesto: string; rol: Rol; desde: string };

const CLAVE = "sigap-sesion";
const EVENTO = "sigap-sesion";

/**
 * Valida las credenciales. Incluye a los usuarios auxiliares (secretarias y analistas)
 * que dio de alta el Administrador (RF-80). Una cuenta desactivada no entra.
 */
export function autenticar(correo: string, contrasena: string): Usuario | null {
  const c = correo.trim().toLowerCase();
  const acc = leerAccesos();
  const aux = acc.usuarios.find((x) => x.correo === c);
  let u: Usuario | null = null;
  if (aux) {
    const rol = rolDeCuenta(acc, c);
    if (aux.activo && rol && aux.contrasena === contrasena)
      u = { correo: c, contrasena: aux.contrasena, nombre: aux.nombre, puesto: rol.nombre, rol: rol.area as AreaPersonal };
  } else {
    const base = USUARIOS_DEMO.find((x) => x.correo === c);
    if (base && base.contrasena === contrasena && !acc.inactivos.includes(c)) {
      const rol = rolDeCuenta(acc, c);
      u = { ...base, puesto: rol?.nombre ?? base.puesto };
    }
  }
  // Bitácora de seguridad (RF-82): accesos del personal, exitosos y fallidos
  if (c.includes("@"))
    registrarEventoAdmin({ usuario: c, modulo: "Acceso", accion: u ? "Inició sesión" : "Intento fallido", detalle: u ? u.puesto : "Credenciales incorrectas o cuenta inactiva" });
  return u;
}

export function iniciarSesion(u: Usuario) {
  const s: Sesion = { correo: u.correo, nombre: u.nombre, puesto: u.puesto, rol: u.rol, desde: new Date().toISOString() };
  try {
    localStorage.setItem(CLAVE, JSON.stringify(s));
  } catch {
    /* ignorar */
  }
  window.dispatchEvent(new Event(EVENTO));
}

export function cerrarSesion() {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    /* ignorar */
  }
  window.dispatchEvent(new Event(EVENTO));
}

const leer = () => {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
};

function suscribir(cb: () => void) {
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENTO, cb);
    window.removeEventListener("storage", cb);
  };
}

/**
 * Permisos vigentes de la sesión (se recalculan si el Administrador cambia el rol).
 * null = sin restricción por permisos (aspirante, alumno, administrador).
 */
export function usePermisos(): Set<string> | null {
  const { sesion } = useSesion();
  const acc = useAccesos();
  return useMemo(() => {
    if (!sesion || (sesion.rol !== "posgrado" && sesion.rol !== "uteycv")) return null;
    return new Set(rolDeCuenta(acc, sesion.correo)?.permisos ?? []);
  }, [sesion, acc]);
}

/** Sesión del personal (null si no hay) y si ya se leyó del navegador. */
export function useSesion() {
  const raw = useSyncExternalStore(suscribir, leer, () => null);
  const cargado = useSyncExternalStore(suscribir, () => true, () => false);
  const sesion = useMemo<Sesion | null>(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Sesion;
    } catch {
      return null;
    }
  }, [raw]);
  return { sesion, cargado };
}
