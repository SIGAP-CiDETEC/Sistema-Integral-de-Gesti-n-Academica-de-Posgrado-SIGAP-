"use client";

import { useSyncExternalStore } from "react";
import type { AreaEvalId } from "./posgrado/datos";
import { BANCO_EJEMPLO } from "./examen-banco-ejemplo";

/**
 * Examen de admisión en línea (primera versión, en la demostración: todo vive en el navegador).
 * - Banco de preguntas: lo editan Posgrado y la Subdirección Académica (se puede importar de Moodle, formato GIFT).
 * - Configuración: cuántas preguntas de cada tema y nivel, tiempo, ventana de aplicación y restricciones.
 * - Aplicación: Posgrado habilita a los aspirantes; a cada uno le toca un examen distinto (preguntas y opciones al azar).
 * - Calificación automática por área (0 a 10); Posgrado la registra en Calificaciones.
 */

export const NIVELES = ["recordar", "comprender", "aplicar", "analizar", "evaluar", "crear"] as const;
export type Nivel = (typeof NIVELES)[number] | "sin-nivel";
export const NOMBRE_NIVEL: Record<Nivel, string> = {
  recordar: "Recordar",
  comprender: "Comprender",
  aplicar: "Aplicar",
  analizar: "Analizar",
  evaluar: "Evaluar",
  crear: "Crear",
  "sin-nivel": "Sin nivel",
};

export type TipoPregunta = "opcion" | "vf" | "relacionar" | "corta";
export const NOMBRE_TIPO: Record<TipoPregunta, string> = { opcion: "Opción múltiple", vf: "Verdadero / falso", relacionar: "Relacionar columnas", corta: "Respuesta corta" };

export type Opcion = { id: string; texto: string; correcta: boolean };
export type Par = { id: string; izquierda: string; derecha: string };

export type Pregunta = {
  id: string;
  area: AreaEvalId;
  /** Unidad o área temática (p. ej. "Probabilidad") */
  unidad: string;
  /** Tema o subtema (p. ej. "2.1 Combinatoria"): con él se arma el examen */
  tema: string;
  nivel: Nivel;
  tipo: TipoPregunta;
  /** Enunciado en HTML (admite fórmulas \( … \) y $$ … $$) */
  enunciado: string;
  opciones?: Opcion[];
  verdadero?: boolean;
  pares?: Par[];
  /** Respuestas aceptadas (respuesta corta) */
  respuestas?: string[];
  retroalimentacion?: string;
  activa: boolean;
  /** Nombre en Moodle (si se importó) */
  clave?: string;
  origen: "moodle" | "sigap";
  actualizadoEl: string;
  actualizadoPor: string;
};

export type ReglaTema = { tema: string; nivel: Nivel | "cualquiera"; cantidad: number };
export type Restricciones = {
  /** Bloquea seleccionar, copiar, pegar, clic derecho e imprimir */
  anticopia: boolean;
  /** Pide pantalla completa y registra cuando sale */
  pantallaCompleta: boolean;
  /** Marca de agua con el ID del aspirante sobre las preguntas */
  marcaAgua: boolean;
  /** Oculta las preguntas cuando cambia de ventana o pestaña */
  ocultarAlSalir: boolean;
  /** Una pregunta por pantalla (si no, todas en una página) */
  unaPorPantalla: boolean;
};
export type ConfigExamen = {
  titulo: string;
  /** Ventana de aplicación (fecha y hora local) */
  inicio: string;
  fin: string;
  duracionMin: number;
  /** Áreas que se presentan en este examen en línea (las demás se califican aparte, en Calificaciones) */
  areasEnLinea: AreaEvalId[];
  reglas: Record<AreaEvalId, ReglaTema[]>;
  /** Relacionar columnas: puntos parciales por cada pareja correcta (si no, todo o nada) */
  relacionarParcial: boolean;
  /** El aspirante ve su calificación al terminar */
  mostrarCalificacion: boolean;
  restricciones: Restricciones;
};

export type Incidente = { tipo: "salio-ventana" | "salio-pantalla-completa" | "copiar" | "clic-derecho" | "captura" | "imprimir"; el: string };
export type Respuesta = string | boolean | Record<string, string> | undefined;
export type Intento = {
  aspirante: string;
  areas: AreaEvalId[];
  /** Preguntas que le tocaron (con el orden de opciones de cada una) */
  preguntas: { id: string; area: AreaEvalId; orden: string[] }[];
  respuestas: Record<string, Respuesta>;
  inicioEl: string;
  /** Hora límite (inicio + duración, o el cierre de la ventana) */
  limiteEl: string;
  terminadoEl?: string;
  calificaciones?: Partial<Record<AreaEvalId, number>>;
  incidentes: Incidente[];
  /** Posgrado ya registró las calificaciones en Calificaciones */
  registradoEl?: string;
};
export type Habilitado = { areas: AreaEvalId[]; el: string; por: string };

type Estado = {
  banco: Pregunta[];
  config: ConfigExamen;
  habilitados: Record<string, Habilitado>;
  intentos: Record<string, Intento>;
};

