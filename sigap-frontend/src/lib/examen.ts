"use client";

import { useEffect, useSyncExternalStore } from "react";
import { MODO_API, SIMULACION, api } from "./api";
import { notificar } from "./avisos-ui";
import type { AreaEvalId } from "./posgrado/datos";
import { dentroDeTolerancia, evaluarFormula, generarValores, leerNumero, prepararCloze, prepararHuecos, puntajeParteCloze, type Eleccion, type Variable } from "./examen-tipos";
import { BANCO_EJEMPLO } from "./examen-banco-ejemplo";

/**
 * Examen de admisión en línea (primera versión, en la demostración: todo vive en el navegador).
 * - Banco de preguntas: lo editan Posgrado y la Subdirección Académica (se importa de Moodle, XML o GIFT).
 * - Un examen por área (Matemáticas y Programación), cada uno con su horario, duración y cantidad de preguntas por nivel.
 * - Cada nivel de Bloom tiene un peso (Recordar 1, Comprender 2, Aplicar 3, Analizar 4); una pregunta puede tener otro valor.
 * - Calificación: puntos obtenidos / puntos posibles × valor del examen. Aprobado con 8 de 10 (80 %).
 * - Posgrado habilita a los aspirantes y registra la calificación en Calificaciones (escala 0 a 10).
 */

/** Niveles con los que se arma el examen (taxonomía de Bloom). */
export const NIVELES = ["recordar", "comprender", "aplicar", "analizar"] as const;
export type NivelExamen = (typeof NIVELES)[number];
export type Nivel = NivelExamen | "sin-nivel";
export const NOMBRE_NIVEL: Record<Nivel, string> = {
  recordar: "Recordar",
  comprender: "Comprender",
  aplicar: "Aplicar",
  analizar: "Analizar",
  "sin-nivel": "Sin nivel",
};
export const PESOS_INICIALES: Record<NivelExamen, number> = { recordar: 1, comprender: 2, aplicar: 3, analizar: 4 };
/** Porcentaje mínimo para aprobar (8 de 10). */
export const APROBATORIO = 0.8;

export type TipoPregunta =
  | "opcion"
  | "vf"
  | "relacionar"
  | "corta"
  | "numerica"
  | "ensayo"
  | "arrastrar"
  | "marcadores"
  | "arrastrarImagen"
  | "calculada"
  | "calculadaOpcion"
  | "calculadaSimple"
  | "aleatoria"
  | "cloze"
  | "faltantes";

