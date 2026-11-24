import { dentroDeTolerancia, evaluarFormula, generarValores, leerNumero, prepararCloze, prepararHuecos, puntajeParteCloze, type Eleccion, type ParteCloze, type Variable } from './tipos';

/**
 * Lo que el servidor necesita del examen en línea: la pregunta tal como la guarda el front, cómo se arma el examen
 * de cada aspirante, cómo se califica y qué se le puede mostrar (sin respuestas correctas).
 * Mantener en sincronía con sigap-frontend/src/lib/examen.ts.
 */

export const NIVELES = ['recordar', 'comprender', 'aplicar', 'analizar'] as const;
export type NivelExamen = (typeof NIVELES)[number];
export type AreaFront = 'matematicas' | 'programacion';
export const AREAS_FRONT: AreaFront[] = ['matematicas', 'programacion'];
export const aEnum = (a: AreaFront) => (a === 'matematicas' ? 'MATEMATICAS' : 'PROGRAMACION') as 'MATEMATICAS' | 'PROGRAMACION';
export const deEnum = (a: string): AreaFront => (a === 'MATEMATICAS' ? 'matematicas' : 'programacion');

/** Tipos que se califican solos y pueden salir en el examen. */
export const TIPOS_EXAMEN = ['opcion', 'vf', 'relacionar', 'corta', 'numerica', 'arrastrar', 'calculada', 'calculadaOpcion', 'calculadaSimple', 'aleatoria', 'cloze', 'faltantes'];
export const TIPOS_VALIDOS = [...TIPOS_EXAMEN, 'ensayo', 'marcadores', 'arrastrarImagen'];
export const esCalculada = (t: string) => t === 'calculada' || t === 'calculadaSimple' || t === 'calculadaOpcion';

export type Opcion = { id: string; texto: string; correcta: boolean };
export type Par = { id: string; izquierda: string; derecha: string };
export type Pregunta = {
  id: string;
  area: AreaFront;
  unidad: string;
  tema: string;
  nivel: NivelExamen | 'sin-nivel';
  tipo: string;
  enunciado: string;
  opciones?: Opcion[];
  verdadero?: boolean;
  pares?: Par[];
  respuestas?: string[];
  numericas?: { valor: number; tolerancia: number }[];
  elecciones?: Eleccion[];
  formula?: string;
  variables?: Variable[];
  tolerancia?: number;
  toleranciaTipo?: 'absoluta' | 'relativa';
  decimales?: number;
  cantidadAleatoria?: number;
  retroalimentacion?: string;
  valor?: number;
  activa: boolean;
  clave?: string;
  origen?: string;
  actualizadoEl?: string;
  actualizadoPor?: string;
};

export type ConfigArea = { activa: boolean; inicio: string; fin: string; duracionMin: number; cantidades: Record<NivelExamen, number>; valor: number };
export type ConfigExamen = {
  titulo: string;
  pesos: Record<NivelExamen, number>;
  areas: Record<AreaFront, ConfigArea>;
  relacionarParcial: boolean;
  mostrarCalificacion: boolean;
  restricciones: Record<string, boolean>;
};

/** Lo que le tocó a un aspirante en cada pregunta: copia de la pregunta (con respuestas), su valor y lo generado al azar. */
export type ItemServidor = {
  id: string;
  valor: number;
  valores?: Record<string, number>;
  pares?: Par[];
  /** Relacionar: claves al azar de la columna derecha (para no delatar qué pareja va con cuál) */
  derechas?: { id: string; texto: string; par: string }[];
  pregunta: Pregunta;
};

export const APROBATORIO = 0.8;
export const PESOS_INICIALES: Record<NivelExamen, number> = { recordar: 1, comprender: 2, aplicar: 3, analizar: 4 };

export function barajar<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const token = () => Math.random().toString(36).slice(2, 10);

export const valorPregunta = (p: Pick<Pregunta, 'valor' | 'nivel'>, pesos: ConfigExamen['pesos']) => p.valor ?? (p.nivel === 'sin-nivel' ? 0 : pesos[p.nivel]);

export function cortasPara(p: Pregunta, banco: Pregunta[]): Pregunta[] {
  const cortas = banco.filter((x) => x.activa && x.tipo === 'corta' && x.area === p.area && (x.respuestas ?? []).length);
  const delTema = cortas.filter((x) => x.tema === p.tema);
  return delTema.length >= Math.max(2, p.cantidadAleatoria ?? 3) ? delTema : cortas;
}
export const puedeSalir = (p: Pregunta, banco: Pregunta[]) => p.activa && TIPOS_EXAMEN.includes(p.tipo) && (p.tipo !== 'aleatoria' || cortasPara(p, banco).length >= 2);
export const disponibles = (banco: Pregunta[], area: AreaFront, nivel: NivelExamen) => banco.filter((p) => p.area === area && p.nivel === nivel && puedeSalir(p, banco));