const CLAVE = "sigap-examen-demo";
const EVENTO = "sigap-examen";

const reglasPorTema = (area: AreaEvalId, cantidad: number): ReglaTema[] =>
  [...new Set(BANCO_EJEMPLO.filter((p) => p.area === area).map((p) => p.tema))].map((tema) => ({ tema, nivel: "cualquiera", cantidad }));

export const CONFIG_INICIAL: ConfigExamen = {
  titulo: "Examen de admisión A-27",
  inicio: "2026-12-07T09:00",
  fin: "2026-12-07T13:00",
  duracionMin: 90,
  areasEnLinea: ["matematicas", "programacion"],
  reglas: { matematicas: reglasPorTema("matematicas", 1), programacion: reglasPorTema("programacion", 1) },
  relacionarParcial: true,
  mostrarCalificacion: false,
  restricciones: { anticopia: true, pantallaCompleta: true, marcaAgua: true, ocultarAlSalir: true, unaPorPantalla: true },
};

const INICIAL: Estado = { banco: BANCO_EJEMPLO, config: CONFIG_INICIAL, habilitados: {}, intentos: {} };

let cache: { raw: string | null; estado: Estado } | null = null;
function leer(): Estado {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(CLAVE);
  } catch {
    /* sin almacenamiento */
  }
  if (cache && cache.raw === raw) return cache.estado;
  let estado = INICIAL;
  try {
    if (raw) {
      const g = JSON.parse(raw) as Partial<Estado>;
      estado = {
        banco: g.banco ?? INICIAL.banco,
        config: { ...CONFIG_INICIAL, ...g.config, restricciones: { ...CONFIG_INICIAL.restricciones, ...g.config?.restricciones } },
        habilitados: g.habilitados ?? {},
        intentos: g.intentos ?? {},
      };
    }
  } catch {
    /* datos dañados: se usa el estado inicial */
  }
  cache = { raw, estado };
  return estado;
}

