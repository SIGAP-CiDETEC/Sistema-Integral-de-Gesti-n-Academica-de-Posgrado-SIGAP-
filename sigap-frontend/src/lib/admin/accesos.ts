"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * Roles por departamento y usuarios auxiliares (secretarias y analistas) — RF-79, RF-80, RNF-01.
 * SOLO CASCARÓN: se guardan en el navegador. Con backend: tablas roles, permisos y usuarios (NestJS + guards).
 */

export type AreaPersonal = "posgrado" | "uteycv";
export const NOMBRE_AREA: Record<AreaPersonal, string> = { posgrado: "Departamento de Posgrado", uteycv: "Control Escolar (UTEyCV)" };

export type Permiso = { id: string; area: AreaPersonal; nombre: string; ruta: string };

/** Permisos del proceso de admisión: cada uno abre una pestaña de la sesión del área. */
export const PERMISOS: Permiso[] = [
  { id: "pg.expedientes", area: "posgrado", nombre: "Revisar y validar expedientes", ruta: "/posgrado/aspirantes" },
  { id: "pg.entrevistas", area: "posgrado", nombre: "Programar entrevistas y registrar dictámenes", ruta: "/posgrado/entrevistas" },
  { id: "pg.evaluacion", area: "posgrado", nombre: "Gestionar evaluación (fechas, elecciones y resultados)", ruta: "/posgrado/evaluacion" },
  { id: "pg.comision", area: "posgrado", nombre: "Comisión de Admisión y resolución del Colegio", ruta: "/posgrado/comision" },
  { id: "pg.comunicados", area: "posgrado", nombre: "Enviar comunicados a aspirantes", ruta: "/posgrado/comunicados" },
  { id: "pg.bitacora", area: "posgrado", nombre: "Consultar bitácora", ruta: "/posgrado/bitacora" },
  { id: "ut.ingles", area: "uteycv", nombre: "Aval de inglés con la DFLE", ruta: "/uteycv/ingles" },
  { id: "ut.cartas", area: "uteycv", nombre: "Validar cartas SIP-05 y SIP-06", ruta: "/uteycv/cartas" },
  { id: "ut.dictamen", area: "uteycv", nombre: "Elaborar y publicar el dictamen SIP-04", ruta: "/uteycv/dictamen" },
  { id: "ut.matricula", area: "uteycv", nombre: "Formalizar matrícula (SIP-08 y SICEP)", ruta: "/uteycv/matricula" },
  { id: "ut.bitacora", area: "uteycv", nombre: "Consultar bitácora", ruta: "/uteycv/bitacora" },
];

export type RolPersonal = { id: string; nombre: string; area: AreaPersonal; permisos: string[]; base?: boolean };

const todos = (area: AreaPersonal) => PERMISOS.filter((p) => p.area === area).map((p) => p.id);

export const ROLES_BASE: RolPersonal[] = [
  { id: "pg-jefatura", nombre: "Jefatura de Posgrado", area: "posgrado", permisos: todos("posgrado"), base: true },
  { id: "pg-analista", nombre: "Analista de Posgrado", area: "posgrado", permisos: todos("posgrado") },
  { id: "pg-validaciones", nombre: "Analista de validaciones de Posgrado", area: "posgrado", permisos: ["pg.expedientes", "pg.comunicados"] },
  { id: "pg-secretaria", nombre: "Secretaria de Admisión Posgrado", area: "posgrado", permisos: ["pg.expedientes", "pg.entrevistas", "pg.comunicados"] },
  { id: "ut-control", nombre: "Control Escolar (UTEyCV)", area: "uteycv", permisos: todos("uteycv"), base: true },
  { id: "ut-analista", nombre: "Analista de UTEyCV", area: "uteycv", permisos: ["ut.ingles", "ut.cartas"] },
];

/** Rol de las cuentas precargadas del cascarón (ver sesion.ts). */
export const ROL_INICIAL: Record<string, string> = {
  "analista.posgrado@ipn.mx": "pg-analista",
  "jefatura.posgrado@ipn.mx": "pg-jefatura",
  "control.escolar@ipn.mx": "ut-control",
};

export type UsuarioAux = { correo: string; nombre: string; contrasena: string; rolId: string; activo: boolean; creadoEl: string };
export type EventoAdmin = { fecha: string; usuario: string; modulo: "Usuarios" | "Roles" | "Convocatoria" | "Acceso"; accion: string; detalle: string };

type Estado = {
  roles: RolPersonal[];
  usuarios: UsuarioAux[];
  /** Rol asignado a las cuentas precargadas (si el administrador lo cambió) */
  rolDe: Record<string, string>;
  /** Cuentas precargadas desactivadas */
  inactivos: string[];
  bitacora: EventoAdmin[];
};

const CLAVE = "sigap-accesos";
const EVENTO = "sigap-accesos";
const INICIAL: Estado = { roles: ROLES_BASE, usuarios: [], rolDe: {}, inactivos: [], bitacora: [] };

const leerRaw = () => {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
};

export function leerAccesos(): Estado {
  try {
    const raw = leerRaw();
    return raw ? { ...INICIAL, ...(JSON.parse(raw) as Estado) } : INICIAL;
  } catch {
    return INICIAL;
  }
}

export function actualizarAccesos(fn: (e: Estado) => Estado) {
  const nuevo = fn(leerAccesos());
  try {
    localStorage.setItem(CLAVE, JSON.stringify(nuevo));
  } catch {
    /* ignorar */
  }
  window.dispatchEvent(new Event(EVENTO));
}

/** Agrega un evento a la bitácora de administración y seguridad (RF-82, RNF-11). */
export function registrarEventoAdmin(ev: Omit<EventoAdmin, "fecha">) {
  actualizarAccesos((e) => ({ ...e, bitacora: [{ ...ev, fecha: new Date().toISOString() }, ...e.bitacora].slice(0, 500) }));
}

const suscribir = (cb: () => void) => {
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENTO, cb);
    window.removeEventListener("storage", cb);
  };
};

export function useAccesos(): Estado {
  const raw = useSyncExternalStore(suscribir, leerRaw, () => null);
  return useMemo(() => {
    try {
      return raw ? { ...INICIAL, ...(JSON.parse(raw) as Estado) } : INICIAL;
    } catch {
      return INICIAL;
    }
  }, [raw]);
}

/** Rol vigente de una cuenta del personal (precargada o auxiliar). */
export function rolDeCuenta(e: Estado, correo: string): RolPersonal | undefined {
  const aux = e.usuarios.find((u) => u.correo === correo);
  const id = aux?.rolId ?? e.rolDe[correo] ?? ROL_INICIAL[correo];
  return e.roles.find((r) => r.id === id);
}

/** Pestaña que exige permiso (null = libre, como el Inicio). */
export const permisoDeRuta = (ruta: string) => PERMISOS.find((p) => ruta === p.ruta || ruta.startsWith(`${p.ruta}/`)) ?? null;