/** Preguntas que realmente tendrá el examen de un área (lo configurado, o lo que alcance con el banco). */
export function cantidadesReales(c: ConfigExamen, area: AreaFront, banco: Pregunta[]): Record<NivelExamen, number> {
  return Object.fromEntries(NIVELES.map((n) => [n, Math.min(c.areas[area]?.cantidades?.[n] ?? 0, disponibles(banco, area, n).length)])) as Record<NivelExamen, number>;
}

function elegirRepartidas(ps: Pregunta[], n: number): Pregunta[] {
  const porTema = new Map<string, Pregunta[]>();
  for (const p of barajar(ps)) porTema.set(p.tema, [...(porTema.get(p.tema) ?? []), p]);
  const colas = barajar([...porTema.values()]);
  const elegidas: Pregunta[] = [];
  while (elegidas.length < n && colas.some((c) => c.length)) for (const c of colas) if (c.length && elegidas.length < n) elegidas.push(c.shift()!);
  return elegidas;
}

/** Arma el examen de un aspirante: preguntas al azar por nivel (repartidas entre temas) con sus valores al azar. */
export function generarExamen(c: ConfigExamen, area: AreaFront, banco: Pregunta[]): ItemServidor[] {
  const ca = c.areas[area];
  const elegidas: Pregunta[] = [];
  for (const n of NIVELES) elegidas.push(...elegirRepartidas(disponibles(banco, area, n), ca.cantidades[n] ?? 0));
  return barajar(elegidas).map((p) => {
    const item: ItemServidor = { id: p.id, valor: valorPregunta(p, c.pesos), pregunta: p };
    if (esCalculada(p.tipo) && p.variables?.length) item.valores = generarValores(p.variables);
    const pares =
      p.tipo === 'aleatoria'
        ? barajar(cortasPara(p, banco))
            .slice(0, Math.max(2, p.cantidadAleatoria ?? 3))
            .map((x, i) => ({ id: `a${i + 1}`, izquierda: x.enunciado, derecha: x.respuestas![0] }))
        : p.tipo === 'relacionar'
          ? p.pares
          : undefined;
    if (p.tipo === 'aleatoria') item.pares = pares;
    if (pares) item.derechas = pares.map((x) => ({ id: token(), texto: x.derecha, par: x.id }));
    return item;
  });
}

