"use client";

import { useCallback, useEffect, useState } from "react";
import { MODO_API, api } from "./api";
import { mensajeDe } from "./avisos-ui";

/** Seminario de Inducción (servidor real): sesiones, espacios y quién presenta en cada uno. */
export type ConfigSeminario = {
  titulo: string;
  lugar: string;
  sesiones: string[];
  horaInicio: string;
  duracionMin: number;
  espaciosPorSesion: number;
  abierto: boolean;
  maxPorProfesor: number;
  /** Por día: presencial o en línea y su lugar o enlace */
  porSesion?: Record<string, DetalleSesion>;
};
export type DetalleSesion = { modalidad: "presencial" | "en-linea"; lugar: string };
/** Modalidad y lugar de un día (si Posgrado no lo indicó: presencial en el lugar general). */
export const detalleDe = (c: ConfigSeminario, fecha: string): DetalleSesion => {
  const d = c.porSesion?.[fecha];
  return { modalidad: d?.modalidad ?? "presencial", lugar: d?.lugar?.trim() || (d?.modalidad === "en-linea" ? "" : c.lugar) };
};
export type EspacioSeminario = {
  id: string;
  fecha: string;
  inicio: string;
  fin: string;
  profesorId?: string;
  profesor: string | null;
  laboratorio?: string;
  el?: string;
  por?: "profesor" | "posgrado";
};
export type Seminario = { publicado: boolean; config: ConfigSeminario; espacios: EspacioSeminario[]; yo: string | null };

export const DURACIONES = [15, 20, 25, 30, 40, 45, 60];

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
/** "2026-11-20" → "viernes 20 de noviembre" */
export function diaSesion(f: string) {
  const [a, m, d] = f.split("-").map(Number);
  return `${DIAS[new Date(a, m - 1, d).getDay()]} ${d} de ${MESES[m - 1]}`;
}

/** "viernes 20 de noviembre" → "Viernes 20 de noviembre" */
export const diaSesionTitulo = (f: string) => {
  const t = diaSesion(f);
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** Espacios agrupados por sesión (día). */
export const porSesion = (espacios: EspacioSeminario[]) =>
  [...new Set(espacios.map((e) => e.fecha))].sort().map((fecha) => ({ fecha, espacios: espacios.filter((e) => e.fecha === fecha) }));

export function useSeminario() {
  const [datos, setDatos] = useState<Seminario | null>(null);
  const [error, setError] = useState("");
  const recargar = useCallback(() => {
    if (!MODO_API) return;
    api<Seminario>("/seminario")
      .then((d) => {
        setDatos(d);
        setError("");
      })
      .catch((e) => setError(mensajeDe(e)));
  }, []);
  useEffect(recargar, [recargar]);
  /** Ejecuta una acción que devuelve el seminario actualizado; devuelve el error (o null). */
  const accion = useCallback(async (ruta: string, cuerpo: unknown, metodo = "POST") => {
    try {
      setDatos(await api<Seminario>(ruta, { metodo, cuerpo }));
      return null;
    } catch (e) {
      recargar();
      return mensajeDe(e);
    }
  }, [recargar]);
  return { datos, error, recargar, accion };
}
