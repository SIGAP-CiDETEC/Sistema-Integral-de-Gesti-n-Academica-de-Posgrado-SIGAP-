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
 * - anonima: solo día, hora y lugares de la entrevista (profesores que aún no integran la entrevista o cuya cita no se publica).
 */
type Vista = 'completa' | 'profesor' | 'anonima';

const etapaDe = (e: EstadoPostulacion) =>
  e === 'EN_EVALUACION' ? 'evaluacion' : e === 'ESPERANDO_RESOLUCION' || e === 'ADMITIDA' || e === 'NO_ADMITIDA' ? 'dictamen' : ['BORRADOR', 'REGISTRO_INCOMPLETO'].includes(e) ? 'registro' : ['ENVIADA', 'EN_REVISION', 'OBSERVADA'].includes(e) ? 'documentos' : 'entrevista';

@Injectable()
export class AdmisionService {
  constructor(private readonly prisma: PrismaService) {}

  private bitacora(folio: string, actor: string, accion: string, detalle?: Prisma.InputJsonValue) {
    return this.prisma.eventoBitacora.create({ data: { entidad: 'Postulacion', entidadId: folio, actor, accion, detalle } });
  }

  private async postulacion(folio: string) {
    const p = await this.prisma.postulacion.findUnique({ where: { folio }, include: conTodo });
    if (!p) throw new NotFoundException('No existe ese aspirante');
    return p;
  }

  /** Convierte la postulación al formato que usa el front (AspiranteP). */
  private aFront(p: PostulacionCompleta, vista: Vista) {
    const completo = vista !== 'anonima';
    const todo = vista === 'completa';
    const r = (p.respuestasRegistro ?? {}) as Record<string, string>;
    const a = p.aspirante;
    const e = p.entrevista;
    const acta = e?.acta;
    const firmada = acta?.firmadaSubidaEn && acta.firmadaArchivoNombre;
    const ultimo = [p.actualizadoEn, e?.actualizadoEn, acta?.actualizadoEn].filter(Boolean).sort((x, y) => +y! - +x!)[0] ?? p.actualizadoEn;
    const base = {
      id: p.folio,
      nombre: completo ? [a.nombres, a.apellidoPaterno, a.apellidoMaterno].filter(Boolean).join(' ') : 'Aspirante',
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
            .filter((d) => d.catalogo.clave !== 'sip-02')
            .map((d) => ({ id: d.catalogo.clave, nombre: d.catalogo.nombre, archivo: todo ? (d.nombreArchivo ?? undefined) : undefined, estado: d.estado === 'APROBADO' ? 'aprobado' : d.estado === 'OBSERVADO' ? 'observado' : d.estado === 'PRORROGA' ? 'prorroga' : d.nombreArchivo ? 'pendiente' : 'falta', opcional: !d.catalogo.obligatorio }))
        : [],
      formatos: completo && p.documentos.some((d) => d.catalogo.clave === 'sip-02') ? { 'sip-02': true } : {},
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
              firmada: firmada ? { archivo: acta.firmadaArchivoNombre!, subidaPor: acta.firmadaSubidaPorId ?? '', el: acta.firmadaSubidaEn!.toISOString() } : undefined,
            }
          : undefined,
      dictamen:
        firmada && acta?.resolucion
          ? { resolucion: RESOLUCION[acta.resolucion], comentarios: [acta.observaciones, acta.motivo].filter((x) => x?.trim()).join(' · '), registradoEl: acta.firmadaSubidaEn!.toISOString() }
          : undefined,
    };
    return base;
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
    return lista.filter((p) => p.entrevista?.horarioPublicadoEn).map((p) => this.aFront(p, this.vistaProfesor(p, u.profesorId)));
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
    if (previa?.capturadaPor && previa.capturadaPor !== prof) throw new ConflictException('Otro profesor entrevistador ya llenó el acta');
    const resolucion = RESOLUCION_DB[d.resolucion];
    if (!resolucion) throw new BadRequestException('Resolución inválida');
    if (resolucion !== 'APROBADO' && !d.motivo?.trim()) throw new BadRequestException('Indica el motivo de la resolución');
    const data = { hoja1: d.hoja1 as Prisma.InputJsonValue, criterios: d.criterios as Prisma.InputJsonValue, proyeccion: d.proyeccion, observaciones: d.observaciones, resolucion, motivo: d.motivo, capturadaPor: prof, capturadaEn: new Date() };
    await this.prisma.actaEntrevista.upsert({ where: { entrevistaId: e.id }, create: { entrevistaId: e.id, ...data }, update: data });
    await this.bitacora(folio, u.nombre, `${previa?.capturadaPor ? 'Corrigió' : 'Llenó'} el acta de entrevista colegiada (MTC-EC); queda lista para imprimirse, firmarse y subirse`);
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
    if (u.area === 'PROFESORES' && this.vistaProfesor(p, u.profesorId) === 'profesor' && (clave === undefined || clave === 'sip-02')) return p;
    throw new ForbiddenException('No tienes acceso a los documentos de este aspirante');
  }
}