/** Tipos de pregunta en el orden y con los nombres de Moodle. */
export const TIPOS: { id: TipoPregunta; nombre: string; descripcion: string; disponible: boolean; enExamen: boolean }[] = [
  { id: "opcion", nombre: "Opción múltiple", descripcion: "Permite elegir una respuesta de una lista predefinida.", disponible: true, enExamen: true },
  { id: "vf", nombre: "Falso/Verdadero", descripcion: "Una forma sencilla de pregunta de opción múltiple con solo dos opciones: «Falso» y «Verdadero».", disponible: true, enExamen: true },
  { id: "relacionar", nombre: "Relacionar columnas", descripcion: "La respuesta a cada una de un número de sub-preguntas debe ser seleccionada de una lista de posibilidades.", disponible: true, enExamen: true },
  { id: "corta", nombre: "Respuesta corta", descripcion: "Permite una respuesta de una o unas pocas palabras que se califica comparándola con distintas respuestas modelo (puede usar comodines *).", disponible: true, enExamen: true },
  { id: "numerica", nombre: "Numérica", descripcion: "Permite una respuesta numérica, con un margen de error (tolerancia), que se compara con una o varias respuestas modelo.", disponible: true, enExamen: true },
  { id: "ensayo", nombre: "Ensayo", descripcion: "Permite una respuesta de unos pocos párrafos que debe calificarse a mano. Se puede guardar en el banco, pero no sale en el examen de admisión.", disponible: true, enExamen: false },
  { id: "arrastrar", nombre: "Arrastrar y soltar dentro del texto", descripcion: "Las palabras que faltan en el texto de la pregunta se completan arrastrando y soltando.", disponible: true, enExamen: true },
  { id: "marcadores", nombre: "Arrastrar y soltar marcadores", descripcion: "Las respuestas se eligen arrastrando y soltando marcadores sobre una imagen de fondo. Próximamente.", disponible: false, enExamen: false },
  { id: "arrastrarImagen", nombre: "Arrastrar y soltar sobre imagen", descripcion: "Imágenes o etiquetas de texto se arrastran y sueltan en zonas sobre una imagen de fondo. Próximamente.", disponible: false, enExamen: false },
  { id: "calculada", nombre: "Calculada", descripcion: "Como una pregunta numérica, pero los números se eligen al azar para cada aspirante y la respuesta se obtiene con una fórmula.", disponible: true, enExamen: true },
  { id: "calculadaOpcion", nombre: "Calculada de opción múltiple", descripcion: "Como una de opción múltiple, pero sus opciones pueden incluir resultados de fórmulas con números elegidos al azar.", disponible: true, enExamen: true },
  { id: "calculadaSimple", nombre: "Calculada simple", descripcion: "Una versión más sencilla de la calculada: pocos números al azar y una fórmula para la respuesta.", disponible: true, enExamen: true },
  { id: "aleatoria", nombre: "Relacionar aleatoriamente respuestas-cortas", descripcion: "Como relacionar columnas, pero se arma al azar con preguntas de respuesta corta del mismo tema.", disponible: true, enExamen: true },
  { id: "cloze", nombre: "Respuestas incrustadas (Cloze)", descripcion: "El texto de la pregunta tiene respuestas incrustadas: opción múltiple, respuesta corta y numérica.", disponible: true, enExamen: true },
  { id: "faltantes", nombre: "Seleccionar palabras faltantes", descripcion: "Las palabras que faltan en el texto se eligen de menús desplegables.", disponible: true, enExamen: true },
];
export const NOMBRE_TIPO = Object.fromEntries(TIPOS.map((t) => [t.id, t.nombre])) as Record<TipoPregunta, string>;
export const TIPO = Object.fromEntries(TIPOS.map((t) => [t.id, t])) as Record<TipoPregunta, (typeof TIPOS)[number]>;
export const esCalculada = (t: TipoPregunta) => t === "calculada" || t === "calculadaSimple" || t === "calculadaOpcion";

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
  /** Numérica: respuestas con su tolerancia (±) */
  numericas?: { valor: number; tolerancia: number }[];
  /** Arrastrar y soltar / palabras faltantes: elecciones; en el texto, [[n]] marca dónde va la elección n */
  elecciones?: Eleccion[];
  /** Calculadas: fórmula de la respuesta (p. ej. {a} * {b} + 2) */
  formula?: string;
  /** Calculadas: variables {x} y su rango */
  variables?: Variable[];
  /** Calculadas: tolerancia de la respuesta */
  tolerancia?: number;
  toleranciaTipo?: "absoluta" | "relativa";
  /** Calculadas: decimales con que se muestran los resultados */
  decimales?: number;
  /** Relacionar aleatoriamente: cuántas preguntas de respuesta corta se toman */
  cantidadAleatoria?: number;
  retroalimentacion?: string;
  /** Valor en puntos; si no tiene, vale lo que pesa su nivel */
  valor?: number;
  activa: boolean;
  /** Nombre en Moodle (si se importó) */
  clave?: string;
  origen: "moodle" | "sigap";
  actualizadoEl: string;
  actualizadoPor: string;
};

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
/** Examen de un área: su horario, duración, preguntas por nivel y cuánto vale. */
export type ConfigArea = {
  /** Se presenta en línea (si no, su calificación se captura aparte) */
  activa: boolean;
  /** Ventana de aplicación (fecha y hora local) */
  inicio: string;
  fin: string;
  duracionMin: number;
  /** Cuántas preguntas de cada nivel le tocan a cada aspirante */
  cantidades: Record<NivelExamen, number>;
  /** Cuánto vale el examen (calificación máxima) */
  valor: number;
};
export type ConfigExamen = {
  titulo: string;
  /** Peso (puntos) de una pregunta de cada nivel */
  pesos: Record<NivelExamen, number>;
  areas: Record<AreaEvalId, ConfigArea>;
  /** Relacionar columnas: puntos parciales por cada pareja correcta (si no, todo o nada) */
  relacionarParcial: boolean;
  /** El aspirante ve su calificación al terminar */
  mostrarCalificacion: boolean;
  restricciones: Restricciones;
};

