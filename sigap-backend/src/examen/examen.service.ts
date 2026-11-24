import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AdmisionService } from '../admision/admision.service';
import { aFechaHora } from '../comun/fechas';
import type { UsuarioSesion } from '../auth/auth.guard';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AREAS_FRONT,
  NIVELES,
  PESOS_INICIALES,
  TIPOS_VALIDOS,
  aEnum,
  calificar,
  cantidadesReales,
  deEnum,
  generarExamen,
  paraAspirante,
  type AreaFront,
  type ConfigExamen,
  type ItemServidor,
  type Pregunta,
  type Respuesta,
} from './calificar';

const INCIDENTES = ['salio-ventana', 'salio-pantalla-completa', 'copiar', 'clic-derecho', 'captura', 'imprimir'];
/** Margen para respuestas que llegan justo al terminar el tiempo (red lenta). */
const GRACIA_MS = 60_000;
const MAX_PREGUNTA = 3 * 1024 * 1024;

const CONFIG_INICIAL: ConfigExamen = {
  titulo: 'Examen de admisión',
  pesos: PESOS_INICIALES,
  areas: {
    matematicas: { activa: true, inicio: '2026-12-15T09:00', fin: '2026-12-15T12:00', duracionMin: 90, cantidades: { recordar: 2, comprender: 6, aplicar: 6, analizar: 6 }, valor: 10 },
    programacion: { activa: true, inicio: '2026-12-15T13:00', fin: '2026-12-15T16:00', duracionMin: 90, cantidades: { recordar: 5, comprender: 3, aplicar: 2, analizar: 1 }, valor: 10 },
  },
  relacionarParcial: true,
  mostrarCalificacion: false,
  restricciones: { anticopia: true, pantallaCompleta: true, marcaAgua: true, ocultarAlSalir: true, unaPorPantalla: true },
};

/** "2026-12-15T09:00" (hora de la Ciudad de México, como la escribe Posgrado) → instante. */
function deLocal(s: string): Date {
  const [fecha, hora] = String(s).split('T');
  const d = aFechaHora(fecha, (hora ?? '00:00').slice(0, 5));
  if (Number.isNaN(d.getTime())) throw new ConflictException('El horario del examen no es válido; revisa la configuración');
  return d;
}

type Examen = Prisma.ExamenAspiranteGetPayload<{ include: { postulacion: { select: { folio: true } } } }>;

/**
 * Examen de admisión en línea con el servidor real.
 * - Posgrado y la Subdirección editan el banco; Posgrado configura (almacén "examen"), habilita y registra calificaciones.
 * - El aspirante solo recibe sus preguntas sin respuestas; el servidor fija el tiempo límite y califica.
 */
