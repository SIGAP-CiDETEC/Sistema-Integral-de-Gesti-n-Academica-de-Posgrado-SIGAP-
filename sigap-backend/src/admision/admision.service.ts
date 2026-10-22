import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AreaPersonal, EstadoPostulacion, ModalidadEntrevista, Prisma, ResolucionEntrevista } from '../generated/prisma/client';
import type { UsuarioSesion } from '../auth/auth.guard';
import { guardarArchivo } from '../comun/almacen';
import { aFechaHora, deFechaHora } from '../comun/fechas';
import { PrismaService } from '../prisma/prisma.service';

/** Profesores que integran cada entrevista colegiada. */
export const LUGARES = 3;

const RESOLUCION: Record<ResolucionEntrevista, string> = { APROBADO: 'Aprobado', CON_RESERVAS: 'Con reservas', RECHAZADO: 'Rechazado' };
const RESOLUCION_DB: Record<string, ResolucionEntrevista> = { Aprobado: 'APROBADO', 'Con reservas': 'CON_RESERVAS', Rechazado: 'RECHAZADO' };
const MODALIDAD: Record<ModalidadEntrevista, string> = { PRESENCIAL: 'Presencial', EN_LINEA: 'En línea' };

const conTodo = {
  aspirante: true,
  documentos: { include: { catalogo: true } },
  entrevista: { include: { sinodo: { orderBy: { elegidoEn: 'asc' } }, acta: true } },
} satisfies Prisma.PostulacionInclude;
type PostulacionCompleta = Prisma.PostulacionGetPayload<{ include: typeof conTodo }>;

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
  private aFront(p: PostulacionCompleta, completo: boolean) {
    const r = (p.respuestasRegistro ?? {}) as Record<string, string>;
    const a = p.aspirante;
    const e = p.entrevista;
    const acta = e?.acta;
    const firmada = acta?.firmadaSubidaEn && acta.firmadaArchivoNombre;
    const ultimo = [p.actualizadoEn, e?.actualizadoEn, acta?.actualizadoEn].filter(Boolean).sort((x, y) => +y! - +x!)[0] ?? p.actualizadoEn;
    const base = {
      id: p.folio,
      nombre: completo ? [a.nombres, a.apellidoPaterno, a.apellidoMaterno].filter(Boolean).join(' ') : 'Aspirante',
      curp: completo ? (a.curp ?? '') : '',
      correo: completo && !a.correo.endsWith('@sin-correo.sigap.local') ? a.correo : '',
      telefono: completo ? (a.telefono ?? '') : '',
      procedencia: completo ? (r.procedencia ?? '') : '',
      promedio: completo ? (r.promedio ?? '') : '',
      registradoEl: (p.enviadaEn ?? p.creadoEn).toISOString(),
      ultimoMovimiento: ultimo.toISOString(),
      etapa: etapaDe(p.estado),
      concluido: p.estado === 'RECHAZADA' ? 'Rechazado en la entrevista colegiada' : undefined,
      documentos: completo
        ? p.documentos
            .filter((d) => d.catalogo.clave !== 'sip-02')
            .map((d) => ({ id: d.catalogo.clave, nombre: d.catalogo.nombre, archivo: d.nombreArchivo ?? undefined, estado: d.estado === 'APROBADO' ? 'aprobado' : d.estado === 'OBSERVADO' ? 'observado' : d.estado === 'PRORROGA' ? 'prorroga' : d.nombreArchivo ? 'pendiente' : 'falta', opcional: !d.catalogo.obligatorio }))
        : [],
      formatos: completo && p.documentos.some((d) => d.catalogo.clave === 'sip-02') ? { 'sip-02': true } : {},
      evaluacion: { grupos: {} },
      entrevista: e
        ? {
            ...deFechaHora(e.fechaHora),
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
   * - Profesores: solo las entrevistas cuyo horario ya se publicó; los datos del aspirante solo si integran su entrevista.
   */
  async listar(u: UsuarioSesion) {
    const lista = await this.prisma.postulacion.findMany({ include: conTodo, orderBy: { folio: 'asc' } });
    if (u.area !== 'PROFESORES') return lista.map((p) => this.aFront(p, true));
    return lista.filter((p) => p.entrevista?.horarioPublicadoEn).map((p) => this.aFront(p, !!p.entrevista?.sinodo.some((s) => s.profesorId === u.profesorId)));
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
  async guardarHorario(folio: string, d: { fecha: string; hora: string; modalidad: string; sala: string }, u: UsuarioSesion) {
    const p = await this.postulacion(folio);
    if (p.entrevista?.acta?.capturadaPor) throw new ConflictException('La entrevista ya tiene acta; no se puede cambiar el horario');
    const fechaHora = aFechaHora(d.fecha, d.hora);
    if (Number.isNaN(+fechaHora)) throw new BadRequestException('Fecha u hora inválida');
    const modalidad: ModalidadEntrevista = d.modalidad === 'En línea' ? 'EN_LINEA' : 'PRESENCIAL';
    // Choques: algún profesor del grupo ya tiene otra entrevista a esa hora
    const miembros = p.entrevista?.sinodo.map((s) => s.profesorId) ?? [];
    if (miembros.length) {
      const choque = await this.prisma.integranteSinodo.findFirst({ where: { profesorId: { in: miembros }, entrevista: { fechaHora, postulacionId: { not: p.id } } } });
      if (choque) throw new ConflictException('Un profesor entrevistador ya tiene otra entrevista a esa fecha y hora');
    }
    const cambio = p.entrevista && (+p.entrevista.fechaHora !== +fechaHora || p.entrevista.sala !== d.sala || p.entrevista.modalidad !== modalidad);
    await this.prisma.entrevista.upsert({
      where: { postulacionId: p.id },
      create: { postulacionId: p.id, fechaHora, modalidad, sala: d.sala },
      update: { fechaHora, modalidad, sala: d.sala },
    });
    if (p.estado === 'VALIDADA') await this.prisma.postulacion.update({ where: { id: p.id }, data: { estado: 'ENTREVISTA_PROGRAMADA' } });
    await this.bitacora(folio, u.nombre, `${p.entrevista ? (cambio ? 'Actualizó' : 'Guardó') : 'Programó'} el horario de entrevista: ${d.fecha} ${d.hora} h · ${d.modalidad} · ${d.sala}`);
    return this.aFront(await this.postulacion(folio), true);
  }

  async publicarHorario(folio: string, u: UsuarioSesion) {
    const p = await this.postulacion(folio);
    if (!p.entrevista) throw new BadRequestException('Primero captura el horario');
    if (p.entrevista.horarioPublicadoEn) return this.aFront(p, true);
    await this.prisma.entrevista.update({ where: { id: p.entrevista.id }, data: { horarioPublicadoEn: new Date() } });
    const { fecha, hora } = deFechaHora(p.entrevista.fechaHora);
    await this.bitacora(folio, u.nombre, `Publicó el horario de entrevista ${fecha} ${hora} h para que los profesores lo elijan`);
    return this.aFront(await this.postulacion(folio), true);
  }

  async publicarEntrevista(folio: string, u: UsuarioSesion) {
    const p = await this.postulacion(folio);
    const e = p.entrevista;
    if (!e?.horarioPublicadoEn) throw new BadRequestException('Primero publica el horario a los profesores');
    if (e.sinodo.length < LUGARES) throw new BadRequestException(`Faltan profesores entrevistadores (${e.sinodo.length} de ${LUGARES})`);
    if (e.publicadaAspiranteEn) return this.aFront(p, true);
    await this.prisma.entrevista.update({ where: { id: e.id }, data: { publicadaAspiranteEn: new Date() } });
    const nombres = await this.prisma.profesor.findMany({ where: { id: { in: e.sinodo.map((s) => s.profesorId) } } });
    const { fecha, hora } = deFechaHora(e.fechaHora);
    await this.bitacora(folio, u.nombre, `Publicó la entrevista al aspirante: ${fecha} ${hora} h · ${MODALIDAD[e.modalidad]} · ${e.sala}; profesores entrevistadores: ${nombres.map((n) => n.nombre).join(', ')}`);
    return this.aFront(await this.postulacion(folio), true);
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
        const choque = await tx.integranteSinodo.findFirst({ where: { profesorId: prof, entrevista: { fechaHora: e.fechaHora } } });
        if (choque) throw new ConflictException('Ya tienes otra entrevista a esa hora');
        await tx.integranteSinodo.create({ data: { entrevistaId: e.id, profesorId: prof } });
        const { fecha, hora } = deFechaHora(e.fechaHora);
        const n = e.sinodo.length + 1;
        await tx.eventoBitacora.create({ data: { entidad: 'Postulacion', entidadId: folio, actor: u.nombre, accion: `Eligió la entrevista del ${fecha} a las ${hora} h · profesores entrevistadores ${n} de ${LUGARES}${n === LUGARES ? ' (completo)' : ''}` } });
      },
      { isolationLevel: 'Serializable' },
    );
    return this.aFront(await this.postulacion(folio), true);
  }

  async dejar(folio: string, u: UsuarioSesion) {
    const prof = this.profesorDe(u);
    const p = await this.postulacion(folio);
    const e = p.entrevista;
    if (!e?.sinodo.some((s) => s.profesorId === prof)) throw new BadRequestException('No formas parte de esa entrevista');
    if (e.publicadaAspiranteEn || e.acta?.capturadaPor) throw new ConflictException('La entrevista ya se publicó al aspirante; pide a Posgrado el cambio');
    await this.prisma.integranteSinodo.delete({ where: { entrevistaId_profesorId: { entrevistaId: e.id, profesorId: prof } } });
    const { fecha, hora } = deFechaHora(e.fechaHora);
    await this.bitacora(folio, u.nombre, `Dejó su lugar en la entrevista del ${fecha} a las ${hora} h · profesores entrevistadores ${e.sinodo.length - 1} de ${LUGARES}`);
    return this.aFront(await this.postulacion(folio), false);
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
    return this.aFront(await this.postulacion(folio), true);
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
    return this.aFront(await this.postulacion(folio), true);
  }

  // ---------- Archivos ----------

  /** Comprueba que la cuenta pueda ver los archivos de ese aspirante. */
  async puedeVerArchivos(folio: string, u: UsuarioSesion) {
    const p = await this.postulacion(folio);
    if (u.area === 'POSGRADO' || u.area === 'SUBDIRECCION') return p;
    if (u.area === 'PROFESORES' && u.profesorId && p.entrevista?.sinodo.some((s) => s.profesorId === u.profesorId)) return p;
    throw new ForbiddenException('No tienes acceso a los documentos de este aspirante');
  }
}
