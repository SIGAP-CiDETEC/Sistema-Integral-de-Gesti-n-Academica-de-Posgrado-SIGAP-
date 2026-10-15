"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * Roles por departamento y usuarios auxiliares (secretarias y analistas) — RF-79, RF-80, RNF-01.
 * SOLO CASCARÓN: se guardan en el navegador. Con backend: tablas roles, permisos y usuarios (NestJS + guards).
 */

export type AreaPersonal = "posgrado" | "uteycv" | "subdireccion" | "profesor";
export const NOMBRE_AREA: Record<AreaPersonal, string> = {
  posgrado: "Departamento de Posgrado",
  uteycv: "Control Escolar (UTEyCV)",
  subdireccion: "Subdirección Académica",
  profesor: "Profesores (Colegio)",
};

export type Permiso = { id: string; area: AreaPersonal; nombre: string; ruta: string };

/** Permisos del proceso de admisión: cada uno abre una pestaña de la sesión del área. */
export const PERMISOS: Permiso[] = [
  { id: "pg.expedientes", area: "posgrado", nombre: "Revisar y validar expedientes", ruta: "/posgrado/aspirantes" },
  { id: "pg.entrevistas", area: "posgrado", nombre: "Programar entrevistas y dar seguimiento al acta del sínodo", ruta: "/posgrado/entrevistas" },
  { id: "pg.evaluacion", area: "posgrado", nombre: "Gestionar evaluación (fechas, elecciones y publicación de resultados)", ruta: "/posgrado/evaluacion" },
  { id: "pg.comision", area: "posgrado", nombre: "Comisión de Admisión y resolución del Colegio", ruta: "/posgrado/comision" },
  { id: "pg.comunicados", area: "posgrado", nombre: "Enviar comunicados a aspirantes", ruta: "/posgrado/comunicados" },
  { id: "pg.bitacora", area: "posgrado", nombre: "Consultar bitácora", ruta: "/posgrado/bitacora" },
  { id: "pg.inicio", area: "posgrado", nombre: "Editar el inicio del aspirante", ruta: "/posgrado/inicio-aspirante" },
  { id: "pg.calendario", area: "posgrado", nombre: "Fechas de registro y calendario de las convocatorias (Jefatura)", ruta: "/posgrado/calendario" },
  { id: "pg.calificaciones", area: "posgrado", nombre: "Calificaciones del examen y concentrado de calificaciones (Jefatura)", ruta: "/posgrado/calificaciones" },
  { id: "ut.inscripcion", area: "uteycv", nombre: "Inscripciones: expediente, firmas y número SICEP", ruta: "/uteycv/inscripciones" },
  { id: "sd.aspirantes", area: "subdireccion", nombre: "Consultar aspirantes y su proceso (solo lectura)", ruta: "/subdireccion/aspirantes" },
  { id: "sd.bitacora", area: "subdireccion", nombre: "Consultar bitácora (solo lectura)", ruta: "/subdireccion/bitacora" },
  { id: "ut.bitacora", area: "uteycv", nombre: "Consultar bitácora", ruta: "/uteycv/bitacora" },
  { id: "pr.entrevistas", area: "profesor", nombre: "Entrevistas del sínodo: llenar y firmar el acta MTC-EC", ruta: "/profesor/entrevistas" },
  { id: "pr.evaluacion", area: "profesor", nombre: "Capturar calificaciones del propedéutico de los grupos que imparte", ruta: "/profesor/evaluacion" },
];

export type RolPersonal = { id: string; nombre: string; area: AreaPersonal; permisos: string[]; base?: boolean };

const todos = (area: AreaPersonal) => PERMISOS.filter((p) => p.area === area).map((p) => p.id);