@Injectable()
export class ExamenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adm: AdmisionService,
  ) {}

  // ---------- Configuración ----------

  async config(): Promise<ConfigExamen> {
    const v = ((await this.prisma.almacen.findUnique({ where: { clave: 'examen' } }))?.valor ?? {}) as Partial<ConfigExamen>;
    return {
      ...CONFIG_INICIAL,
      ...v,
      pesos: { ...CONFIG_INICIAL.pesos, ...v.pesos },
      areas: {
        matematicas: { ...CONFIG_INICIAL.areas.matematicas, ...v.areas?.matematicas },
        programacion: { ...CONFIG_INICIAL.areas.programacion, ...v.areas?.programacion },
      },
      restricciones: { ...CONFIG_INICIAL.restricciones, ...v.restricciones },
    };
  }

  // ---------- Banco (Posgrado y Subdirección) ----------

  private async banco(): Promise<Pregunta[]> {
    return (await this.prisma.preguntaExamen.findMany({ orderBy: [{ area: 'asc' }, { tema: 'asc' }, { creadoEn: 'asc' }] })).map((x) => x.datos as unknown as Pregunta);
  }

  listarBanco() {
    return this.banco();
  }

  private validar(p: Pregunta): Pregunta {
    if (!p || typeof p !== 'object') throw new BadRequestException('Pregunta inválida');
    if (typeof p.id !== 'string' || !/^[A-Za-z0-9_-]{4,64}$/.test(p.id)) throw new BadRequestException('Identificador de pregunta inválido');
    if (!AREAS_FRONT.includes(p.area)) throw new BadRequestException('Área inválida');
    if (![...NIVELES, 'sin-nivel'].includes(p.nivel)) throw new BadRequestException('Nivel inválido');
    if (!TIPOS_VALIDOS.includes(p.tipo)) throw new BadRequestException('Tipo de pregunta inválido');
    if (typeof p.enunciado !== 'string' || !p.enunciado.trim()) throw new BadRequestException('La pregunta no tiene enunciado');
    if (typeof p.tema !== 'string') throw new BadRequestException('Tema inválido');
    if (JSON.stringify(p).length > MAX_PREGUNTA) throw new BadRequestException('La pregunta es demasiado grande (revisa sus imágenes)');
    return p;
  }

  private datosDe(p: Pregunta, u: UsuarioSesion) {
    const datos = { ...p, actualizadoEl: new Date().toISOString(), actualizadoPor: u.nombre };
    return { area: aEnum(p.area), nivel: p.nivel, tipo: p.tipo, tema: p.tema.slice(0, 300), activa: p.activa !== false, datos: datos as unknown as Prisma.InputJsonValue, actualizadoPor: u.nombre };
  }

  async guardarPregunta(id: string, p: Pregunta, u: UsuarioSesion) {
    if (p?.id !== id) throw new BadRequestException('El identificador no coincide');
    const v = this.validar(p);
    const d = this.datosDe(v, u);
    const r = await this.prisma.preguntaExamen.upsert({ where: { id }, create: { id, ...d }, update: d });
    return r.datos;
  }

  async eliminarPregunta(id: string) {
    await this.prisma.preguntaExamen.deleteMany({ where: { id } });
    return { ok: true };
  }

  async importar(area: AreaFront, preguntas: Pregunta[], reemplazar: boolean, u: UsuarioSesion) {
    if (!AREAS_FRONT.includes(area)) throw new BadRequestException('Área inválida');
    if (!Array.isArray(preguntas) || preguntas.length > 500) throw new BadRequestException('Envía de 1 a 500 preguntas');
    const validas = preguntas.map((p) => this.validar(p));
    if (validas.some((p) => p.area !== area)) throw new BadRequestException('Todas las preguntas deben ser del área elegida');
    await this.prisma.$transaction([
      ...(reemplazar ? [this.prisma.preguntaExamen.deleteMany({ where: { area: aEnum(area) } })] : []),
      ...validas.map((p) => {
        const d = this.datosDe(p, u);
        return this.prisma.preguntaExamen.upsert({ where: { id: p.id }, create: { id: p.id, ...d }, update: d });
      }),
    ]);
    return { importadas: validas.length };
  }

  // ---------- Aplicación (Posgrado) ----------

  private resumen(e: Examen) {
    return {
      aspirante: e.postulacion.folio,
      area: deEnum(e.area),
      habilitadoEl: e.habilitadoEn.toISOString(),
      habilitadoPor: e.habilitadoPor,
      inicioEl: e.inicioEn?.toISOString(),
      limiteEl: e.limiteEn?.toISOString(),
      terminadoEl: e.terminadoEn?.toISOString(),
      incidentes: e.incidentes,
      puntos: e.puntos ?? undefined,
      puntosMax: e.puntosMax ?? undefined,
      valorExamen: e.valorExamen ?? undefined,
      calificacion: e.calificacion ?? undefined,
      calificacion10: e.calificacion10 ?? undefined,
      registradoEl: e.registradoEn?.toISOString(),
      preguntas: ((e.preguntas ?? []) as unknown as ItemServidor[]).map((x) => ({ id: x.id, valor: x.valor })),
    };
  }

  async aplicacion() {
    await this.cerrarVencidos();
    const lista = await this.prisma.examenAspirante.findMany({ include: { postulacion: { select: { folio: true } } }, orderBy: { habilitadoEn: 'asc' } });
    return lista.map((e) => this.resumen(e));
  }

  private async examenDe(folio: string, area: AreaFront) {
    if (!AREAS_FRONT.includes(area)) throw new BadRequestException('Área inválida');
    const p = await this.adm.postulacion(folio);
    const e = await this.prisma.examenAspirante.findUnique({ where: { postulacionId_area: { postulacionId: p.id, area: aEnum(area) } }, include: { postulacion: { select: { folio: true } } } });
    return { p, e };
  }

  async habilitar(folio: string, area: AreaFront, si: boolean, u: UsuarioSesion) {
    const { p, e } = await this.examenDe(folio, area);
    const nombreArea = area === 'matematicas' ? 'Matemáticas' : 'Programación';
    if (si) {
      if (!e) await this.prisma.examenAspirante.create({ data: { postulacionId: p.id, area: aEnum(area), habilitadoPor: u.nombre } });
      await this.adm.bitacora(folio, u.nombre, `Habilitó el examen en línea de ${nombreArea}`);
    } else if (e) {
      if (e.inicioEn) throw new ConflictException('El aspirante ya inició este examen; usa Reiniciar si hubo una falla');
      await this.prisma.examenAspirante.delete({ where: { id: e.id } });
      await this.adm.bitacora(folio, u.nombre, `Quitó el examen en línea de ${nombreArea}`);
    }
    return this.aplicacion();
  }

  async reiniciar(folio: string, area: AreaFront, u: UsuarioSesion) {
    const { e } = await this.examenDe(folio, area);
    if (!e) throw new NotFoundException('Ese examen no está habilitado');
    if (e.registradoEn) throw new ConflictException('La calificación ya se registró');
    await this.prisma.examenAspirante.update({
      where: { id: e.id },
      data: { inicioEn: null, limiteEn: null, terminadoEn: null, preguntas: Prisma.DbNull, respuestas: {}, incidentes: [], puntos: null, puntosMax: null, valorExamen: null, calificacion: null, calificacion10: null },
    });
    await this.adm.bitacora(folio, u.nombre, `Reinició el examen en línea de ${area === 'matematicas' ? 'Matemáticas' : 'Programación'}`);
    return this.aplicacion();
  }

  async marcarRegistrado(folio: string, area: AreaFront) {
    const { e } = await this.examenDe(folio, area);
    if (!e?.terminadoEn) throw new ConflictException('El examen no se ha entregado');
    await this.prisma.examenAspirante.update({ where: { id: e.id }, data: { registradoEn: new Date() } });
    return this.aplicacion();
  }

  // ---------- Calificación y cierre ----------

  private async terminar(e: { id: string; preguntas: Prisma.JsonValue; respuestas: Prisma.JsonValue; area: string; terminadoEn: Date | null }, cuando = new Date()) {
    if (e.terminadoEn) return;
    const c = await this.config();
    const items = (e.preguntas ?? []) as unknown as ItemServidor[];
    const r = calificar(items, (e.respuestas ?? {}) as Record<string, Respuesta>, c.relacionarParcial, c.areas[deEnum(e.area)].valor);
    await this.prisma.examenAspirante.updateMany({ where: { id: e.id, terminadoEn: null }, data: { terminadoEn: cuando, ...r } });
  }

  /** Entrega los exámenes cuyo tiempo ya terminó (el aspirante cerró la página o se le acabó el tiempo). */
  private async cerrarVencidos() {
    const vencidos = await this.prisma.examenAspirante.findMany({ where: { terminadoEn: null, limiteEn: { lt: new Date(Date.now() - GRACIA_MS) } } });
    for (const e of vencidos) await this.terminar(e, e.limiteEn!);
  }

  // ---------- Portal del aspirante ----------

  private async postulacionDe(u: UsuarioSesion) {
    if (u.area !== 'ASPIRANTES') throw new ForbiddenException('Solo para aspirantes');
    const usuario = await this.prisma.usuario.findUnique({ where: { id: u.id } });
    const p = usuario?.aspiranteId
      ? await this.prisma.postulacion.findFirst({
          where: { aspiranteId: usuario.aspiranteId },
          orderBy: { creadoEn: 'desc' },
          select: { id: true, folio: true, aspirante: { select: { nombres: true, apellidoPaterno: true, apellidoMaterno: true } }, convocatoria: { select: { clave: true } } },
        })
      : null;
    if (!p) throw new NotFoundException('Tu cuenta no tiene una solicitud de admisión');
    return p;
  }

  /** Lo que ve el aspirante: sus exámenes habilitados, horarios y, si está presentando, sus preguntas sin respuestas. */
  async portal(u: UsuarioSesion) {
    const p = await this.postulacionDe(u);
    await this.cerrarVencidos();
    const c = await this.config();
    const examenes = (await this.prisma.examenAspirante.findMany({ where: { postulacionId: p.id } })).filter((e) => c.areas[deEnum(e.area)]?.activa);
    const banco = (await this.banco()).filter((x) => x.activa);
    const areas = examenes.map((e) => deEnum(e.area));
    const preguntas: Record<string, unknown>[] = [];
    const intentos: Record<string, unknown> = {};
    for (const e of examenes) {
      if (!e.inicioEn) continue;
      const area = deEnum(e.area);
      const items = (e.preguntas ?? []) as unknown as ItemServidor[];
      const enCurso = !e.terminadoEn;
      const vistos = enCurso ? items.map(paraAspirante) : [];
      preguntas.push(...vistos.map((v) => v.pregunta));
      intentos[`${p.folio}|${area}`] = {
        aspirante: p.folio,
        area,
        preguntas: enCurso ? vistos.map((v) => v.item) : [],
        respuestas: enCurso ? e.respuestas : {},
        inicioEl: e.inicioEn.toISOString(),
        limiteEl: e.limiteEn?.toISOString(),
        terminadoEl: e.terminadoEn?.toISOString(),
        incidentes: [],
        ...(e.terminadoEn && c.mostrarCalificacion
          ? { puntos: e.puntos, puntosMax: e.puntosMax, valorExamen: e.valorExamen, calificacion: e.calificacion, calificacion10: e.calificacion10 }
          : {}),
      };
    }
    // Configuración visible: horarios y cantidad real de preguntas (sin las de otras áreas)
    const config = {
      ...c,
      areas: Object.fromEntries(AREAS_FRONT.map((a) => [a, { ...c.areas[a], activa: c.areas[a].activa && areas.includes(a), cantidades: cantidadesReales(c, a, banco) }])),
    };
    const a = p.aspirante;
    return {
      yo: p.folio,
      nombre: [a.nombres, a.apellidoPaterno, a.apellidoMaterno].filter(Boolean).join(' '),
      convocatoria: /^B/i.test(p.convocatoria.clave) ? 'B' : 'A',
      ahora: new Date().toISOString(),
      config,
      habilitados: areas.length ? { [p.folio]: { areas, el: '', por: '' } } : {},
      intentos,
      banco: preguntas,
    };
  }

  private async miExamen(u: UsuarioSesion, area: AreaFront) {
    if (!AREAS_FRONT.includes(area)) throw new BadRequestException('Área inválida');
    const p = await this.postulacionDe(u);
    const e = await this.prisma.examenAspirante.findUnique({ where: { postulacionId_area: { postulacionId: p.id, area: aEnum(area) } } });
    if (!e) throw new ForbiddenException('No estás habilitado para presentar este examen');
    return { p, e };
  }

  async iniciar(u: UsuarioSesion, area: AreaFront) {
    const { p, e } = await this.miExamen(u, area);
    if (e.inicioEn) return this.portal(u);
    const c = await this.config();
    const ca = c.areas[area];
    if (!ca.activa) throw new ForbiddenException('Este examen no se presenta en línea');
    const ahora = new Date();
    if (ahora < deLocal(ca.inicio)) throw new ForbiddenException('El examen aún no abre');
    if (ahora > deLocal(ca.fin)) throw new ForbiddenException('El periodo para presentar el examen terminó');
    const otro = await this.prisma.examenAspirante.findFirst({ where: { postulacionId: p.id, inicioEn: { not: null }, terminadoEn: null, limiteEn: { gt: ahora } } });
    if (otro) throw new ConflictException(`Primero termina tu examen de ${otro.area === 'MATEMATICAS' ? 'Matemáticas' : 'Programación'}`);
    const items = generarExamen(c, area, (await this.banco()).filter((x) => x.activa));
    if (!items.length) throw new ConflictException('El examen todavía no tiene preguntas. Avisa al Departamento de Posgrado.');
    const limite = new Date(Math.min(ahora.getTime() + ca.duracionMin * 60_000, deLocal(ca.fin).getTime()));
    // Solo uno gana si llegan dos clics a la vez
    const r = await this.prisma.examenAspirante.updateMany({
      where: { id: e.id, inicioEn: null },
      data: { inicioEn: ahora, limiteEn: limite, preguntas: items as unknown as Prisma.InputJsonValue, respuestas: {}, incidentes: [] },
    });
    if (r.count) await this.adm.bitacora(p.folio, u.nombre, `Inició el examen en línea de ${area === 'matematicas' ? 'Matemáticas' : 'Programación'} (${items.length} preguntas)`);
    return this.portal(u);
  }

  private enCurso(e: { inicioEn: Date | null; terminadoEn: Date | null; limiteEn: Date | null }) {
    if (!e.inicioEn) throw new ConflictException('No has iniciado este examen');
    if (e.terminadoEn) throw new ConflictException('Ya entregaste este examen');
    if (e.limiteEn && Date.now() > e.limiteEn.getTime() + GRACIA_MS) throw new ConflictException('Se terminó el tiempo del examen');
  }

  async responder(u: UsuarioSesion, area: AreaFront, respuestas: Record<string, unknown>) {
    const { e } = await this.miExamen(u, area);
    this.enCurso(e);
    if (!respuestas || typeof respuestas !== 'object' || JSON.stringify(respuestas).length > 100_000) throw new BadRequestException('Respuestas inválidas');
    const ids = new Set(((e.preguntas ?? []) as unknown as ItemServidor[]).map((x) => x.id));
    const limpias: Record<string, Respuesta> = {};
    for (const [k, v] of Object.entries(respuestas)) {
      if (!ids.has(k)) continue;
      const ok = v === null || typeof v === 'string' || typeof v === 'boolean' || (typeof v === 'object' && !Array.isArray(v) && Object.values(v as object).every((x) => typeof x === 'string'));
      if (!ok) throw new BadRequestException('Respuesta inválida');
      if (typeof v === 'string' && v.length > 5000) throw new BadRequestException('Respuesta demasiado larga');
      limpias[k] = v === null ? undefined : (v as Respuesta);
    }
    const nuevas = { ...((e.respuestas ?? {}) as Record<string, Respuesta>), ...limpias };
    await this.prisma.examenAspirante.updateMany({ where: { id: e.id, terminadoEn: null }, data: { respuestas: nuevas as unknown as Prisma.InputJsonValue } });
    return { ok: true, guardadas: Object.keys(limpias).length };
  }

  async incidente(u: UsuarioSesion, area: AreaFront, tipo: string) {
    if (!INCIDENTES.includes(tipo)) throw new BadRequestException('Incidente inválido');
    const { e } = await this.miExamen(u, area);
    if (!e.inicioEn || e.terminadoEn) return { ok: true };
    const lista = [...((e.incidentes ?? []) as { tipo: string; el: string }[]), { tipo, el: new Date().toISOString() }].slice(-300);
    await this.prisma.examenAspirante.update({ where: { id: e.id }, data: { incidentes: lista } });
    return { ok: true };
  }

  async entregar(u: UsuarioSesion, area: AreaFront, respuestas?: Record<string, unknown>) {
    const { p, e } = await this.miExamen(u, area);
    if (e.terminadoEn) return this.portal(u);
    if (respuestas && Object.keys(respuestas).length) {
      try {
        await this.responder(u, area, respuestas);
      } catch {
        /* si el tiempo ya pasó, se califica con lo guardado */
      }
    }
    const actual = await this.prisma.examenAspirante.findUniqueOrThrow({ where: { id: e.id } });
    if (!actual.inicioEn) throw new ConflictException('No has iniciado este examen');
    const cuando = actual.limiteEn && Date.now() > actual.limiteEn.getTime() ? actual.limiteEn : new Date();
    await this.terminar(actual, cuando);
    await this.adm.bitacora(p.folio, u.nombre, `Entregó el examen en línea de ${area === 'matematicas' ? 'Matemáticas' : 'Programación'}`);
    return this.portal(u);
  }
}
