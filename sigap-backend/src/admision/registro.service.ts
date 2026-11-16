import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { hash } from 'bcryptjs';
import type { UsuarioSesion } from '../auth/auth.guard';
import { temporal } from '../auth/usuarios.controller';
import { validarCurpCompleta } from '../comun/curp';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdmisionService } from './admision.service';
import { CATALOGO_EXPEDIENTE, convocatorias, hoyMexico, type ExpedienteAspirante } from './expediente';
import { idTemporal } from './id-temporal';

/** Bloqueo para que dos registros simultáneos no tomen el mismo folio. */
const BLOQUEO_FOLIO = 4208;
const txt = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/**
 * Registro en línea de aspirantes (convocatoria abierta). Crea su solicitud con un ID temporal (MTC-A2723) y su cuenta
 * sin contraseña utilizable: el Departamento de Posgrado genera la contraseña temporal y se la entrega.
 */
@Injectable()
export class RegistroService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adm: AdmisionService,
  ) {}

  async registrar(respuestas: Record<string, unknown>) {
    const r = Object.fromEntries(
      Object.entries(respuestas)
        .filter(([k]) => /^[\w-]{1,60}$/.test(k))
        .map(([k, v]) => [k, Array.isArray(v) ? v.map((x) => String(x).slice(0, 300)).slice(0, 20) : String(v ?? '').slice(0, 4000)]),
    ) as Record<string, string | string[]>;
    // Convocatoria elegida (A27 / B27) y que esté abierta hoy
    const semestre = txt(r.semestre);
    const m = /^([AB])(\d{2})/.exec(semestre);
    if (!m) throw new BadRequestException('Elige el semestre al que quieres ingresar');
    const [, id, anio] = m as unknown as [string, 'A' | 'B', string];
    const conv = convocatorias(await this.adm.almacenLeer('convocatorias'))[id];
    const hoy = hoyMexico();
    if (hoy < conv.inicio || hoy > conv.cierre) throw new ForbiddenException(`El registro de la ${conv.nombre} no está abierto.`);

    const nombres = txt(r.nombre);
    const apellidoPaterno = txt(r.apellidoPaterno);
    const apellidoMaterno = txt(r.apellidoMaterno);
    const curp = txt(r.curp).toUpperCase();
    const correo = txt(r.correo).toLowerCase();
    const telefono = txt(r.telefono).replace(/[\s-]/g, '');
    if (!nombres || !apellidoPaterno) throw new BadRequestException('Escribe tu nombre y tus apellidos');
    const errorCurp = validarCurpCompleta(curp, { nombre: nombres, apellidoPaterno, apellidoMaterno, genero: txt(r.genero) });
    if (errorCurp) throw new BadRequestException(errorCurp);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new BadRequestException('El correo no es válido');
    if (!/^\d{10}$/.test(telefono)) throw new BadRequestException('El teléfono debe tener 10 dígitos');
    if (await this.prisma.aspirante.findFirst({ where: { OR: [{ curp }, { correo }] } }))
      throw new ConflictException('Ya existe un registro con esa CURP o ese correo. Si ya te registraste, escribe al Departamento de Posgrado para recuperar tu acceso.');

    // Procedencia como la usa Posgrado: siglas de la unidad del IPN o nombre de la institución
    const unidadIpn = txt(r.unidadIpn);
    const procedencia = txt(r.institucion) === 'IPN' && unidadIpn && unidadIpn !== 'Otra unidad del IPN' ? unidadIpn.split(' — ')[0] : txt(r.unidadNombre) || txt(r.institucion);
    const registro = { ...r, procedencia, carrera: txt(r.ultimosEstudios), promedio: txt(r.promedio) };
    // Documentos que le aplican según lo que respondió
    const extranjero = txt(r.licPais) && !/^m[eé]xico$/i.test(txt(r.licPais));
    const claves = [
      r.titulado === 'No' ? 'constancia-titulacion' : 'titulo',
      'certificado',
      'ingles',
      'curp',
      'acta',
      'identificacion',
      ...(extranjero ? ['extranjero'] : []),
      'sip-02',
    ];
    const ahora = new Date();
    const expediente: ExpedienteAspirante = { enLinea: true, registradoEl: ahora.toISOString() };
    const nombreCompleto = [nombres, apellidoPaterno, apellidoMaterno].filter(Boolean).join(' ');

    let folio = '';
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(${BLOQUEO_FOLIO})::text`;
        // Folio consecutivo de la convocatoria: MTCA2723 (ID temporal MTC-A2723)
        const prefijo = `MTC${id}${anio}`;
        const previos = await tx.postulacion.findMany({ where: { folio: { startsWith: prefijo } }, select: { folio: true } });
        const max = Math.max(0, ...previos.map((p) => Number(p.folio.slice(prefijo.length))).filter((n) => Number.isInteger(n) && n < 900));
        folio = `${prefijo}${String(max + 1).padStart(2, '0')}`;
        const programa = (await tx.programa.findFirst({ where: { codigo: 'MTC' } })) ?? (await tx.programa.create({ data: { nombre: 'Maestría en Tecnología de Cómputo', codigo: 'MTC' } }));
        const clave = `${id}${anio}`;
        const convocatoria =
          (await tx.convocatoria.findFirst({ where: { clave } })) ??
          (await tx.convocatoria.create({ data: { clave, nombre: conv.nombre, fechaInicio: new Date(`${conv.inicio}T00:00:00-06:00`), fechaFin: new Date(`${conv.cierre}T23:59:59-06:00`), activa: true } }));
        const aspirante = await tx.aspirante.create({ data: { idTemporal: folio, nombres, apellidoPaterno, apellidoMaterno: apellidoMaterno || null, curp, correo, telefono } });
        const postulacion = await tx.postulacion.create({
          data: {
            folio,
            aspiranteId: aspirante.id,
            convocatoriaId: convocatoria.id,
            programaId: programa.id,
            estado: 'ENVIADA',
            enviadaEn: ahora,
            respuestasRegistro: registro as Prisma.InputJsonValue,
            expediente: expediente as Prisma.InputJsonValue,
          },
        });
        for (const c of claves) {
          const info = CATALOGO_EXPEDIENTE[c];
          const cat = await tx.catalogoDocumento.upsert({ where: { clave: c }, create: { clave: c, nombre: info.nombre, obligatorio: info.obligatorio }, update: {} });
          await tx.documentoPostulacion.create({ data: { postulacionId: postulacion.id, catalogoId: cat.id, estado: 'PENDIENTE' } });
        }
        // Cuenta sin contraseña utilizable: Posgrado le genera la temporal
        const usado = await tx.usuario.findUnique({ where: { correo } });
        const usuario = await tx.usuario.create({
          data: {
            nombre: nombreCompleto,
            correo: usado ? `${folio.toLowerCase()}@aspirante.sigap.local` : correo,
            identificadorAcceso: idTemporal(folio),
            hashContrasena: await hash(randomBytes(24).toString('base64url'), 10),
            debeCambiarContrasena: true,
            area: 'ASPIRANTES',
            aspiranteId: aspirante.id,
          },
        });
        await tx.notificacion.create({
          data: {
            usuarioId: usuario.id,
            tipo: 'SISTEMA',
            canal: 'NOTIFICACION_SIGAP',
            estado: 'ENVIADA',
            enviadaEn: ahora,
            titulo: 'Recibimos tu registro',
            mensaje: `Tu ID temporal es ${idTemporal(folio)}. Sube tus documentos en la sección Documentos; puedes continuar tu proceso aunque te falte alguno, pero todos se necesitan para tu inscripción.`,
          },
        });
        await tx.eventoBitacora.create({ data: { entidad: 'Postulacion', entidadId: folio, actor: nombreCompleto, accion: `Se registró en línea en la ${conv.nombre}` } });
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException('Ya existe un registro con esa CURP o ese correo. Si ya te registraste, escribe al Departamento de Posgrado.');
      throw e;
    }
    return { idTemporal: idTemporal(folio) };
  }

  // ---------- Accesos (Posgrado) ----------

  /** Aspirantes que se registraron en línea y aún no entran a SIGAP: Posgrado les genera su contraseña temporal. */
  async accesosPendientes() {
    const ps = await this.prisma.postulacion.findMany({ where: { expediente: { path: ['enLinea'], equals: true } }, include: { aspirante: { include: { usuario: true } } }, orderBy: { folio: 'asc' } });
    return ps
      .filter((p) => p.aspirante.usuario && !p.aspirante.usuario.ultimoAccesoEn)
      .map((p) => {
        const a = p.aspirante;
        const exp = (p.expediente ?? {}) as ExpedienteAspirante;
        return {
          folio: p.folio,
          idTemporal: idTemporal(p.folio),
          nombre: [a.nombres, a.apellidoPaterno, a.apellidoMaterno].filter(Boolean).join(' '),
          correo: a.correo,
          telefono: a.telefono ?? '',
          registradoEl: exp.registradoEl ?? p.creadoEn.toISOString(),
          accesoGeneradoEl: exp.accesoGeneradoEl ?? null,
        };
      });
  }

  /** Genera (o vuelve a generar) la contraseña temporal; solo de quienes aún no han entrado. Se muestra una sola vez. */
  async generarAccesos(folios: string[], u: UsuarioSesion) {
    const pendientes = new Map((await this.accesosPendientes()).map((p) => [p.folio, p]));
    const fuera = folios.filter((f) => !pendientes.has(f));
    if (fuera.length) throw new NotFoundException(`Estos aspirantes ya entraron a SIGAP o no se registraron en línea: ${fuera.map(idTemporal).join(', ')}. Si olvidaron su contraseña, la restablece el Administrador.`);
    const ahora = new Date().toISOString();
    const salida: { idTemporal: string; nombre: string; correo: string; telefono: string; contrasena: string }[] = [];
    for (const folio of folios) {
      const p = await this.prisma.postulacion.findUniqueOrThrow({ where: { folio }, include: { aspirante: { include: { usuario: true } } } });
      const cuenta = p.aspirante.usuario!;
      const t = temporal();
      await this.prisma.usuario.update({ where: { id: cuenta.id }, data: { hashContrasena: await hash(t, 12), debeCambiarContrasena: true, sesionesDesde: new Date() } });
      await this.prisma.postulacion.update({ where: { id: p.id }, data: { expediente: { ...((p.expediente ?? {}) as object), accesoGeneradoEl: ahora } } });
      const info = pendientes.get(folio)!;
      await this.adm.bitacora(folio, u.nombre, info.accesoGeneradoEl ? 'Generó una contraseña temporal nueva para el aspirante' : 'Generó la contraseña temporal del aspirante para que entre a SIGAP');
      salida.push({ idTemporal: info.idTemporal, nombre: info.nombre, correo: info.correo, telefono: info.telefono, contrasena: t });
    }
    return salida;
  }
}