export const ROLES_BASE: RolPersonal[] = [
  { id: "pg-jefatura", nombre: "Jefatura de Posgrado", area: "posgrado", permisos: todos("posgrado"), base: true },
  { id: "pg-analista", nombre: "Analista de Posgrado", area: "posgrado", permisos: todos("posgrado").filter((p) => p !== "pg.calendario" && p !== "pg.calificaciones") },
  { id: "pg-validaciones", nombre: "Analista de validaciones de Posgrado", area: "posgrado", permisos: ["pg.expedientes", "pg.comunicados"] },
  { id: "pg-secretaria", nombre: "Secretaria de Admisión Posgrado", area: "posgrado", permisos: ["pg.expedientes", "pg.entrevistas", "pg.comunicados"] },
  { id: "ut-control", nombre: "Control Escolar (UTEyCV)", area: "uteycv", permisos: todos("uteycv"), base: true },
  { id: "ut-analista", nombre: "Analista de UTEyCV", area: "uteycv", permisos: ["ut.inscripcion"] },
  { id: "sd-subdireccion", nombre: "Subdirección Académica", area: "subdireccion", permisos: todos("subdireccion"), base: true },
  { id: "pr-profesor", nombre: "Profesor colegiado", area: "profesor", permisos: todos("profesor"), base: true },
];

/** Rol de las cuentas precargadas del cascarón (ver sesion.ts). */
export const ROL_INICIAL: Record<string, string> = {
  "analista.posgrado@ipn.mx": "pg-analista",
  "jefatura.posgrado@ipn.mx": "pg-jefatura",
  "control.escolar@ipn.mx": "ut-control",
  "subdireccion.academica@ipn.mx": "sd-subdireccion",
  "rmorales@ipn.mx": "pr-profesor",
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
  /** Permisos que ya existían cuando se guardaron los roles (ver normalizar) */
  permisosConocidos?: string[];
};

const CLAVE = "sigap-accesos";
const EVENTO = "sigap-accesos";
const INICIAL: Estado = { roles: ROLES_BASE, usuarios: [], rolDe: {}, inactivos: [], bitacora: [], permisosConocidos: PERMISOS.map((p) => p.id) };

const leerRaw = () => {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
};

/**
 * Permisos que se agregaron después de que el navegador guardó los roles: se suman a los roles
 * precargados que los tienen por defecto (lo que el administrador quitó a propósito no se toca).
 */
const PERMISOS_NUEVOS = ["pg.inicio", "pg.calendario", "pg.calificaciones", "sd.aspirantes", "sd.bitacora", "ut.inscripcion", "pr.entrevistas", "pr.evaluacion"];
function normalizar(e: Estado): Estado {
  const conocidos = e.permisosConocidos ?? [];
  const faltan = PERMISOS_NUEVOS.filter((p) => !conocidos.includes(p));
  if (!faltan.length) return e;
  const roles = e.roles.map((r) => {
    const base = ROLES_BASE.find((b) => b.id === r.id);
    const agregar = faltan.filter((p) => base?.permisos.includes(p) && !r.permisos.includes(p));
    return agregar.length ? { ...r, permisos: [...r.permisos, ...agregar] } : r;
  });
  // Roles precargados nuevos (p. ej. Subdirección Académica) que el navegador aún no tenía guardados
  for (const b of ROLES_BASE) if (!roles.some((r) => r.id === b.id) && b.permisos.some((p) => faltan.includes(p))) roles.push(b);
  return { ...e, roles, permisosConocidos: [...conocidos, ...faltan] };
}

const interpretar = (raw: string | null): Estado => {
  try {
    if (!raw) return INICIAL;
    const g = JSON.parse(raw) as Estado;
    return normalizar({ ...INICIAL, ...g, permisosConocidos: g.permisosConocidos ?? [] });
  } catch {
    return INICIAL;
  }
};

export function leerAccesos(): Estado {
  return interpretar(leerRaw());
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
  return useMemo(() => interpretar(raw), [raw]);
}

/** Rol vigente de una cuenta del personal (precargada o auxiliar). */
export function rolDeCuenta(e: Estado, correo: string): RolPersonal | undefined {
  const aux = e.usuarios.find((u) => u.correo === correo);
  const id = aux?.rolId ?? e.rolDe[correo] ?? ROL_INICIAL[correo];
  return e.roles.find((r) => r.id === id);
}

/** Pestaña que exige permiso (null = libre, como el Inicio). */
export const permisoDeRuta = (ruta: string) => PERMISOS.find((p) => ruta === p.ruta || ruta.startsWith(`${p.ruta}/`)) ?? null;