function escribir(cambio: (e: Estado) => Estado) {
  const nuevo = cambio(leer());
  try {
    localStorage.setItem(CLAVE, JSON.stringify(nuevo));
  } catch {
    throw new Error("No hay espacio en el navegador para guardar el banco de preguntas.");
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

export function useExamen() {
  const estado = useSyncExternalStore(suscribir, leer, () => INICIAL);
  const cargado = useSyncExternalStore(suscribir, () => true, () => false);
  return { ...estado, cargado };
}

export const nuevoId = (p = "q") => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// ---------- Banco ----------

export function guardarPregunta(p: Pregunta) {
  escribir((e) => ({ ...e, banco: e.banco.some((x) => x.id === p.id) ? e.banco.map((x) => (x.id === p.id ? p : x)) : [...e.banco, p] }));
}
export function eliminarPregunta(id: string) {
  escribir((e) => ({ ...e, banco: e.banco.filter((x) => x.id !== id) }));
}
/** Agrega preguntas importadas; con "reemplazar" quita antes las de esa área. */
export function importarPreguntas(area: AreaEvalId, preguntas: Pregunta[], reemplazar: boolean) {
  escribir((e) => {
    const banco = [...(reemplazar ? e.banco.filter((x) => x.area !== area) : e.banco), ...preguntas];
    // Las reglas del examen incluyen los temas nuevos (1 pregunta de cada uno hasta que Posgrado diga cuántas)
    const temas = [...new Set(banco.filter((x) => x.area === area).map((x) => x.tema))];
    const previas = e.config.reglas[area].filter((r) => temas.includes(r.tema));
    const reglas = [...previas, ...temas.filter((t) => !previas.some((r) => r.tema === t)).map((tema) => ({ tema, nivel: "cualquiera" as const, cantidad: 1 }))];
    return { ...e, banco, config: { ...e.config, reglas: { ...e.config.reglas, [area]: reglas } } };
  });
}
export function restaurarBancoEjemplo() {
  escribir((e) => ({ ...e, banco: BANCO_EJEMPLO, config: { ...e.config, reglas: CONFIG_INICIAL.reglas } }));
}

// ---------- Configuración y aplicación ----------

export function guardarConfig(config: ConfigExamen) {
  escribir((e) => ({ ...e, config }));
}
export function habilitar(id: string, h: Habilitado | null) {
  escribir((e) => {
    const habilitados = { ...e.habilitados };
    if (h) habilitados[id] = h;
    else delete habilitados[id];
    return { ...e, habilitados };
  });
}
export function reiniciarIntento(id: string) {
  escribir((e) => {
    const intentos = { ...e.intentos };
    delete intentos[id];
    return { ...e, intentos };
  });
}
export function marcarRegistrado(id: string) {
  escribir((e) => (e.intentos[id] ? { ...e, intentos: { ...e.intentos, [id]: { ...e.intentos[id], registradoEl: new Date().toISOString() } } } : e));
}

/** Preguntas activas que cumplen una regla. */
export const disponibles = (banco: Pregunta[], area: AreaEvalId, r: Pick<ReglaTema, "tema" | "nivel">) =>
  banco.filter((p) => p.activa && p.area === area && p.tema === r.tema && (r.nivel === "cualquiera" || p.nivel === r.nivel));

export const totalPreguntas = (c: ConfigExamen, area: AreaEvalId) => c.reglas[area].reduce((s, r) => s + r.cantidad, 0);

function barajar<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Ventana de aplicación: antes, abierta o cerrada. */
export function estadoVentana(c: ConfigExamen, ahora = new Date()) {
  const ini = new Date(c.inicio);
  const fin = new Date(c.fin);
  return ahora < ini ? "antes" : ahora > fin ? "cerrada" : "abierta";
}

/** El aspirante inicia: se eligen sus preguntas al azar según las reglas, y el orden de opciones de cada una. */
export function iniciarIntento(id: string): Intento {
  const e = leer();
  const h = e.habilitados[id];
  if (!h) throw new Error("No estás habilitado para presentar el examen.");
  if (e.intentos[id]) return e.intentos[id];
  const areas = h.areas.filter((a) => e.config.areasEnLinea.includes(a));
  if (!areas.length) throw new Error("El examen en línea no incluye tus áreas. Avisa al Departamento de Posgrado.");
  const preguntas: Intento["preguntas"] = [];
  for (const area of areas) {
    const elegidas: Pregunta[] = [];
    for (const r of e.config.reglas[area]) {
      const libres = disponibles(e.banco, area, r).filter((p) => !elegidas.includes(p));
      elegidas.push(...barajar(libres).slice(0, r.cantidad));
    }
    if (!elegidas.length) throw new Error(`El examen todavía no tiene preguntas de ${area === "matematicas" ? "Matemáticas" : "Programación"}. Avisa al Departamento de Posgrado.`);
    for (const p of barajar(elegidas))
      preguntas.push({
        id: p.id,
        area,
        orden: p.tipo === "opcion" ? barajar((p.opciones ?? []).map((o) => o.id)) : p.tipo === "relacionar" ? barajar((p.pares ?? []).map((x) => x.id)) : [],
      });
  }
  const inicio = new Date();
  const limite = new Date(Math.min(inicio.getTime() + e.config.duracionMin * 60_000, new Date(e.config.fin).getTime()));
  const intento: Intento = { aspirante: id, areas, preguntas, respuestas: {}, inicioEl: inicio.toISOString(), limiteEl: limite.toISOString(), incidentes: [] };
  escribir((x) => ({ ...x, intentos: { ...x.intentos, [id]: intento } }));
  return intento;
}

export function responder(id: string, pregunta: string, r: Respuesta) {
  escribir((e) => {
    const i = e.intentos[id];
    if (!i || i.terminadoEl) return e;
    return { ...e, intentos: { ...e.intentos, [id]: { ...i, respuestas: { ...i.respuestas, [pregunta]: r } } } };
  });
}

export function registrarIncidente(id: string, tipo: Incidente["tipo"]) {
  escribir((e) => {
    const i = e.intentos[id];
    if (!i || i.terminadoEl) return e;
    return { ...e, intentos: { ...e.intentos, [id]: { ...i, incidentes: [...i.incidentes, { tipo, el: new Date().toISOString() }].slice(-300) } } };
  });
}

const normalizar = (s: string) =>
  s
    .replace(/<[^>]*>/g, " ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** Puntaje de una respuesta (0 a 1). */
export function puntaje(p: Pregunta, r: Respuesta, parcial: boolean): number {
  if (r === undefined) return 0;
  switch (p.tipo) {
    case "opcion": {
      const correctas = (p.opciones ?? []).filter((o) => o.correcta).map((o) => o.id);
      return typeof r === "string" && correctas.includes(r) && correctas.length >= 1 ? 1 : 0;
    }
    case "vf":
      return r === p.verdadero ? 1 : 0;
    case "corta":
      return typeof r === "string" && (p.respuestas ?? []).some((x) => normalizar(x) === normalizar(r)) ? 1 : 0;
    case "relacionar": {
      const pares = p.pares ?? [];
      if (!pares.length || typeof r !== "object") return 0;
      const bien = pares.filter((x) => (r as Record<string, string>)[x.id] === x.id).length;
      return parcial ? bien / pares.length : bien === pares.length ? 1 : 0;
    }
  }
}

/** Termina el intento y calcula la calificación de cada área (0 a 10, un decimal). */
export function terminarIntento(id: string) {
  escribir((e) => {
    const i = e.intentos[id];
    if (!i || i.terminadoEl) return e;
    const calificaciones: Partial<Record<AreaEvalId, number>> = {};
    for (const area of i.areas) {
      const ps = i.preguntas.filter((x) => x.area === area);
      const suma = ps.reduce((s, x) => {
        const p = e.banco.find((b) => b.id === x.id);
        return s + (p ? puntaje(p, i.respuestas[x.id], e.config.relacionarParcial) : 0);
      }, 0);
      calificaciones[area] = ps.length ? Math.round((suma / ps.length) * 100) / 10 : 0;
    }
    return { ...e, intentos: { ...e.intentos, [id]: { ...i, terminadoEl: new Date().toISOString(), calificaciones } } };
  });
}
