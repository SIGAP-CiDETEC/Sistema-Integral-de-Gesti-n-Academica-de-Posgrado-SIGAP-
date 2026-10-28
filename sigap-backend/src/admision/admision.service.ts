import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AreaPersonal, EstadoPostulacion, ModalidadEntrevista, Prisma, ResolucionEntrevista } from '../generated/prisma/client';
import type { UsuarioSesion } from '../auth/auth.guard';
import { guardarArchivo } from '../comun/almacen';
import { aFechaHora, deFechaHora } from '../comun/fechas';
import { PrismaService } from '../prisma/prisma.service';

/** Profesores que integran cada entrevista colegiada. */
export const LUGARES = 3;
/** Duración más larga que puede elegir Posgrado (minutos); sirve para buscar traslapes. */
const DURACION_MAXIMA = 120;
/** "10:30" + 45 → "11:15" */
const horaFin = (hora: string, min: number) => {
  const [h, m] = hora.split(':').map(Number);
  const t = h * 60 + m + min;
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

const RESOLUCION: Record<ResolucionEntrevista, string> = { APROBADO: 'Aprobado', CON_RESERVAS: 'Con reservas', RECHAZADO: 'Rechazado' };
const RESOLUCION_DB: Record<string, ResolucionEntrevista> = { Aprobado: 'APROBADO', 'Con reservas': 'CON_RESERVAS', Rechazado: 'RECHAZADO' };
const MODALIDAD: Record<ModalidadEntrevista, string> = { PRESENCIAL: 'Presencial', EN_LINEA: 'En línea' };

const conTodo = {
  aspirante: true,
  documentos: { include: { catalogo: true } },
  entrevista: { include: { sinodo: { orderBy: { elegidoEn: 'asc' } }, acta: true } },
} satisfies Prisma.PostulacionInclude;
type PostulacionCompleta = Prisma.PostulacionGetPayload<{ include: typeof conTodo }>;

/**
 * Qué datos del aspirante ve cada cuenta:
 * - completa: Posgrado y Subdirección.
 * - profesor: profesor entrevistador de una cita ya publicada (nombre, procedencia, promedio y correo; solo su SIP-02).
 * - docente: docente del grupo del propedéutico en que está inscrito (nombre y su evaluación, para capturar calificaciones).
 * - anonima: solo día, hora y lugares de la entrevista (profesores que aún no integran la entrevista o cuya cita no se publica).
 */
export type Vista = 'completa' | 'profesor' | 'docente' | 'anonima';

/** Campos del proceso que registra Posgrado (Postulacion.estadoProceso). Lo demás lo calcula el servidor. */
export const CAMPOS_PROCESO = ['etapa', 'concluido', 'promedioValidado', 'evaluacion', 'resolucion', 'motivoReservas', 'turnadoUteycv', 'formatos', 'dedicacion', 'uteycv'] as const;
const ORDEN_ETAPAS = ['registro', 'documentos', 'entrevista', 'evaluacion', 'dictamen'];
/** Formatos que se entregan como PDF y no se revisan como documentos del expediente. */
const FORMATOS_PDF = ['sip-02', 'cuestionario'];
const ESTADO_DOC: Record<string, string> = { APROBADO: 'aprobado', OBSERVADO: 'observado', PRORROGA: 'prorroga' };

const etapaDe = (e: EstadoPostulacion) =>
  e === 'EN_EVALUACION' ? 'evaluacion' : e === 'ESPERANDO_RESOLUCION' || e === 'ADMITIDA' || e === 'NO_ADMITIDA' ? 'dictamen' : ['BORRADOR', 'REGISTRO_INCOMPLETO'].includes(e) ? 'registro' : ['ENVIADA', 'EN_REVISION', 'OBSERVADA'].includes(e) ? 'documentos' : 'entrevista';

@Injectable()
export class AdmisionService {
  constructor(private readonly prisma: PrismaService) {}

  bitacora(folio: string, actor: string, accion: string, detalle?: Prisma.InputJsonValue) {
    return this.prisma.eventoBitacora.create({ data: { entidad: 'Postulacion', entidadId: folio, actor, accion, detalle } });
  }

  async postulacion(folio: string) {
    const p = await this.prisma.postulacion.findUnique({ where: { folio }, include: conTodo });
    if (!p) throw new NotFoundException('No existe ese aspirante');
    return p;
  }

  /** Convierte la postulación al formato que usa el front (AspiranteP). */
  aFront(p: PostulacionCompleta, vista: Vista) {
    const completo = vista === 'completa' || vista === 'profesor';
    const todo = vista === 'completa';
    const proc = (p.estadoProceso ?? {}) as Record<string, unknown>;
    const r = (p.respuestasRegistro ?? {}) as Record<string, string>;
    const a = p.aspirante;
    const e = p.entrevista;
    const acta = e?.acta;
    const firmada = acta?.firmadaSubidaEn && acta.firmadaArchivoNombre;
    const ultimo = [p.actualizadoEn, e?.actualizadoEn, acta?.actualizadoEn].filter(Boolean).sort((x, y) => +y! - +x!)[0] ?? p.actualizadoEn;
    const base = {
      id: p.folio,
      nombre: completo || vista === 'docente' ? [a.nombres, a.apellidoPaterno, a.apellidoMaterno].filter(Boolean).join(' ') : 'Aspirante',
      curp: todo ? (a.curp ?? '') : '',
      correo: completo && !a.correo.endsWith('@sin-correo.sigap.local') ? a.correo : '',
      telefono: todo ? (a.telefono ?? '') : '',
      procedencia: completo ? (r.procedencia ?? '') : '',
      promedio: completo ? (r.promedio ?? '') : '',
      registradoEl: (p.enviadaEn ?? p.creadoEn).toISOString(),
      ultimoMovimiento: ultimo.toISOString(),
      etapa: etapaDe(p.estado),
      concluido: p.estado === 'RECHAZADA' ? 'Rechazado en la entrevista colegiada' : undefined,
      documentos: completo
        ? p.documentos
            .filter((d) => !FORMATOS_PDF.includes(d.catalogo.clave))
            .map((d) => ({
              id: d.catalogo.clave,
              nombre: d.catalogo.nombre,
              archivo: todo ? (d.nombreArchivo ?? undefined) : undefined,
              estado: ESTADO_DOC[d.estado] ?? (d.nombreArchivo ? 'pendiente' : 'falta'),
              ...(todo && d.observacion ? { observacion: d.observacion } : {}),
              ...(todo && d.prorrogaHasta ? { prorrogaHasta: deFechaHora(d.prorrogaHasta).fecha } : {}),
              opcional: !d.catalogo.obligatorio,
            }))
        : [],
      formatos: completo ? Object.fromEntries(p.documentos.filter((d) => FORMATOS_PDF.includes(d.catalogo.clave) && d.nombreArchivo).map((d) => [d.catalogo.clave, true])) : {},
      evaluacion: { grupos: {} },
      entrevista: e
        ? {
            ...deFechaHora(e.fechaHora),
            duracion: e.duracionMin,
            modalidad: MODALIDAD[e.modalidad],
            sala: e.sala,
            sinodo: e.sinodo.map((s) => s.profesorId),
            horarioPublicadoEl: e.horarioPublicadoEn?.toISOString(),
            notificadaEl: e.publicadaAspiranteEn?.toISOString() ?? '',
          }
        : undefined,
      actaEntrevista:
        completo && acta?.capturadaPor
          ? {
              hoja1: (acta.hoja1 ?? { areas: [] }) as object,
              criterios: (acta.criterios ?? {}) as object,
              proyeccion: acta.proyeccion ?? '',
              observaciones: acta.observaciones ?? '',
              resolucion: acta.resolucion ? RESOLUCION[acta.resolucion] : 'Aprobado',
              motivo: acta.motivo ?? '',
              capturadaPor: acta.capturadaPor,
              capturadaEl: acta.capturadaEn?.toISOString() ?? '',
              descargada: acta.descargadaEn ? { por: acta.descargadaPorId ?? '', el: acta.descargadaEn.toISOString() } : undefined,
              firmada: firmada ? { archivo: acta.firmadaArchivoNombre!, subidaPor: acta.firmadaSubidaPorId ?? '', el: acta.firmadaSubidaEn!.toISOString() } : undefined,
            }
          : undefined,
      dictamen:
        firmada && acta?.resolucion
          ? { resolucion: RESOLUCION[acta.resolucion], comentarios: [acta.observaciones, acta.motivo].filter((x) => x?.trim()).join(' · '), registradoEl: acta.firmadaSubidaEn!.toISOString() }
          : undefined,
    };
    // Avance que registró Posgrado: completo para Posgrado y Subdirección; a los profesores solo su evaluación y etapa
    const campos: readonly string[] = todo ? CAMPOS_PROCESO : vista === 'anonima' ? [] : ['evaluacion', 'etapa'];
    const extra = Object.fromEntries(Object.entries(proc).filter(([k]) => campos.includes(k)));
    const etapa = extra.etapa && ORDEN_ETAPAS.indexOf(String(extra.etapa)) > ORDEN_ETAPAS.indexOf(base.etapa) ? String(extra.etapa) : base.etapa;
    return {
      ...base,
      ...extra,
      etapa,
      concluido: base.concluido ?? (extra.concluido as string | undefined),
      formatos: { ...((extra.formatos as Record<string, boolean>) ?? {}), ...base.formatos },
      evaluacion: { grupos: {}, ...((extra.evaluacion as object) ?? {}) },
    };
  }

  /**
   * Aspirantes visibles para la cuenta:
   * - Posgrado y Subdirección: todos con todos sus datos.
   * - Profesores: solo las entrevistas cuyo horario ya se publicó; los datos del aspirante solo si integran su entrevista
   *   y Posgrado ya publicó la cita.
   */
  async listar(u: UsuarioSesion) {
    const lista = await this.prisma.postulacion.findMany({ include: conTodo, orderBy: { folio: 'asc' } });
    if (u.area !== 'PROFESORES') return lista.map((p) => this.aFront(p, 'completa'));
    // Profesores: las entrevistas con horario publicado y los aspirantes de los grupos del propedéutico que imparten
    const grupos = await this.gruposDelDocente(u.profesorId);
    return lista
      .filter((p) => p.entrevista?.horarioPublicadoEn || this.esDocenteDe(p, grupos))
      .map((p) => {
        const v = this.vistaProfesor(p, u.profesorId);
        return this.aFront(p, v === 'profesor' ? 'profesor' : this.esDocenteDe(p, grupos) ? 'docente' : 'anonima');
      });
  }

  // ---------- Avance del proceso (Posgrado) ----------

  /** Grupos del propedéutico que imparte el profesor ("materia:grupo"), según la configuración de la evaluación. */
  async gruposDelDocente(prof?: string | null) {
    if (!prof) return new Set<string>();
    const cfg = (await this.prisma.almacen.findUnique({ where: { clave: 'evaluacion' } }))?.valor as { materias?: { id: string; grupos?: { id: string; docente?: string }[] }[] } | undefined;
    return new Set((cfg?.materias ?? []).flatMap((m) => (m.grupos ?? []).filter((g) => g.docente === prof).map((g) => `${m.id}:${g.id}`)));
  }

  esDocenteDe(p: { estadoProceso: Prisma.JsonValue }, grupos: Set<string>, area?: string) {
    const ev = ((p.estadoProceso ?? {}) as { evaluacion?: { modalidad?: string; grupos?: Record<string, string> } }).evaluacion;
    if (ev?.modalidad !== 'propedeutico') return false;
    return Object.entries(ev.grupos ?? {}).some(([a, g]) => (!area || a === area) && grupos.has(`${a}:${g}`));
  }

  /** Posgrado registra un avance del aspirante (solo los campos del proceso; la entrevista y el acta tienen sus reglas). */
  async actualizarProceso(folio: string, patch: Record<string, unknown>, accion: string, u: UsuarioSesion) {
    const p = await this.postulacion(folio);
    const ajenos = Object.keys(patch).filter((k) => !(CAMPOS_PROCESO as readonly string[]).includes(k));
    if (ajenos.length) throw new BadRequestException(`No se pueden cambiar estos datos desde aquí: ${ajenos.join(', ')}`);
    const nuevo = { ...((p.estadoProceso ?? {}) as Record<string, unknown>), ...patch };
    for (const [k, v] of Object.entries(patch)) if (v === null) delete nuevo[k];
    await this.prisma.postulacion.update({ where: { id: p.id }, data: { estadoProceso: nuevo as Prisma.InputJsonValue } });
    if (accion?.trim()) await this.bitacora(folio, u.nombre, accion.trim().slice(0, 1000));
    return this.aFront(await this.postulacion(folio), 'completa');
  }

  /** Posgrado revisa un documento del expediente: aprobado, observado (con observación), prórroga (con fecha) o pendiente. */
  async revisarDocumento(folio: string, clave: string, d: { estado: string; observacion?: string; prorrogaHasta?: string; accion?: string }, u: UsuarioSesion) {
    const p = await this.postulacion(folio);
    const doc = p.documentos.find((x) => x.catalogo.clave === clave);
    if (!doc) throw new NotFoundException('Ese documento no está en el expediente');
    const ESTADOS: Record<string, 'APROBADO' | 'OBSERVADO' | 'PRORROGA' | 'PENDIENTE'> = { aprobado: 'APROBADO', observado: 'OBSERVADO', prorroga: 'PRORROGA', pendiente: 'PENDIENTE' };
    const estado = ESTADOS[d.estado];
    if (!estado) throw new BadRequestException('Estado de documento inválido');
    if (estado === 'OBSERVADO' && !d.observacion?.trim()) throw new BadRequestException('Escribe la observación del documento');
    if (estado === 'PRORROGA' && !d.prorrogaHasta) throw new BadRequestException('Indica la fecha límite de la prórroga');
    await this.prisma.documentoPostulacion.update({
      where: { id: doc.id },
      data: {
        estado,
        observacion: estado === 'OBSERVADO' || estado === 'PRORROGA' ? (d.observacion?.trim() || null) : null,
        prorrogaHasta: estado === 'PRORROGA' ? new Date(`${d.prorrogaHasta}T23:59:59-06:00`) : null,
      },
    });
    await this.bitacora(folio, u.nombre, d.accion?.trim().slice(0, 1000) || `Marcó ${doc.catalogo.nombre} como ${d.estado}`);
    return this.aFront(await this.postulacion(folio), 'completa');
  }

  /**
   * El docente del propedéutico captura (o corrige) calificaciones de su grupo. Manda la evaluación completa calculada
   * en el front; el servidor solo acepta cambios en las capturas del propedéutico de las áreas que imparte (a su nombre)
   * y en el resultado integrado del propedéutico.
   */
  async capturarPropedeutico(folio: string, evaluacion: Record<string, unknown>, accion: string, u: UsuarioSesion) {
    const prof = u.profesorId;
    if (u.area !== AreaPersonal.PROFESORES || !prof) throw new ForbiddenException('Solo los profesores pueden capturar calificaciones');
    const p = await this.postulacion(folio);
    const grupos = await this.gruposDelDocente(prof);
    const actual = (((p.estadoProceso ?? {}) as Record<string, unknown>).evaluacion ?? {}) as Record<string, unknown>;
    const igual = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
    for (const k of new Set([...Object.keys(actual), ...Object.keys(evaluacion)]))
      if (!['capturas', 'propedeutico'].includes(k) && !igual(actual[k], evaluacion[k])) throw new ForbiddenException('Solo puedes capturar calificaciones');
    const capA = ((actual.capturas ?? {}) as Record<string, Record<string, { por?: string; calificacion?: number }>>) ?? {};
    const capN = ((evaluacion.capturas ?? {}) as Record<string, Record<string, { por?: string; calificacion?: number }>>) ?? {};
    if (!igual(capA.examen, capN.examen)) throw new ForbiddenException('El examen lo califica Posgrado');
    const cambiadas = Object.keys({ ...(capA.propedeutico ?? {}), ...(capN.propedeutico ?? {}) }).filter((a) => !igual(capA.propedeutico?.[a], capN.propedeutico?.[a]));
    if (!cambiadas.length) return this.aFront(p, 'docente');
    for (const area of cambiadas) {
      const c = capN.propedeutico?.[area];
      if (!this.esDocenteDe(p, grupos, area)) throw new ForbiddenException('Solo puedes calificar a los aspirantes de tus grupos');
      if (!c || c.por !== prof || typeof c.calificacion !== 'number' || c.calificacion < 0 || c.calificacion > 10) throw new BadRequestException('Calificación inválida');
    }
    if (actual.propedeutico && (actual.propedeutico as { publicadoEl?: string }).publicadoEl) throw new ConflictException('El resultado ya se publicó; ya no se puede corregir');
    const nuevo = { ...((p.estadoProceso ?? {}) as Record<string, unknown>), evaluacion: { ...actual, capturas: evaluacion.capturas, propedeutico: evaluacion.propedeutico } };
    await this.prisma.postulacion.update({ where: { id: p.id }, data: { estadoProceso: nuevo as Prisma.InputJsonValue } });
    if (accion?.trim()) await this.bitacora(folio, u.nombre, accion.trim().slice(0, 1000));
    return this.aFront(await this.postulacion(folio), 'docente');
  }

  /** Deja constancia en la bitácora de un cambio general (p. ej. fechas de evaluación o el inicio del aspirante). */
  registrarEnBitacora(accion: string, u: UsuarioSesion, aspirante?: string) {
    return this.bitacora(aspirante ?? '', u.nombre, accion.trim().slice(0, 1000));
  }

  // ---------- Almacén compartido ----------

  async almacenLeer(clave: string) {
    return (await this.prisma.almacen.findUnique({ where: { clave } }))?.valor ?? null;
  }

  async almacenGuardar(clave: string, valor: unknown, u: UsuarioSesion) {
    if (valor === null) {
      await this.prisma.almacen.deleteMany({ where: { clave } });
      return null;
    }
    const r = await this.prisma.almacen.upsert({
      where: { clave },
      create: { clave, valor: valor as Prisma.InputJsonValue, actualizadoPor: u.nombre },
      update: { valor: valor as Prisma.InputJsonValue, actualizadoPor: u.nombre },
    });
    return r.valor;
  }

  /** El profesor ve los datos del aspirante solo si integra su entrevista y Posgrado ya publicó la cita. */
  private vistaProfesor(p: PostulacionCompleta, prof?: string | null): Vista {
    const e = p.entrevista;
    return prof && e?.publicadaAspiranteEn && e.sinodo.some((s) => s.profesorId === prof) ? 'profesor' : 'anonima';
  }

  async profesores() {
    const ps = await this.prisma.profesor.findMany({ orderBy: { nombre: 'asc' } });
    return ps.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      correo: p.correo.endsWith('@pendiente.sigap.local') ? '' : p.correo,
      colegiado: p.tipoNombramiento === 'COLEGIADO',
      vigencia: p.tipoNombramiento === 'ASIGNATURA' ? 'Asignatura' : p.vigenteHasta ? String(p.vigenteHasta.getFullYear()) : 'Vencida',
      linea: p.lineaInvestigacion ?? '',
    }));
  }

  async bitacora_(limite = 300) {
    const ev = await this.prisma.eventoBitacora.findMany({ where: { entidad: 'Postulacion' }, orderBy: { creadoEn: 'desc' }, take: limite });
    return ev.map((e) => ({ fecha: e.creadoEn.toISOString(), usuario: e.actor ?? '', aspirante: e.entidadId, accion: e.accion }));
  }

  // ---------- Posgrado ----------

  /** Captura o actualiza el horario de la entrevista (mientras no exista acta). */
  /**
   * ¿Alguno de esos profesores ya tiene otra entrevista que se encima con [inicio, inicio + duración)?
   * Devuelve el primer choque encontrado.
   */
  private async choqueDe(tx: Prisma.TransactionClient | PrismaService, profesores: string[], inicio: Date, duracion: number, excepto: string) {
    if (!profesores.length) return null;
    const fin = new Date(+inicio + duracion * 60_000);
    const cercanas = await tx.integranteSinodo.findMany({
      where: { profesorId: { in: profesores }, entrevista: { postulacionId: { not: excepto }, fechaHora: { gt: new Date(+inicio - DURACION_MAXIMA * 60_000), lt: fin } } },
      include: { entrevista: true },
    });
    return cercanas.find((c) => +c.entrevista.fechaHora + c.entrevista.duracionMin * 60_000 > +inicio) ?? null;
  }

  async guardarHorario(folio: string, d: { fecha: string; hora: string; duracion?: number; modalidad: string; sala: string }, u: UsuarioSesion) {
    const p = await this.postulacion(folio);
    if (p.entrevista?.acta?.capturadaPor) throw new ConflictException('La entrevista ya tiene acta; no se puede cambiar el horario');
    const fechaHora = aFechaHora(d.fecha, d.hora);
    if (Number.isNaN(+fechaHora)) throw new BadRequestException('Fecha u hora inválida');
    const modalidad: ModalidadEntrevista = d.modalidad === 'En línea' ? 'EN_LINEA' : 'PRESENCIAL';
    const duracionMin = d.duracion ?? p.entrevista?.duracionMin ?? 25;
    // Choques: algún profesor del grupo ya tiene otra entrevista que se encima con el nuevo horario
    const miembros = p.entrevista?.sinodo.map((s) => s.profesorId) ?? [];
    if (await this.choqueDe(this.prisma, miembros, fechaHora, duracionMin, p.id)) throw new ConflictException('Un profesor entrevistador ya tiene otra entrevista que se encima con ese horario');
    const cambio =
      p.entrevista && (+p.entrevista.fechaHora !== +fechaHora || p.entrevista.duracionMin !== duracionMin || p.entrevista.sala !== d.sala || p.entrevista.modalidad !== modalidad);
    await this.prisma.entrevista.upsert({
      where: { postulacionId: p.id },
      create: { postulacionId: p.id, fechaHora, duracionMin, modalidad, sala: d.sala },
      update: { fechaHora, duracionMin, modalidad, sala: d.sala },
    });
    if (p.estado === 'VALIDADA') await this.prisma.postulacion.update({ where: { id: p.id }, data: { estado: 'ENTREVISTA_PROGRAMADA' } });
    await this.bitacora(folio, u.nombre, `${p.entrevista ? (cambio ? 'Actualizó' : 'Guardó') : 'Programó'} el horario de entrevista: ${d.fecha} de ${d.hora} a ${horaFin(d.hora, duracionMin)} h · ${d.modalidad} · ${d.sala}`);
    return this.aFront(await this.postulacion(folio), 'completa');
  }

  async publicarHorario(folio: string, u: UsuarioSesion) {
    const p = await this.postulacion(folio);
    if (!p.entrevista) throw new BadRequestException('Primero captura el horario');
    if (p.entrevista.horarioPublicadoEn) return this.aFront(p, 'completa');
    await this.prisma.entrevista.update({ where: { id: p.entrevista.id }, data: { horarioPublicadoEn: new Date() } });
    const { fecha, hora } = deFechaHora(p.entrevista.fechaHora);
    await this.bitacora(folio, u.nombre, `Publicó el horario de entrevista ${fecha} de ${hora} a ${horaFin(hora, p.entrevista.duracionMin)} h para que los profesores lo elijan`);
    return this.aFront(await this.postulacion(folio), 'completa');
  }

  async publicarEntrevista(folio: string, u: UsuarioSesion) {
    const p = await this.postulacion(folio);
    const e = p.entrevista;
    if (!e?.horarioPublicadoEn) throw new BadRequestException('Primero publica el horario a los profesores');
    if (e.sinodo.length < LUGARES) throw new BadRequestException(`Faltan profesores entrevistadores (${e.sinodo.length} de ${LUGARES})`);
    if (e.publicadaAspiranteEn) return this.aFront(p, 'completa');
    await this.prisma.entrevista.update({ where: { id: e.id }, data: { publicadaAspiranteEn: new Date() } });
    const nombres = await this.prisma.profesor.findMany({ where: { id: { in: e.sinodo.map((s) => s.profesorId) } } });
    const { fecha, hora } = deFechaHora(e.fechaHora);
    await this.bitacora(folio, u.nombre, `Publicó la entrevista al aspirante: ${fecha} de ${hora} a ${horaFin(hora, e.duracionMin)} h · ${MODALIDAD[e.modalidad]} · ${e.sala}; profesores entrevistadores: ${nombres.map((n) => n.nombre).join(', ')}`);
    return this.aFront(await this.postulacion(folio), 'completa');
  }

  // ---------- Profesores ----------

  private profesorDe(u: UsuarioSesion) {
    if (u.area !== AreaPersonal.PROFESORES || !u.profesorId) throw new ForbiddenException('Solo los profesores pueden hacer esto');
    return u.profesorId;
  }

  async elegir(folio: string, u: UsuarioSesion) {
    const prof = this.profesorDe(u);
    // Transacción serializable: evita que dos profesores ocupen el último lugar al mismo tiempo
    await this.prisma.$transaction(
      async (tx) => {
        const p = await tx.postulacion.findUnique({ where: { folio }, include: { entrevista: { include: { sinodo: true } } } });
        const e = p?.entrevista;
        if (!e?.horarioPublicadoEn) throw new BadRequestException('Esa entrevista no está disponible');
        if (e.sinodo.some((s) => s.profesorId === prof)) return;
        if (e.sinodo.length >= LUGARES) throw new ConflictException('Ya no hay lugares libres en esa entrevista');
        if (await this.choqueDe(tx, [prof], e.fechaHora, e.duracionMin, e.postulacionId)) throw new ConflictException('Ya tienes otra entrevista que se encima con ese horario');
        await tx.integranteSinodo.create({ data: { entrevistaId: e.id, profesorId: prof } });
        const { fecha, hora } = deFechaHora(e.fechaHora);
        const n = e.sinodo.length + 1;
        await tx.eventoBitacora.create({ data: { entidad: 'Postulacion', entidadId: folio, actor: u.nombre, accion: `Eligió la entrevista del ${fecha} de ${hora} a ${horaFin(hora, e.duracionMin)} h · profesores entrevistadores ${n} de ${LUGARES}${n === LUGARES ? ' (completo)' : ''}` } });
      },
      { isolationLevel: 'Serializable' },
    );
    const p = await this.postulacion(folio);
    return this.aFront(p, this.vistaProfesor(p, prof));
  }

  async dejar(folio: string, u: UsuarioSesion) {
    const prof = this.profesorDe(u);
    const p = await this.postulacion(folio);
    const e = p.entrevista;
    if (!e?.sinodo.some((s) => s.profesorId === prof)) throw new BadRequestException('No formas parte de esa entrevista');
    if (e.publicadaAspiranteEn || e.acta?.capturadaPor) throw new ConflictException('La entrevista ya se publicó al aspirante; pide a Posgrado el cambio');
    await this.prisma.integranteSinodo.delete({ where: { entrevistaId_profesorId: { entrevistaId: e.id, profesorId: prof } } });
    const { fecha, hora } = deFechaHora(e.fechaHora);
    await this.bitacora(folio, u.nombre, `Dejó su lugar en la entrevista del ${fecha} de ${hora} a ${horaFin(hora, e.duracionMin)} h · profesores entrevistadores ${e.sinodo.length - 1} de ${LUGARES}`);
    return this.aFront(await this.postulacion(folio), 'anonima');
  }

  private exigirIntegrante(p: PostulacionCompleta, prof: string) {
    if (!p.entrevista?.sinodo.some((s) => s.profesorId === prof)) throw new ForbiddenException('No formas parte de esa entrevista');
    return p.entrevista;
  }

  /** Acta MTC-EC en cola: la llena el primer profesor; solo él la corrige mientras no se suba firmada. */
  async guardarActa(folio: string, d: { hoja1: object; criterios: object; proyeccion: string; observaciones: string; resolucion: string; motivo: string }, u: UsuarioSesion) {
    const prof = this.profesorDe(u);
    const p = await this.postulacion(folio);
    const e = this.exigirIntegrante(p, prof);
    if (!e.publicadaAspiranteEn) throw new BadRequestException('Podrás llenar el acta cuando Posgrado publique la entrevista al aspirante');
    const previa = e.acta;
    if (previa?.firmadaSubidaEn) throw new ConflictException('El acta ya se subió firmada');
    if (previa?.descargadaEn) throw new ConflictException('El acta ya se descargó para firmarse; ya no se puede modificar');
    if (previa?.capturadaPor && previa.capturadaPor !== prof) throw new ConflictException('Otro profesor entrevistador ya llenó el acta');
    const resolucion = RESOLUCION_DB[d.resolucion];
    if (!resolucion) throw new BadRequestException('Resolución inválida');
    if (!d.motivo?.trim()) throw new BadRequestException('Indica el motivo de la resolución (también cuando es Sí)');
    const data = { hoja1: d.hoja1 as Prisma.InputJsonValue, criterios: d.criterios as Prisma.InputJsonValue, proyeccion: d.proyeccion, observaciones: d.observaciones, resolucion, motivo: d.motivo, capturadaPor: prof, capturadaEn: new Date() };
    await this.prisma.actaEntrevista.upsert({ where: { entrevistaId: e.id }, create: { entrevistaId: e.id, ...data }, update: data });
    await this.bitacora(folio, u.nombre, `${previa?.capturadaPor ? 'Corrigió' : 'Llenó'} el acta de entrevista colegiada (MTC-EC); queda lista para imprimirse, firmarse y subirse`);
    return this.aFront(await this.postulacion(folio), 'profesor');
  }

  /**
   * Un profesor entrevistador descarga el acta para imprimirla y firmarla: desde la primera descarga queda cerrada
   * (ya no se puede corregir), para que lo que firman los 3 sea lo que queda en el sistema.
   */
  async marcarDescargada(folio: string, u: UsuarioSesion) {
    const prof = this.profesorDe(u);
    const p = await this.postulacion(folio);
    const e = this.exigirIntegrante(p, prof);
    if (!e.acta?.capturadaPor) throw new BadRequestException('El acta aún no se llena');
    const marcada = await this.prisma.actaEntrevista.updateMany({ where: { id: e.acta.id, descargadaEn: null }, data: { descargadaEn: new Date(), descargadaPorId: prof } });
    if (marcada.count) await this.bitacora(folio, u.nombre, 'Descargó el acta MTC-EC para imprimirla y firmarla; desde ahora ya no se puede modificar');
    return this.aFront(await this.postulacion(folio), 'profesor');
  }

  /** El primero que sube el acta firmada por los 3 aplica el dictamen; a los demás se les bloquea la subida. */
  async subirActaFirmada(folio: string, archivo: { originalname: string; buffer: Buffer; mimetype: string; size: number } | undefined, u: UsuarioSesion) {
    const prof = this.profesorDe(u);
    if (!archivo) throw new BadRequestException('Adjunta el acta firmada en PDF');
    if (archivo.mimetype !== 'application/pdf' || archivo.buffer.subarray(0, 5).toString() !== '%PDF-') throw new BadRequestException('El acta debe ser un PDF');
    const p = await this.postulacion(folio);
    const e = this.exigirIntegrante(p, prof);
    const acta = e.acta;
    if (!acta?.capturadaPor) throw new BadRequestException('Primero se debe llenar el acta');
    if (acta.firmadaSubidaEn) throw new ConflictException('Otro profesor entrevistador ya subió el acta firmada');
    const nombre = archivo.originalname.replace(/[^\w.\- ]+/g, '_').slice(0, 120) || 'acta_firmada.pdf';
    const ruta = guardarArchivo(`actas/${folio}/MTC-EC_firmada_${Date.now()}.pdf`, archivo.buffer);
    const ahora = new Date();
    const rechazado = acta.resolucion === 'RECHAZADO';
    const actualizada = await this.prisma.actaEntrevista.updateMany({
      where: { id: acta.id, firmadaSubidaEn: null },
      data: { firmadaArchivoNombre: nombre, firmadaArchivoRuta: ruta, firmadaSubidaPorId: prof, firmadaSubidaEn: ahora },
    });
    if (!actualizada.count) throw new ConflictException('Otro profesor entrevistador ya subió el acta firmada');
    await this.prisma.integranteSinodo.updateMany({ where: { entrevistaId: e.id }, data: { firmadoEn: ahora } });
    await this.prisma.postulacion.update({ where: { id: p.id }, data: { estado: rechazado ? 'RECHAZADA' : 'EN_EVALUACION' } });
    await this.bitacora(folio, u.nombre, `Subió el acta MTC-EC firmada por los 3 profesores entrevistadores (${nombre}). Dictamen de entrevista: ${RESOLUCION[acta.resolucion!]}${rechazado ? '. El proceso queda concluido' : '; pasa a evaluación'}`);
    return this.aFront(await this.postulacion(folio), 'profesor');
  }

  // ---------- Archivos ----------

  /**
   * Comprueba que la cuenta pueda ver los archivos de ese aspirante. Posgrado y Subdirección ven todo; el profesor
   * entrevistador, ya publicada la cita, solo el SIP-02 (currículum) y el acta firmada; nunca el resto del expediente.
   */
  async puedeVerArchivos(folio: string, u: UsuarioSesion, clave?: string) {
    const p = await this.postulacion(folio);
    if (u.area === 'POSGRADO' || u.area === 'SUBDIRECCION') return p;
    if (u.area === 'PROFESORES' && this.vistaProfesor(p, u.profesorId) === 'profesor' && (clave === undefined || FORMATOS_PDF.includes(clave))) return p;
    throw new ForbiddenException('No tienes acceso a los documentos de este aspirante');
  }
}