export type Incidente = { tipo: "salio-ventana" | "salio-pantalla-completa" | "copiar" | "clic-derecho" | "captura" | "imprimir"; el: string };
export type Respuesta = string | boolean | Record<string, string> | undefined;
/** Una pregunta dentro de un examen: su valor y lo que se generó al azar para este aspirante. */
export type ItemIntento = {
  id: string;
  valor: number;
  /** Calculadas: valores de las variables */
  valores?: Record<string, number>;
  /** Relacionar aleatoriamente: parejas armadas con preguntas de respuesta corta */
  pares?: Par[];
  /** Servidor: columna derecha de relacionar con claves al azar (para no delatar las parejas) */
  derechas?: { id: string; texto: string }[];
};
/** Un examen presentado: uno por aspirante y área. */
export type Intento = {
  aspirante: string;
  area: AreaEvalId;
  /** Preguntas que le tocaron, con su valor al momento de generar el examen */
  preguntas: ItemIntento[];
  respuestas: Record<string, Respuesta>;
  inicioEl: string;
  /** Hora límite (inicio + duración, o el cierre de la ventana) */
  limiteEl: string;
  terminadoEl?: string;
  puntos?: number;
  puntosMax?: number;
  /** Calificación en la escala del examen (0 a valor) */
  calificacion?: number;
  /** La misma, en escala 0 a 10 (la que va a Calificaciones) */
  calificacion10?: number;
  valorExamen?: number;
  incidentes: Incidente[];
  /** Posgrado ya registró la calificación en Calificaciones */
  registradoEl?: string;
};
export type Habilitado = { areas: AreaEvalId[]; el: string; por: string };

type Estado = {
  banco: Pregunta[];
  config: ConfigExamen;
  habilitados: Record<string, Habilitado>;
  /** Clave: ID del aspirante | área */
  intentos: Record<string, Intento>;
};

const CLAVE = "sigap-examen-demo";
const EVENTO = "sigap-examen";

