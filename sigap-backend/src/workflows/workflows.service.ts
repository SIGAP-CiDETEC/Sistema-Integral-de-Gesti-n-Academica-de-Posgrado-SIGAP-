import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AreaPersonal, EstadoPostulacion, Prisma, ResolucionColegio, TipoResultadoEvaluacion,
} from '../generated/prisma/client';
import type { UsuarioSesion } from '../auth/auth.guard';
import { guardarArchivo } from '../comun/almacen';
import { PrismaService } from '../prisma/prisma.service';

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
@Injectable()
export class WorkflowsService {
  constructor(private readonly prisma: PrismaService) {}

  private async postulacion(folio: string) {
    const p = await this.prisma.postulacion.findUnique({ where: { folio }, include: { aspirante: true, documentos: { include: { catalogo: true } } } });
    if (!p) throw new NotFoundException('No existe la postulación');
    return p;
  }
  private evento(entidad: string, entidadId: string, actor: string, accion: string, detalle?: Prisma.InputJsonValue) {
    return this.prisma.eventoBitacora.create({ data: { entidad, entidadId, actor, accion, detalle } });
  }

  async registrar(d: any) {
    const [convocatoria, programa] = await Promise.all([
      this.prisma.convocatoria.findUnique({ where: { id: d.convocatoriaId } }),
      this.prisma.programa.findUnique({ where: { id: d.programaId } }),
    ]);
    if (!convocatoria || !programa) throw new NotFoundException('Convocatoria o programa no encontrado');
    if (!convocatoria.activa || new Date() < convocatoria.fechaInicio || new Date() > convocatoria.fechaFin) throw new BadRequestException('La convocatoria no está abierta');
    const correo = String(d.correo).trim().toLowerCase();
    const aspiranteExistente = await this.prisma.aspirante.findFirst({ where: { OR: [{ correo }, ...(d.curp ? [{ curp: String(d.curp).trim().toUpperCase() }] : [])] } });
    if (aspiranteExistente && await this.prisma.postulacion.findFirst({ where: { aspiranteId: aspiranteExistente.id, convocatoriaId: convocatoria.id } })) throw new ConflictException('Ya existe una postulación de esta persona para la convocatoria');
    const folio = `SIGAP-${new Date().getFullYear()}-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
    return this.prisma.$transaction(async tx => {
      const aspirante = aspiranteExistente ?? await tx.aspirante.create({ data: {
        nombres: d.nombres.trim(), apellidoPaterno: d.apellidoPaterno.trim(), apellidoMaterno: d.apellidoMaterno?.trim() || null,
        curp: d.curp?.trim().toUpperCase() || null, correo, telefono: d.telefono?.trim() || null,
      } });
      const p = await tx.postulacion.create({ data: {
        folio, aspiranteId: aspirante.id, convocatoriaId: convocatoria.id, programaId: programa.id,
        estado: 'BORRADOR', respuestasRegistro: d.respuestasRegistro as Prisma.InputJsonValue,
      }, include: { aspirante: true, convocatoria: true, programa: true } });
      await tx.eventoBitacora.create({ data: { entidad: 'Postulacion', entidadId: folio, actor: 'registro-publico', accion: 'Creó una postulación' } });
      return { folio: p.folio, estado: p.estado, aspirante: { nombres: aspirante.nombres, correo: aspirante.correo }, convocatoria: p.convocatoria.nombre, programa: p.programa.nombre };
    });
  }

  async subirDocumento(folio: string, clave: string, file: Express.Multer.File | undefined, u: UsuarioSesion) {
    if (!file) throw new BadRequestException('Debes adjuntar un archivo');
    if (file.mimetype !== 'application/pdf' && !['image/jpeg', 'image/png'].includes(file.mimetype)) throw new BadRequestException('Solo se acepta PDF, JPG o PNG');
    const p = await this.postulacion(folio);
    if (u.area === AreaPersonal.ASPIRANTES && p.aspiranteId !== (await this.prisma.usuario.findUnique({ where: { id: u.id } }))?.aspiranteId) throw new NotFoundException('No existe la postulación');
    if (![AreaPersonal.ASPIRANTES, AreaPersonal.POSGRADO, AreaPersonal.SUBDIRECCION].includes(u.area)) throw new BadRequestException('Tu perfil no puede cargar documentos');
    const catalogo = await this.prisma.catalogoDocumento.findUnique({ where: { clave } });
    if (!catalogo) throw new NotFoundException('Clave de documento desconocida');
    const ruta = `postulaciones/${p.id}/documentos/${slug(clave)}-${Date.now()}-${slug(file.originalname)}`;
    guardarArchivo(ruta, file.buffer);
    const documento = await this.prisma.documentoPostulacion.upsert({
      where: { postulacionId_catalogoId: { postulacionId: p.id, catalogoId: catalogo.id } },
      create: { postulacionId: p.id, catalogoId: catalogo.id, nombreArchivo: file.originalname, urlArchivo: ruta, tipoMime: file.mimetype, tamanoBytes: file.size, estado: 'PENDIENTE', observacion: null },
      update: { nombreArchivo: file.originalname, urlArchivo: ruta, tipoMime: file.mimetype, tamanoBytes: file.size, estado: 'PENDIENTE', observacion: null, prorrogaHasta: null },
    });
    await this.evento('DocumentoPostulacion', documento.id, u.nombre, 'Cargó o reemplazó un documento', { folio, clave } as Prisma.InputJsonValue);
    return { id: documento.id, clave, nombreArchivo: documento.nombreArchivo, estado: documento.estado };
  }

  async revisarDocumento(folio: string, clave: string, d: any, u: UsuarioSesion) {
    const p = await this.postulacion(folio);
    const doc = p.documentos.find(x => x.catalogo.clave === clave);
    if (!doc) throw new NotFoundException('Documento no encontrado');
    if (!doc.urlArchivo && d.estado !== 'PRORROGA') throw new BadRequestException('No se puede revisar un documento que aún no se ha cargado');
    if (d.estado === 'PRORROGA' && !d.prorrogaHasta) throw new BadRequestException('Indica la fecha límite de la prórroga');
    const prorrogaHasta = d.prorrogaHasta ? new Date(d.prorrogaHasta) : null;
    const updated = await this.prisma.$transaction(async tx => {
      const res = await tx.documentoPostulacion.update({ where: { id: doc.id }, data: { estado: d.estado, observacion: d.observaciones ?? null, prorrogaHasta } });
      await tx.revisionDocumento.create({ data: { documentoId: doc.id, postulacionId: p.id, revisor: u.id, estado: d.estado, observaciones: d.observaciones ?? null } });
      await tx.eventoBitacora.create({ data: { entidad: 'DocumentoPostulacion', entidadId: doc.id, actor: u.nombre, accion: `Revisó documento: ${d.estado}`, detalle: { folio, clave } } });
      return res;
    });
    return { id: updated.id, clave, estado: updated.estado, observaciones: updated.observacion, prorrogaHasta: updated.prorrogaHasta };
  }

  async enviarRevision(folio: string, u: UsuarioSesion) {
    const p = await this.postulacion(folio);
    const docs = await this.prisma.catalogoDocumento.findMany({ where: { obligatorio: true } });
    const faltantes = docs.filter(c => !p.documentos.some(d => d.catalogoId === c.id && d.urlArchivo));
    if (faltantes.length) throw new BadRequestException({ message: 'Faltan documentos obligatorios', faltantes: faltantes.map(x => x.clave) });
    const actualizada = await this.prisma.postulacion.update({ where: { id: p.id }, data: { estado: 'ENVIADA', enviadaEn: new Date() } });
    await this.evento('Postulacion', p.folio, u.nombre, 'Envió expediente a revisión');
    return { folio: actualizada.folio, estado: actualizada.estado, enviadaEn: actualizada.enviadaEn };
  }

  async obtenerConfiguracion(convocatoriaId: string) {
    const c = await this.prisma.configuracionEvaluacion.findUnique({ where: { convocatoriaId }, include: { materias: { include: { grupos: { include: { sesiones: true, docente: true } } } } } });
    if (!c) throw new NotFoundException('La convocatoria aún no tiene configuración de evaluación');
    return c;
  }

  async guardarConfiguracion(id: string, d: any, u: UsuarioSesion) {
    if (new Date(d.finPropedeutico) < new Date(d.inicioPropedeutico)) throw new BadRequestException('El fin del propedéutico debe ser posterior al inicio');
    if (!Array.isArray(d.materias) || !d.materias.length) throw new BadRequestException('Configura al menos una materia');
    if (d.materias.some((m: any) => !m.clave || !m.nombre)) throw new BadRequestException('Cada materia requiere clave y nombre');
    const convocatoria = await this.prisma.convocatoria.findUnique({ where: { id } });
    if (!convocatoria) throw new NotFoundException('Convocatoria no encontrada');
    const config = await this.prisma.$transaction(async tx => {
      const c = await tx.configuracionEvaluacion.upsert({
        where: { convocatoriaId: id },
        create: { convocatoriaId: id, inicioPropedeutico: new Date(d.inicioPropedeutico), finPropedeutico: new Date(d.finPropedeutico), modalidadCurso: d.modalidadCurso, duracionPropedeutico: d.duracionPropedeutico, fechaExamen: new Date(d.fechaExamen), horaExamen: d.horaExamen, lugarExamen: d.lugarExamen, calificacionMinima: d.calificacionMinima },
        update: { inicioPropedeutico: new Date(d.inicioPropedeutico), finPropedeutico: new Date(d.finPropedeutico), modalidadCurso: d.modalidadCurso, duracionPropedeutico: d.duracionPropedeutico, fechaExamen: new Date(d.fechaExamen), horaExamen: d.horaExamen, lugarExamen: d.lugarExamen, calificacionMinima: d.calificacionMinima },
      });
      for (const m of d.materias) await tx.materiaPropedeutica.upsert({ where: { configuracionId_clave: { configuracionId: c.id, clave: m.clave } }, create: { configuracionId: c.id, clave: m.clave, nombre: m.nombre }, update: { nombre: m.nombre } });
      await tx.eventoBitacora.create({ data: { entidad: 'ConfiguracionEvaluacion', entidadId: c.id, actor: u.nombre, accion: 'Actualizó configuración de evaluación' } });
      return c;
    });
    return this.obtenerConfiguracion(config.convocatoriaId);
  }

  async crearGrupo(d: any, u: UsuarioSesion) {
    const materia = await this.prisma.materiaPropedeutica.findUnique({ where: { id: d.materiaId } });
    if (!materia) throw new NotFoundException('Materia propedéutica no encontrada');
    if (d.docenteId && !await this.prisma.profesor.findUnique({ where: { id: d.docenteId } })) throw new NotFoundException('Docente no encontrado');
    const g = await this.prisma.$transaction(async tx => {
      const grupo = await tx.grupoPropedeutico.create({ data: { materiaId: d.materiaId, clave: d.clave, lugar: d.lugar ?? null, docenteId: d.docenteId ?? null } });
      if (d.sesiones?.length) await tx.sesionGrupo.createMany({ data: d.sesiones.map((s: any) => ({ grupoId: grupo.id, dia: s.dia, inicio: s.inicio, fin: s.fin })) });
      await tx.eventoBitacora.create({ data: { entidad: 'GrupoPropedeutico', entidadId: grupo.id, actor: u.nombre, accion: 'Creó grupo propedéutico' } });
      return grupo;
    });
    return this.prisma.grupoPropedeutico.findUnique({ where: { id: g.id }, include: { materia: true, docente: true, sesiones: true } });
  }

  async guardarCalificacion(folio: string, d: any, u: UsuarioSesion) {
    const p = await this.prisma.postulacion.findUnique({ where: { folio } });
    if (!p) throw new NotFoundException('Postulación no encontrada');
    const resultado = await this.prisma.resultadoEvaluacion.upsert({
      where: { postulacionId_tipo: { postulacionId: p.id, tipo: d.tipo } },
      create: { postulacionId: p.id, tipo: d.tipo, calificacion: d.calificacion, acreditado: d.acreditado, registradoEn: new Date() },
      update: { calificacion: d.calificacion, acreditado: d.acreditado, registradoEn: new Date(), publicadoEn: null },
    });
    if (d.areas) {
      for (const [area, value] of Object.entries(d.areas) as [string, any][]) {
        await this.prisma.calificacionArea.upsert({
          where: { resultadoId_area: { resultadoId: resultado.id, area: area as any } },
          create: { resultadoId: resultado.id, area: area as any, calificacion: value.calificacion, acreditado: value.acreditado, profesorId: value.profesorId ?? null },
          update: { calificacion: value.calificacion, acreditado: value.acreditado, profesorId: value.profesorId ?? null, capturadaEn: new Date() },
        });
      }
    }
    await this.evento('ResultadoEvaluacion', resultado.id, u.nombre, 'Capturó o actualizó calificación', { folio, tipo: d.tipo } as Prisma.InputJsonValue);
    return this.prisma.resultadoEvaluacion.findUnique({ where: { id: resultado.id }, include: { areas: true } });
  }

  async publicarResultados(tipo: TipoResultadoEvaluacion, u: UsuarioSesion) {
    if (!Object.values(TipoResultadoEvaluacion).includes(tipo)) throw new BadRequestException('Tipo de evaluación inválido');
    const now = new Date();
    const res = await this.prisma.resultadoEvaluacion.updateMany({ where: { tipo, publicadoEn: null, registradoEn: { not: null } }, data: { publicadoEn: now } });
    await this.evento('ResultadoEvaluacion', tipo, u.nombre, `Publicó ${res.count} resultados de ${tipo}`);
    return { tipo, publicados: res.count, publicadoEn: now };
  }

  async dictamen(folio: string, d: any, u: UsuarioSesion) {
    const p = await this.postulacion(folio);
    if (!['ESPERANDO_RESOLUCION', 'EN_EVALUACION', 'ADMITIDA', 'NO_ADMITIDA'].includes(p.estado)) throw new BadRequestException('La postulación no está en etapa de dictamen');
    const row = await this.prisma.registroResolucionColegio.upsert({
      where: { postulacionId: p.id },
      create: { postulacionId: p.id, resolucion: d.resolucion, fechaSesion: d.fechaSesion ? new Date(d.fechaSesion) : null, numeroSesion: d.numeroSesion ?? null, registradaPor: u.id, publicadaEn: null },
      update: { resolucion: d.resolucion, fechaSesion: d.fechaSesion ? new Date(d.fechaSesion) : null, numeroSesion: d.numeroSesion ?? null, registradaPor: u.id, publicadaEn: null },
    });
    await this.prisma.postulacion.update({ where: { id: p.id }, data: { estado: d.resolucion === ResolucionColegio.NO_ACEPTADO ? EstadoPostulacion.NO_ADMITIDA : EstadoPostulacion.ADMITIDA } });
    await this.evento('RegistroResolucionColegio', row.id, u.nombre, 'Registró dictamen del Colegio', { folio, resolucion: d.resolucion } as Prisma.InputJsonValue);
    return row;
  }

  async inscripcion(folio: string, d: any, u: UsuarioSesion) {
    const p = await this.prisma.postulacion.findUnique({ where: { folio }, include: { resolucionColegio: true, inscripcion: true } });
    if (!p) throw new NotFoundException('Postulación no encontrada');
    if (p.resolucionColegio?.resolucion === 'NO_ACEPTADO' || (!p.resolucionColegio && p.estado !== 'ADMITIDA')) throw new BadRequestException('Solo puede formalizarse una postulación aceptada por el Colegio');
    const firmas = d.firmas ?? {};
    const data = {
      ...(d.dedicacion !== undefined ? { dedicacion: d.dedicacion } : {}),
      ...(d.fotoRecibida !== undefined ? { fotoRecibida: d.fotoRecibida } : {}),
      ...(d.sicep !== undefined ? { sicep: d.sicep } : {}),
      ...(firmas.sip01 ? { sip01FirmadoEn: new Date() } : {}),
      ...(firmas.sip04 ? { sip04FirmadoEn: new Date() } : {}),
      ...(firmas.sip05 ? { sip05FirmadoEn: new Date() } : {}),
      ...(firmas.sip06 ? { sip06FirmadoEn: new Date() } : {}),
      ...(firmas.sip08 ? { sip08FirmadoEn: new Date() } : {}),
      ...(d.formalizar ? { formalizadaEn: new Date() } : {}),
    };
    if (d.formalizar && (!d.sicep || !d.fotoRecibida || !firmas.sip01 || !firmas.sip04 || !firmas.sip05 || !firmas.sip06 || !firmas.sip08)) throw new BadRequestException('Para formalizar, completa SICEP, fotografía y firmas SIP-01/04/05/06/08');
    const ins = await this.prisma.inscripcion.upsert({ where: { postulacionId: p.id }, create: { postulacionId: p.id, ...data }, update: data, include: { documentosFirmados: true } });
    await this.evento('Inscripcion', ins.id, u.nombre, d.formalizar ? 'Formalizó inscripción' : 'Actualizó expediente de inscripción', { folio } as Prisma.InputJsonValue);
    return ins;
  }

  async subirSip12(grupoId: string, folio: string, file: Express.Multer.File | undefined, u: UsuarioSesion) {
    if (!file || file.mimetype !== 'application/pdf') throw new BadRequestException('Adjunta el acta SIP-12 en PDF');
    const p = await this.prisma.postulacion.findUnique({ where: { folio } });
    const grupo = await this.prisma.grupoPropedeutico.findUnique({ where: { id: grupoId }, include: { materia: true } });
    if (!p || !grupo) throw new NotFoundException('Postulación o grupo no encontrado');
    if (u.area === AreaPersonal.PROFESORES && grupo.docenteId !== u.profesorId) throw new BadRequestException('Solo el docente asignado al grupo puede cargar el SIP-12');
    const catalogo = await this.prisma.catalogoFormato.upsert({
      where: { clave: 'SIP12' },
      create: { clave: 'SIP12', codigo: 'SIP-12', nombre: 'Acta de calificaciones del curso propedéutico', fase: 'evaluacion', llenaPor: 'profesor/coordinador', destino: 'posgrado', activo: true },
      update: {},
    });
    const ruta = `sip12/${grupo.id}/${p.folio}-${Date.now()}-${slug(file.originalname)}`;
    guardarArchivo(ruta, file.buffer);
    const capturas = { grupoId, nombreArchivo: file.originalname, etapa: u.area === AreaPersonal.PROFESORES ? 'docente' : 'coordinacion' };
    const formato = await this.prisma.formatoPostulacion.upsert({
      where: { postulacionId_catalogoFormatoId: { postulacionId: p.id, catalogoFormatoId: catalogo.id } },
      create: { postulacionId: p.id, catalogoFormatoId: catalogo.id, estado: 'PENDIENTE_FIRMA', urlPdfFirmado: ruta, subidoEn: new Date(), capturas },
      update: { estado: 'PENDIENTE_FIRMA', urlPdfFirmado: ruta, subidoEn: new Date(), capturas },
    });
    await this.evento('FormatoPostulacion', formato.id, u.nombre, 'Cargó acta SIP-12', { folio, grupoId } as Prisma.InputJsonValue);
    return { id: formato.id, folio, grupoId, estado: formato.estado, nombreArchivo: file.originalname };
  }

  async roles() {
    return this.prisma.rol.findMany({ include: { permisos: { include: { permiso: true } }, _count: { select: { usuarios: true } } }, orderBy: { nombre: 'asc' } });
  }
  async crearRol(d: any) {
    const nombre = d.nombre.trim();
    if (await this.prisma.rol.findUnique({ where: { nombre } })) throw new ConflictException('Ya existe un rol con ese nombre');
    return this.prisma.$transaction(async tx => {
      const rol = await tx.rol.create({ data: { nombre, descripcion: d.descripcion ?? null } });
      await this.asignarPermisos(tx, rol.id, d.permisos ?? []);
      return tx.rol.findUnique({ where: { id: rol.id }, include: { permisos: { include: { permiso: true } } } });
    });
  }
  async actualizarRol(id: string, d: any) {
    const actual = await this.prisma.rol.findUnique({ where: { id } });
    if (!actual) throw new NotFoundException('Rol no encontrado');
    if (actual.esBase) throw new BadRequestException('No se pueden editar roles base desde esta operación');
    return this.prisma.$transaction(async tx => {
      await tx.rol.update({ where: { id }, data: { nombre: d.nombre.trim(), descripcion: d.descripcion ?? null } });
      if (d.permisos) {
        await tx.rolPermiso.deleteMany({ where: { rolId: id } });
        await this.asignarPermisos(tx, id, d.permisos);
      }
      return tx.rol.findUnique({ where: { id }, include: { permisos: { include: { permiso: true } } } });
    });
  }
  private async asignarPermisos(tx: Prisma.TransactionClient, rolId: string, claves: string[]) {
    for (const clave of [...new Set(claves)]) {
      const permiso = await tx.permiso.findUnique({ where: { clave } });
      if (!permiso) throw new NotFoundException(`Permiso no encontrado: ${clave}`);
      await tx.rolPermiso.create({ data: { rolId, permisoId: permiso.id } });
    }
  }

  async avisos(u: UsuarioSesion) {
    const now = new Date();
    return this.prisma.aviso.findMany({ where: { activo: true, AND: [{ OR: [{ iniciaEn: null }, { iniciaEn: { lte: now } }] }, { OR: [{ terminaEn: null }, { terminaEn: { gte: now } }] }], OR: [{ publico: true }, { areaDestinataria: u.area }] }, orderBy: [{ publicadoEn: 'desc' }, { creadoEn: 'desc' }] });
  }
  async crearAviso(d: any, u: UsuarioSesion) {
    return this.prisma.aviso.create({ data: { titulo: d.titulo.trim(), mensaje: d.mensaje.trim(), publico: d.publico ?? false, areaDestinataria: d.areaDestinataria ?? null, iniciaEn: d.iniciaEn ? new Date(d.iniciaEn) : null, terminaEn: d.terminaEn ? new Date(d.terminaEn) : null, publicadoEn: new Date(), creadoPorId: u.id } });
  }
  async crearComunicado(d: any, u: UsuarioSesion) {
    return this.prisma.comunicado.create({ data: { titulo: d.titulo.trim(), contenido: d.contenido.trim(), publico: d.publico ?? false, areaDestinataria: d.areaDestinataria ?? null, creadoPorId: u.id } });
  }
  async publicarComunicado(id: string) {
    const c = await this.prisma.comunicado.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Comunicado no encontrado');
    return this.prisma.comunicado.update({ where: { id }, data: { publicadoEn: new Date() } });
  }

  // Solución transitoria: persiste claves/valores en registros internos no visibles de Aviso.
  async contenido() {
    const rows = await this.prisma.aviso.findMany({ where: { titulo: { startsWith: '[CONTENIDO] ' } }, orderBy: { actualizadoEn: 'desc' } });
    return rows.map(r => ({ clave: r.titulo.slice(12), valor: this.parseContenido(r.mensaje), actualizadoEn: r.actualizadoEn }));
  }
  async guardarContenido(clave: string, valor: unknown) {
    if (!/^[a-z0-9][a-z0-9._-]{1,79}$/i.test(clave)) throw new BadRequestException('Clave de contenido inválida');
    const mensaje = JSON.stringify(valor);
    if (mensaje.length > 20000) throw new BadRequestException('El contenido supera el límite de 20 KB');
    const titulo = `[CONTENIDO] ${clave}`;
    const prev = await this.prisma.aviso.findFirst({ where: { titulo }, orderBy: { actualizadoEn: 'desc' } });
    if (prev) return this.prisma.aviso.update({ where: { id: prev.id }, data: { mensaje, activo: false, publico: false } });
    return this.prisma.aviso.create({ data: { titulo, mensaje, activo: false, publico: false } });
  }
  private parseContenido(v: string): unknown { try { return JSON.parse(v); } catch { return v; } }
}