const normalizar = (s: string) =>
  s
    .replace(/<[^>]*>/g, ' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export type Respuesta = string | boolean | Record<string, string> | undefined;

export function resultadoCalculada(p: Pregunta, valores?: Record<string, number>): number | null {
  try {
    return p.formula ? evaluarFormula(p.formula, valores ?? {}) : null;
  } catch {
    return null;
  }
}

/** Puntaje (0 a 1) de una respuesta, con lo que le tocó a ese aspirante. */
export function puntaje(it: ItemServidor, r: Respuesta, parcial: boolean): number {
  const p = it.pregunta;
  if (r === undefined || r === null) return 0;
  const mapa = (typeof r === 'object' ? r : {}) as Record<string, string>;
  switch (p.tipo) {
    case 'opcion':
    case 'calculadaOpcion': {
      const correctas = (p.opciones ?? []).filter((o) => o.correcta).map((o) => o.id);
      return typeof r === 'string' && correctas.includes(r) ? 1 : 0;
    }
    case 'vf':
      return r === p.verdadero ? 1 : 0;
    case 'corta':
      return typeof r === 'string' && (p.respuestas ?? []).some((x) => normalizar(x) === normalizar(r)) ? 1 : 0;
    case 'numerica': {
      const n = leerNumero(r);
      return n !== null && (p.numericas ?? []).some((x) => dentroDeTolerancia(n, x.valor, x.tolerancia)) ? 1 : 0;
    }
    case 'calculada':
    case 'calculadaSimple': {
      const n = leerNumero(r);
      const ok = resultadoCalculada(p, it.valores);
      return n !== null && ok !== null && dentroDeTolerancia(n, ok, p.tolerancia ?? 0, p.toleranciaTipo ?? 'relativa') ? 1 : 0;
    }
    case 'relacionar':
    case 'aleatoria': {
      const pares = (p.tipo === 'aleatoria' ? it.pares : p.pares) ?? [];
      if (!pares.length) return 0;
      // La respuesta usa las claves al azar de la columna derecha
      const parDe = (tok: string | undefined) => it.derechas?.find((d) => d.id === tok)?.par ?? tok;
      const bien = pares.filter((x) => parDe(mapa[x.id]) === x.id).length;
      return parcial ? bien / pares.length : bien === pares.length ? 1 : 0;
    }
    case 'arrastrar':
    case 'faltantes': {
      const { correctas } = prepararHuecos(p.enunciado);
      if (!correctas.length) return 0;
      const elecciones = p.elecciones ?? [];
      const bien = correctas.filter((n, i) => {
        const dada = elecciones[Number(mapa[String(i)]) - 1];
        const esperada = elecciones[n - 1];
        return !!dada && !!esperada && dada.texto === esperada.texto && dada.grupo === esperada.grupo;
      }).length;
      return parcial ? bien / correctas.length : bien === correctas.length ? 1 : 0;
    }
    case 'cloze': {
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

/** Califica un examen: puntos obtenidos / puntos posibles × valor del examen (y en escala 0 a 10). */
export function calificar(items: ItemServidor[], respuestas: Record<string, Respuesta>, parcial: boolean, valorExamen: number) {
  let puntos = 0;
  let puntosMax = 0;
  for (const it of items) {
    puntosMax += it.valor;
    puntos += it.valor * puntaje(it, respuestas[it.id], parcial);
  }
  const proporcion = puntosMax ? puntos / puntosMax : 0;
  return { puntos: redondear(puntos), puntosMax, valorExamen, calificacion: redondear(proporcion * valorExamen), calificacion10: redondear(proporcion * 10) };
}

// ---------- Lo que ve el aspirante (sin respuestas) ----------

const escaparCloze = (s: string) => s.replace(/([~#}{:=%\\])/g, '\\$1');

/** Cloze sin respuestas: las opciones quedan sin marcar y las de escribir, vacías. */
function clozeSinRespuestas(html: string): string {
  const { partes } = prepararCloze(html);
  let i = 0;
  return html.replace(/\{(\d*):([A-Z_]+):((?:\\.|[^}\\])*)\}/g, (m) => {
    const parte: ParteCloze | undefined = partes[i++];
    if (!parte) return m;
    if (parte.tipo === 'opcion') {
      const clave = parte.vista === 'vertical' ? 'MCV' : parte.vista === 'horizontal' ? 'MCH' : 'MC';
      return `{1:${clave}:${parte.respuestas.map((r) => `~${escaparCloze(r.texto)}`).join('')}}`;
    }
    return `{1:${parte.tipo === 'numerica' ? 'NM' : 'SA'}:~_}`;
  });
}

/** Huecos [[n]] sin delatar la correcta: cada hueco apunta a la primera elección de su grupo. */
function huecosSinRespuestas(p: Pregunta): string {
  const elecciones = p.elecciones ?? [];
  return p.enunciado.replace(/\[\[(\d+)\]\]/g, (m, n: string) => {
    const g = elecciones[Number(n) - 1]?.grupo;
    const primera = elecciones.findIndex((e) => e.grupo === g);
    return primera >= 0 ? `[[${primera + 1}]]` : m;
  });
}

/** Pregunta como la recibe el aspirante: sin respuestas correctas, fórmulas, retroalimentación ni nombre en Moodle. */
export function paraAspirante(it: ItemServidor): { pregunta: Record<string, unknown>; item: Record<string, unknown> } {
  const p = it.pregunta;
  const pregunta: Record<string, unknown> = {
    id: p.id,
    area: p.area,
    unidad: '',
    tema: '',
    nivel: p.nivel,
    tipo: p.tipo,
    enunciado: p.tipo === 'cloze' ? clozeSinRespuestas(p.enunciado) : p.tipo === 'arrastrar' || p.tipo === 'faltantes' ? huecosSinRespuestas(p) : p.enunciado,
    activa: true,
    origen: 'sigap',
    actualizadoEl: '',
    actualizadoPor: '',
  };
  if (p.opciones) pregunta.opciones = p.opciones.map((o) => ({ id: o.id, texto: o.texto, correcta: false }));
  if (p.elecciones) pregunta.elecciones = p.elecciones;
  if (p.tipo === 'relacionar' && p.pares) pregunta.pares = p.pares.map((x) => ({ id: x.id, izquierda: x.izquierda, derecha: '' }));
  if (esCalculada(p.tipo)) pregunta.decimales = p.decimales;
  if (p.tipo === 'aleatoria') pregunta.cantidadAleatoria = p.cantidadAleatoria;
  const item: Record<string, unknown> = { id: it.id, valor: it.valor };
  if (it.valores) item.valores = it.valores;
  if (it.pares) item.pares = it.pares.map((x) => ({ id: x.id, izquierda: x.izquierda, derecha: '' }));
  if (it.derechas) item.derechas = barajar(it.derechas.map((d) => ({ id: d.id, texto: d.texto })));
  return { pregunta, item };
}