export const CONFIG_INICIAL: ConfigExamen = {
  titulo: "Examen de admisión A-27",
  pesos: PESOS_INICIALES,
  areas: {
    matematicas: { activa: true, inicio: "2026-12-07T09:00", fin: "2026-12-07T12:00", duracionMin: 90, cantidades: { recordar: 1, comprender: 4, aplicar: 4, analizar: 3 }, valor: 10 },
    programacion: { activa: true, inicio: "2026-12-08T09:00", fin: "2026-12-08T12:00", duracionMin: 90, cantidades: { recordar: 2, comprender: 3, aplicar: 2, analizar: 2 }, valor: 10 },
  },
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
      const c = (g.config ?? {}) as Partial<ConfigExamen>;
      estado = {
        // Las preguntas guardadas antes con niveles que ya no se usan (evaluar, crear) quedan "sin nivel"
        banco: (g.banco ?? INICIAL.banco).map((p) => ((NIVELES as readonly string[]).includes(p.nivel) ? p : { ...p, nivel: "sin-nivel" as const })),
        config: {
          ...CONFIG_INICIAL,
          ...c,
          pesos: { ...CONFIG_INICIAL.pesos, ...c.pesos },
          // Configuración de la versión anterior (un solo examen): se toma la nueva por área
          areas: c.areas
            ? { matematicas: { ...CONFIG_INICIAL.areas.matematicas, ...c.areas.matematicas }, programacion: { ...CONFIG_INICIAL.areas.programacion, ...c.areas.programacion } }
            : CONFIG_INICIAL.areas,
          restricciones: { ...CONFIG_INICIAL.restricciones, ...c.restricciones },
        },
        habilitados: g.habilitados ?? {},
        // Los intentos de la versión anterior (sin área) se descartan
        intentos: Object.fromEntries(Object.entries(g.intentos ?? {}).filter(([, i]) => i && (i as Intento).area)),
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
  const estado = useSyncExternalStore(suscribir, REMOTO ? leerRemoto : leer, () => INICIAL);
  const cargado = useSyncExternalStore(suscribir, () => (REMOTO ? remoto.cargado : true), () => false);
  useEffect(() => {
    if (REMOTO && !remoto.cargado) void cargarRemoto();
  }, []);
  return { ...estado, cargado, yo: REMOTO ? remoto.yo : undefined, desfase: REMOTO ? remoto.desfase : 0 };
}
/** Nombre y convocatoria del aspirante en sesión según el servidor (para la marca de agua y la fecha de resultados). */
export function useAspiranteServidor() {
  useSyncExternalStore(suscribir, leerRemoto, () => INICIAL);
  return { nombre: remoto.nombre, convocatoria: remoto.convocatoria };
}

// ---------- Servidor real ----------
// Con la API (sin simulación) el banco, la configuración y los exámenes viven en el servidor: el aspirante solo recibe
// sus preguntas sin respuestas y el servidor fija el tiempo y califica. Aquí se guarda una copia para pintar la página.

export const REMOTO = MODO_API && !SIMULACION;
type EstadoRemoto = { estado: Estado; cargado: boolean; yo?: string; nombre?: string; convocatoria?: "A" | "B"; desfase: number };
let remoto: EstadoRemoto = { estado: { banco: [], config: CONFIG_INICIAL, habilitados: {}, intentos: {} }, cargado: false, desfase: 0 };
const leerRemoto = () => remoto.estado;
function fijarRemoto(cambio: Partial<EstadoRemoto> & { estado?: Estado }) {
  remoto = { ...remoto, ...cambio };
  window.dispatchEvent(new Event(EVENTO));
}
const cambiarRemoto = (f: (e: Estado) => Estado) => fijarRemoto({ estado: f(remoto.estado) });
const esAspirante = () => typeof window !== "undefined" && window.location.pathname.startsWith("/aspirante");
const conConfig = (c?: Partial<ConfigExamen> | null): ConfigExamen => ({
  ...CONFIG_INICIAL,
  ...(c ?? {}),
  pesos: { ...CONFIG_INICIAL.pesos, ...c?.pesos },
  areas: { matematicas: { ...CONFIG_INICIAL.areas.matematicas, ...c?.areas?.matematicas }, programacion: { ...CONFIG_INICIAL.areas.programacion, ...c?.areas?.programacion } },
  restricciones: { ...CONFIG_INICIAL.restricciones, ...c?.restricciones },
});
type PortalExamen = { yo: string; nombre: string; convocatoria: "A" | "B"; ahora: string; config: ConfigExamen; habilitados: Record<string, Habilitado>; intentos: Record<string, Intento>; banco: Pregunta[] };
type FilaAplicacion = Omit<Intento, "respuestas" | "inicioEl" | "limiteEl"> & { habilitadoEl: string; habilitadoPor: string; inicioEl?: string; limiteEl?: string };

function desdePortal(r: PortalExamen) {
  fijarRemoto({ estado: { banco: r.banco, config: conConfig(r.config), habilitados: r.habilitados, intentos: r.intentos }, yo: r.yo, nombre: r.nombre, convocatoria: r.convocatoria, desfase: new Date(r.ahora).getTime() - Date.now(), cargado: true });
}
function desdeAplicacion(filas: FilaAplicacion[]) {
  const habilitados: Record<string, Habilitado> = {};
  const intentos: Record<string, Intento> = {};
  for (const f of filas) {
    const h = (habilitados[f.aspirante] ??= { areas: [], el: f.habilitadoEl, por: f.habilitadoPor });
    h.areas.push(f.area);
    if (f.inicioEl) intentos[claveIntento(f.aspirante, f.area)] = { ...f, inicioEl: f.inicioEl, limiteEl: f.limiteEl ?? f.inicioEl, respuestas: {} };
  }
  cambiarRemoto((e) => ({ ...e, habilitados, intentos }));
}

let cargando: Promise<void> | null = null;
/** Trae del servidor lo que corresponde a quien está en sesión (aspirante o personal). */
export function cargarRemoto(): Promise<void> {
  cargando ??= (async () => {
    try {
      if (esAspirante()) desdePortal(await api<PortalExamen>("/portal/examen"));
      else {
        const [banco, config, filas] = await Promise.all([
          api<Pregunta[]>("/examen/banco"),
          api<{ valor: Partial<ConfigExamen> | null }>("/almacen/examen"),
          api<FilaAplicacion[]>("/examen/aplicacion"),
        ]);
        fijarRemoto({ estado: { ...remoto.estado, banco, config: conConfig(config.valor) }, cargado: true });
        desdeAplicacion(filas);
      }
    } catch (e) {
      notificar(e instanceof Error ? e.message : "No se pudo cargar el examen en línea.");
      fijarRemoto({ cargado: true });
    } finally {
      cargando = null;
    }
  })();
  return cargando;
}
const avisarError = (e: unknown) => {
  notificar(e instanceof Error ? e.message : "No se pudo guardar el cambio.");
  void cargarRemoto();
};

// Respuestas del aspirante: se guardan en la página al instante y se mandan al servidor en lotes
const pendientes: Record<string, Record<string, Respuesta | null>> = {};
const temporizadores: Record<string, ReturnType<typeof setTimeout>> = {};
async function enviarRespuestas(area: AreaEvalId) {
  clearTimeout(temporizadores[area]);
  const lote = pendientes[area];
  if (!lote || !Object.keys(lote).length) return;
  delete pendientes[area];
  try {
    await api(`/portal/examen/${area}/respuestas`, { metodo: "PUT", cuerpo: { respuestas: lote } });
  } catch (e) {
    // Se reintenta con el siguiente cambio (o al entregar)
    pendientes[area] = { ...lote, ...pendientes[area] };
    notificar(e instanceof Error ? `No se guardó tu última respuesta: ${e.message}` : "No se guardó tu última respuesta; revisa tu conexión.");
  }
}
if (typeof window !== "undefined")
  window.addEventListener("pagehide", () => {
    for (const a of Object.keys(pendientes) as AreaEvalId[]) void enviarRespuestas(a);
  });

export const nuevoId = (p = "q") => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// ---------- Banco ----------

export function guardarPregunta(p: Pregunta) {
  if (REMOTO) {
    cambiarRemoto((e) => ({ ...e, banco: e.banco.some((x) => x.id === p.id) ? e.banco.map((x) => (x.id === p.id ? p : x)) : [...e.banco, p] }));
    api(`/examen/banco/${encodeURIComponent(p.id)}`, { metodo: "PUT", cuerpo: { pregunta: p } }).catch(avisarError);
    return;
  }
  escribir((e) => ({ ...e, banco: e.banco.some((x) => x.id === p.id) ? e.banco.map((x) => (x.id === p.id ? p : x)) : [...e.banco, p] }));
}
export function eliminarPregunta(id: string) {
  if (REMOTO) {
    cambiarRemoto((e) => ({ ...e, banco: e.banco.filter((x) => x.id !== id) }));
    api(`/examen/banco/${encodeURIComponent(id)}`, { metodo: "DELETE" }).catch(avisarError);
    return;
  }
  escribir((e) => ({ ...e, banco: e.banco.filter((x) => x.id !== id) }));
}
/** Agrega preguntas importadas; con "reemplazar" quita antes las de esa área. */
export async function importarPreguntas(area: AreaEvalId, preguntas: Pregunta[], reemplazar: boolean) {
  if (REMOTO) {
    // En lotes, para no rebasar el tamaño máximo de una petición (las imágenes van dentro de las preguntas)
    const lotes: Pregunta[][] = [];
    let actual: Pregunta[] = [];
    let tam = 0;
    for (const p of preguntas) {
      const t = JSON.stringify(p).length;
      if (actual.length && (actual.length >= 40 || tam + t > 4_000_000)) {
        lotes.push(actual);
        actual = [];
        tam = 0;
      }
      actual.push(p);
      tam += t;
    }
    if (actual.length) lotes.push(actual);
    try {
      for (const [i, lote] of lotes.entries()) await api("/examen/banco/importar", { cuerpo: { area, preguntas: lote, reemplazar: reemplazar && i === 0 } });
    } finally {
      const banco = await api<Pregunta[]>("/examen/banco").catch(() => null);
      if (banco) cambiarRemoto((e) => ({ ...e, banco }));
    }
    return;
  }
  escribir((e) => ({ ...e, banco: [...(reemplazar ? e.banco.filter((x) => x.area !== area) : e.banco), ...preguntas] }));
}
export function restaurarBancoEjemplo() {
  if (REMOTO) return;
  escribir((e) => ({ ...e, banco: BANCO_EJEMPLO }));
}

// ---------- Configuración y aplicación ----------

export const AREAS_EXAMEN: AreaEvalId[] = ["matematicas", "programacion"];
export const claveIntento = (aspirante: string, area: AreaEvalId) => `${aspirante}|${area}`;

export function guardarConfig(config: ConfigExamen) {
  if (REMOTO) {
    cambiarRemoto((e) => ({ ...e, config }));
    api("/almacen/examen", { metodo: "PUT", cuerpo: { valor: config } }).catch(avisarError);
    return;
  }
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
/** Habilita (o quita) a un aspirante el examen de un área. */
export function habilitarArea(id: string, area: AreaEvalId, si: boolean, por: string) {
  if (REMOTO) {
    api<FilaAplicacion[]>("/examen/habilitar", { cuerpo: { folio: id, area, habilitar: si } })
      .then(desdeAplicacion)
      .catch(avisarError);
    return;
  }
  const actuales = leer().habilitados[id]?.areas ?? [];
  const areas = si ? [...new Set([...actuales, area])] : actuales.filter((x) => x !== area);
  habilitar(id, areas.length ? { areas, el: new Date().toISOString(), por } : null);
}
/** Áreas que el aspirante puede presentar en línea (habilitadas y con examen en línea activo). */
export const areasHabilitadas = (e: Pick<Estado, "habilitados" | "config">, id: string) => (e.habilitados[id]?.areas ?? []).filter((a) => e.config.areas[a]?.activa);

function cambiarIntento(e: Estado, k: string, cambio: (i: Intento) => Intento | null): Estado {
  const i = e.intentos[k];
  if (!i) return e;
  const intentos = { ...e.intentos };
  const nuevo = cambio(i);
  if (nuevo) intentos[k] = nuevo;
  else delete intentos[k];
  return { ...e, intentos };
}
export function reiniciarIntento(id: string, area: AreaEvalId) {
  if (REMOTO) {
    api<FilaAplicacion[]>("/examen/reiniciar", { cuerpo: { folio: id, area } })
      .then(desdeAplicacion)
      .catch(avisarError);
    return;
  }
  escribir((e) => cambiarIntento(e, claveIntento(id, area), () => null));
}
export function marcarRegistrado(id: string, area: AreaEvalId) {
  if (REMOTO) {
    api<FilaAplicacion[]>("/examen/registrado", { cuerpo: { folio: id, area } })
      .then(desdeAplicacion)
      .catch(avisarError);
    return;
  }
  escribir((e) => cambiarIntento(e, claveIntento(id, area), (i) => ({ ...i, registradoEl: new Date().toISOString() })));
}

/** Valor en puntos de una pregunta: el suyo o el peso de su nivel. */
export const valorPregunta = (p: Pick<Pregunta, "valor" | "nivel">, pesos: ConfigExamen["pesos"]) => p.valor ?? (p.nivel === "sin-nivel" ? 0 : pesos[p.nivel]);

/** Preguntas de respuesta corta que puede usar una de "relacionar aleatoriamente" (mismo tema; si no alcanzan, la misma área). */
export function cortasPara(p: Pregunta, banco: Pregunta[]): Pregunta[] {
  const cortas = banco.filter((x) => x.activa && x.tipo === "corta" && x.area === p.area && (x.respuestas ?? []).length);
  const delTema = cortas.filter((x) => x.tema === p.tema);
  return delTema.length >= Math.max(2, p.cantidadAleatoria ?? 3) ? delTema : cortas;
}
/** ¿Puede salir en el examen? (activa, de un tipo que se califica solo y con lo necesario para generarse) */
export const puedeSalir = (p: Pregunta, banco: Pregunta[]) => p.activa && TIPO[p.tipo]?.enExamen && (p.tipo !== "aleatoria" || cortasPara(p, banco).length >= 2);

/** Preguntas de un área y nivel que pueden salir en el examen. */
export const disponibles = (banco: Pregunta[], area: AreaEvalId, nivel: NivelExamen) => banco.filter((p) => p.area === area && p.nivel === nivel && puedeSalir(p, banco));

/** Lo que se genera al azar para un aspirante: valores de las calculadas y parejas de "relacionar aleatoriamente". */
function generarItem(p: Pregunta, banco: Pregunta[], valor: number): ItemIntento {
  const item: ItemIntento = { id: p.id, valor };
  if (esCalculada(p.tipo) && p.variables?.length) item.valores = generarValores(p.variables);
  if (p.tipo === "aleatoria") {
    const elegidas = barajar(cortasPara(p, banco)).slice(0, Math.max(2, p.cantidadAleatoria ?? 3));
    item.pares = elegidas.map((x, i) => ({ id: `a${i + 1}`, izquierda: x.enunciado, derecha: x.respuestas![0] }));
  }
  return item;
}

/** Preguntas y puntos del examen de un área (lo configurado, o lo que alcanza con el banco). */
export function resumenArea(c: ConfigExamen, area: AreaEvalId, banco?: Pregunta[]) {
  let preguntas = 0;
  let puntos = 0;
  for (const n of NIVELES) {
    const cant = banco ? Math.min(c.areas[area].cantidades[n], disponibles(banco, area, n).length) : c.areas[area].cantidades[n];
    preguntas += cant;
    puntos += cant * c.pesos[n];
  }
  return { preguntas, puntos };
}

function barajar<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export { barajar };

/** Elige n preguntas al azar repartidas entre los temas (para que no salgan todas del mismo). */
function elegirRepartidas(ps: Pregunta[], n: number): Pregunta[] {
  const porTema = new Map<string, Pregunta[]>();
  for (const p of barajar(ps)) porTema.set(p.tema, [...(porTema.get(p.tema) ?? []), p]);
  const colas = barajar([...porTema.values()]);
  const elegidas: Pregunta[] = [];
  while (elegidas.length < n && colas.some((c) => c.length)) for (const c of colas) if (c.length && elegidas.length < n) elegidas.push(c.shift()!);
  return elegidas;
}

/** Ventana de aplicación del examen de un área: antes, abierta o cerrada. */
export function estadoVentana(c: Pick<ConfigArea, "inicio" | "fin">, ahora = new Date()) {
  const ini = new Date(c.inicio);
  const fin = new Date(c.fin);
  return ahora < ini ? "antes" : ahora > fin ? "cerrada" : "abierta";
}

/** El aspirante inicia el examen de un área: se eligen sus preguntas al azar según los niveles configurados. */
export async function iniciarIntento(id: string, area: AreaEvalId): Promise<void> {
  if (REMOTO) {
    desdePortal(await api<PortalExamen>(`/portal/examen/${area}/iniciar`, { cuerpo: {} }));
    return;
  }
  const e = leer();
  if (!areasHabilitadas(e, id).includes(area)) throw new Error("No estás habilitado para presentar este examen.");
  const k = claveIntento(id, area);
  if (e.intentos[k]) return;
  const otro = Object.values(e.intentos).find((i) => i.aspirante === id && !i.terminadoEl && new Date(i.limiteEl) > new Date());
  if (otro) throw new Error(`Primero termina tu examen de ${otro.area === "matematicas" ? "Matemáticas" : "Programación"}.`);
  const ca = e.config.areas[area];
  if (estadoVentana(ca) !== "abierta") throw new Error("El examen no está abierto en este momento.");
  const elegidas: Pregunta[] = [];
  for (const n of NIVELES) elegidas.push(...elegirRepartidas(disponibles(e.banco, area, n), ca.cantidades[n]));
  if (!elegidas.length) throw new Error(`El examen todavía no tiene preguntas de ${area === "matematicas" ? "Matemáticas" : "Programación"}. Avisa al Departamento de Posgrado.`);
  const inicio = new Date();
  const limite = new Date(Math.min(inicio.getTime() + ca.duracionMin * 60_000, new Date(ca.fin).getTime()));
  const intento: Intento = {
    aspirante: id,
    area,
    preguntas: barajar(elegidas).map((p) => generarItem(p, e.banco, valorPregunta(p, e.config.pesos))),
    respuestas: {},
    inicioEl: inicio.toISOString(),
    limiteEl: limite.toISOString(),
    incidentes: [],
  };
  escribir((x) => ({ ...x, intentos: { ...x.intentos, [k]: intento } }));
}

export function responder(id: string, area: AreaEvalId, pregunta: string, r: Respuesta) {
  if (REMOTO) {
    cambiarRemoto((e) => cambiarIntento(e, claveIntento(id, area), (i) => (i.terminadoEl ? i : { ...i, respuestas: { ...i.respuestas, [pregunta]: r } })));
    pendientes[area] = { ...pendientes[area], [pregunta]: r ?? null };
    clearTimeout(temporizadores[area]);
    temporizadores[area] = setTimeout(() => void enviarRespuestas(area), 800);
    return;
  }
  escribir((e) => cambiarIntento(e, claveIntento(id, area), (i) => (i.terminadoEl ? i : { ...i, respuestas: { ...i.respuestas, [pregunta]: r } })));
}

export function registrarIncidente(id: string, area: AreaEvalId, tipo: Incidente["tipo"]) {
  if (REMOTO) {
    api(`/portal/examen/${area}/incidente`, { cuerpo: { tipo } }).catch(() => undefined);
    return;
  }
  escribir((e) => cambiarIntento(e, claveIntento(id, area), (i) => (i.terminadoEl ? i : { ...i, incidentes: [...i.incidentes, { tipo, el: new Date().toISOString() }].slice(-300) })));
}

const normalizar = (s: string) =>
  s
    .replace(/<[^>]*>/g, " ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** Respuesta correcta de una calculada con los valores de este aspirante. */
export function resultadoCalculada(p: Pregunta, valores?: Record<string, number>): number | null {
  try {
    return p.formula ? evaluarFormula(p.formula, valores ?? {}) : null;
  } catch {
    return null;
  }
}

/** Puntaje de una respuesta (0 a 1). */
export function puntaje(p: Pregunta, r: Respuesta, parcial: boolean, item?: Pick<ItemIntento, "valores" | "pares">): number {
  if (r === undefined) return 0;
  const mapa = (typeof r === "object" ? r : {}) as Record<string, string>;
  switch (p.tipo) {
    case "opcion":
    case "calculadaOpcion": {
      const correctas = (p.opciones ?? []).filter((o) => o.correcta).map((o) => o.id);
      return typeof r === "string" && correctas.includes(r) ? 1 : 0;
    }
    case "vf":
      return r === p.verdadero ? 1 : 0;
    case "corta":
      return typeof r === "string" && (p.respuestas ?? []).some((x) => normalizar(x) === normalizar(r)) ? 1 : 0;
    case "numerica": {
      const n = leerNumero(r);
      return n !== null && (p.numericas ?? []).some((x) => dentroDeTolerancia(n, x.valor, x.tolerancia)) ? 1 : 0;
    }
    case "calculada":
    case "calculadaSimple": {
      const n = leerNumero(r);
      const ok = resultadoCalculada(p, item?.valores);
      return n !== null && ok !== null && dentroDeTolerancia(n, ok, p.tolerancia ?? 0, p.toleranciaTipo ?? "relativa") ? 1 : 0;
    }
    case "relacionar":
    case "aleatoria": {
      const pares = (p.tipo === "aleatoria" ? item?.pares : p.pares) ?? [];
      if (!pares.length) return 0;
      const bien = pares.filter((x) => mapa[x.id] === x.id).length;
      return parcial ? bien / pares.length : bien === pares.length ? 1 : 0;
    }
    case "arrastrar":
    case "faltantes": {
      const { correctas } = prepararHuecos(p.enunciado);
      if (!correctas.length) return 0;
      const elecciones = p.elecciones ?? [];
      // Cuenta como correcta la elección indicada o cualquiera con el mismo texto y grupo
      const bien = correctas.filter((n, i) => {
        const dada = elecciones[Number(mapa[String(i)]) - 1];
        const esperada = elecciones[n - 1];
        return !!dada && !!esperada && dada.texto === esperada.texto && dada.grupo === esperada.grupo;
      }).length;
      return parcial ? bien / correctas.length : bien === correctas.length ? 1 : 0;
    }
    case "cloze": {
      const { partes } = prepararCloze(p.enunciado);
      const total = partes.reduce((s, x) => s + x.peso, 0);
      if (!total) return 0;
      return partes.reduce((s, x, i) => s + x.peso * puntajeParteCloze(x, mapa[String(i)]), 0) / total;
    }
    default:
      return 0;
  }
}

const redondear = (x: number) => Math.round(x * 10) / 10;
/** ¿Aprobó? (8 de 10, o 80 % del valor del examen) */
export const aprobado = (i: Pick<Intento, "calificacion10">) => (i.calificacion10 ?? 0) >= APROBATORIO * 10;

/** Termina el examen y lo califica: puntos obtenidos / puntos posibles × valor del examen. */
export async function terminarIntento(id: string, area: AreaEvalId): Promise<void> {
  if (REMOTO) {
    clearTimeout(temporizadores[area]);
    const lote = pendientes[area] ?? {};
    delete pendientes[area];
    try {
      desdePortal(await api<PortalExamen>(`/portal/examen/${area}/entregar`, { cuerpo: { respuestas: lote } }));
    } catch (e) {
      pendientes[area] = { ...lote, ...pendientes[area] };
      throw e;
    }
    return;
  }
  escribir((e) =>
    cambiarIntento(e, claveIntento(id, area), (i) => {
      if (i.terminadoEl) return i;
      let puntos = 0;
      let puntosMax = 0;
      for (const x of i.preguntas) {
        const p = e.banco.find((b) => b.id === x.id);
        puntosMax += x.valor;
        if (p) puntos += x.valor * puntaje(p, i.respuestas[x.id], e.config.relacionarParcial, x);
      }
      const proporcion = puntosMax ? puntos / puntosMax : 0;
      const valorExamen = e.config.areas[area].valor;
      return {
        ...i,
        terminadoEl: new Date().toISOString(),
        puntos: redondear(puntos),
        puntosMax,
        valorExamen,
        calificacion: redondear(proporcion * valorExamen),
        calificacion10: redondear(proporcion * 10),
      };
    }),
  );
}
