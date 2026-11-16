import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { UsuarioSesion } from '../auth/auth.guard';
import { guardarArchivo } from '../comun/almacen';
import { validarCurpCompleta } from '../comun/curp';
import { deFechaHora } from '../comun/fechas';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdmisionService } from './admision.service';
import { CATALOGO_EXPEDIENTE, DOCUMENTOS_EXPEDIENTE, convocatorias, esPdf, estadoParaAspirante, puedeSubir, type ExpedienteAspirante } from './expediente';
import { idTemporal } from './id-temporal';

type AvisoAlmacen = { id?: string; fecha?: string; aspirante?: string; canal?: string; asunto?: string; mensaje?: string };
type ComunicadoAlmacen = { id?: string; fecha?: string; asunto?: string; cuerpo?: string; destinatarios?: string[]; adjuntos?: string[] };
export type DatosAspirante = { nombres: string; apellidoPaterno: string; apellidoMaterno: string; curp: string; correo: string; telefono: string; procedencia: string; carrera: string; promedio: string };
const ORDEN = ['registro', 'documentos', 'entrevista', 'evaluacion', 'dictamen'];
const MODALIDAD_TXT: Record<string, string> = { PRESENCIAL: 'Presencial', EN_LINEA: 'En línea' };

type Sesion = { dia: string; inicio: string; fin: string };
type Grupo = { id: string; sesiones?: Sesion[]; lugar?: string; docente?: string; cupo?: number; sala?: string };
type Materia = { id: string; nombre?: string; grupos: Grupo[] };
type Config = { propedeutico?: Record<string, string>; examen?: Record<string, string>; materias?: Materia[] };
type Resultado = { calificacion?: number; acreditado?: boolean; publicadoEl?: string; areas?: Record<string, { acreditado?: boolean }> };
type Evaluacion = { modalidad?: string; grupos?: Record<string, string>; confirmadaEl?: string; propedeutico?: Resultado; examen?: Resultado; [k: string]: unknown };
/** Solo lo que Posgrado ya publicó: si acreditó y, por área, si la acreditó (sin calificaciones ni datos de captura). */
const publicado = (r?: Resultado) =>
  r?.publicadoEl
    ? {
        acreditado: !!r.acreditado,
        publicadoEl: r.publicadoEl,
        areas: Object.fromEntries(Object.entries(r.areas ?? {}).map(([k, v]) => [k, { acreditado: !!v?.acreditado }])),
      }
    : null;
// Registrada por el aspirante (confirmadaEl) o por Posgrado ya en la evaluación o después (dictamen)
const yaElegida = (ev: Evaluacion, etapa: string) => !!ev.modalidad && (!!ev.confirmadaEl || etapa === 'evaluacion' || etapa === 'dictamen');
const clave = (m: string, g: string) => `${m}|${g}`;
/** Bloqueo para que dos aspirantes no tomen al mismo tiempo el último lugar de un grupo. */
const BLOQUEO_CUPO = 4207;
const ETAPA_EVALUACION: string[] = ['EN_EVALUACION', 'ESPERANDO_RESOLUCION', 'ADMITIDA', 'NO_ADMITIDA', 'CONCLUIDA'];

/**
 * Portal del aspirante con el servidor real (primera etapa): el aspirante ve solo su nombre, su ID temporal y la
 * elección entre cursos propedéuticos o examen. Antes de elegir ve horarios y lugares; el docente de cada grupo lo ve
 * hasta después de confirmar. La elección es irreversible (un cambio lo hace Posgrado a solicitud del aspirante).
 */
@Injectable()
export class PortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adm: AdmisionService,
  ) {}

  private async postulacionDe(u: UsuarioSesion) {
    if (u.area !== 'ASPIRANTES') throw new ForbiddenException('Solo para aspirantes');
    const usuario = await this.prisma.usuario.findUnique({ where: { id: u.id } });
    const p = usuario?.aspiranteId ? await this.prisma.postulacion.findFirst({ where: { aspiranteId: usuario.aspiranteId }, orderBy: { creadoEn: 'desc' } }) : null;
    if (!p) throw new NotFoundException('Tu cuenta no tiene una solicitud de admisión');
    return this.adm.postulacion(p.folio);
  }

  private async config() {
    return ((await this.adm.almacenLeer('evaluacion')) ?? null) as Config | null;
  }

  /** Lugares ocupados por grupo: aspirantes que eligieron cursos propedéuticos (sin contar al que pregunta). */
  private async ocupados(cliente: Pick<PrismaService, 'postulacion'>, excepto: string) {
    const todas = await cliente.postulacion.findMany({ where: { id: { not: excepto } }, select: { estado: true, estadoProceso: true } });
    const n = new Map<string, number>();
    for (const t of todas) {
      const proc = (t.estadoProceso ?? {}) as { evaluacion?: Evaluacion; etapa?: string };
      // Solo quienes ya llegaron a la evaluación (no cuentan elecciones de pruebas en etapas anteriores)
      if (!ETAPA_EVALUACION.includes(t.estado) && !['evaluacion', 'dictamen'].includes(proc.etapa ?? '')) continue;
      const ev = proc.evaluacion;
      if (ev?.modalidad !== 'propedeutico') continue;
      for (const [m, g] of Object.entries(ev.grupos ?? {})) n.set(clave(m, g), (n.get(clave(m, g)) ?? 0) + 1);
    }
    return n;
  }

  async yo(u: UsuarioSesion) {
    const p = await this.postulacionDe(u);
    const a = this.adm.aFront(p, 'completa') as {
      nombre: string;
      etapa: string;
      concluido?: string;
      dictamen?: { resolucion: string };
      evaluacion: Evaluacion;
      resolucion?: string;
      motivoReservas?: string;
      turnadoUteycv?: string;
    };
    const cfg = await this.config();
    const ev = a.evaluacion ?? {};
    // Elegida por el aspirante (confirmadaEl) o registrada por Posgrado durante la evaluación
    const elegida = yaElegida(ev, a.etapa);
    // Puede elegir cuando ya tiene dictamen de la entrevista colegiada (validado por Posgrado) y no ha concluido
    const puedeElegir = !elegida && a.etapa === 'evaluacion' && !a.concluido && !!cfg?.materias?.length;
    const motivo = elegida
      ? undefined
      : a.concluido
        ? 'Tu proceso de admisión en esta convocatoria ya concluyó.'
        : a.etapa !== 'evaluacion'
          ? 'Podrás elegir cuando concluya tu entrevista colegiada y el Departamento de Posgrado registre su dictamen.'
          : !cfg?.materias?.length
            ? 'El Departamento de Posgrado aún no publica los horarios de los cursos y del examen.'
            : undefined;
    const ocupados = cfg?.materias?.length && !elegida ? await this.ocupados(this.prisma, p.id) : new Map<string, number>();
    const profesores = elegida && ev.modalidad === 'propedeutico' ? await this.prisma.profesor.findMany({ where: { id: { in: (cfg?.materias ?? []).flatMap((m) => m.grupos.map((g) => g.docente ?? '')).filter(Boolean) } } }) : [];
    const exp = (p.expediente ?? {}) as ExpedienteAspirante;
    const e = p.entrevista;
    const resultadosPub = elegida && (publicado(ev.propedeutico) || publicado(ev.examen));
    const etapa = ORDEN.indexOf(a.etapa);
    const docs = this.documentosDe(p, exp);
    // Pestañas del portal: se habilitan conforme avanza su proceso
    const pestanas = [
      'inicio',
      'registro',
      'documentos',
      ...(e?.publicadaAspiranteEn || etapa >= ORDEN.indexOf('evaluacion') ? ['entrevista'] : []),
      ...(etapa >= ORDEN.indexOf('evaluacion') || elegida ? ['evaluacion'] : []),
      ...(resultadosPub ? ['resultados'] : []),
      ...(a.resolucion ? ['dictamen'] : []),
      'notificaciones',
    ];
    return {
      nombre: a.nombre,
      idTemporal: idTemporal(p.folio),
      pestanas,
      etapa: a.etapa,
      concluido: a.concluido ?? null,
      enLinea: !!exp.enLinea,
      verificadoEl: exp.verificadoEl ?? null,
      documentos: { faltan: docs.filter((d) => d.obligatorio && (d.estado === 'falta' || d.estado === 'observado' || d.estado === 'prorroga')).length, observados: docs.filter((d) => d.estado === 'observado').length },
      noLeidas: (await this.listaNotificaciones(u, p, exp)).filter((n) => n.nueva).length,
      // Su cita, cuando Posgrado la publica
      entrevista: e?.publicadaAspiranteEn ? { ...deFechaHora(e.fechaHora), duracion: e.duracionMin, modalidad: MODALIDAD_TXT[e.modalidad] ?? e.modalidad, sala: e.sala } : null,
      puedeElegir,
      motivo,
      // Antes de elegir: horarios y lugares, sin el docente de cada grupo
      config: cfg
        ? {
            propedeutico: cfg.propedeutico,
            examen: cfg.examen,
            materias: (cfg.materias ?? []).map((m) => ({
              id: m.id,
              nombre: m.nombre,
              // Solo se le dice si el grupo ya se llenó (no cuántos lugares quedan ni el cupo)
              grupos: m.grupos.map(({ docente: _d, cupo, sala: _s, ...g }) => ({ ...g, lleno: !!cupo && (ocupados.get(clave(m.id, g.id)) ?? 0) >= cupo })),
            })),
          }
        : null,
      eleccion: elegida
        ? {
            modalidad: ev.modalidad,
            confirmadaEl: ev.confirmadaEl,
            grupos: ev.grupos ?? {},
            // Ya elegido: quién imparte cada curso de sus grupos y su correo institucional para contactarlo
            docentes: Object.fromEntries(
              (cfg?.materias ?? []).map((m) => {
                const g = m.grupos.find((x) => x.id === ev.grupos?.[m.id]);
                return [m.id, profesores.find((x) => x.id === g?.docente)?.nombre ?? ''];
              }),
            ),
            correosDocentes: Object.fromEntries(
              (cfg?.materias ?? []).map((m) => {
                const g = m.grupos.find((x) => x.id === ev.grupos?.[m.id]);
                const correo = profesores.find((x) => x.id === g?.docente)?.correo ?? '';
                return [m.id, /sigap\.local$/i.test(correo) ? '' : correo];
              }),
            ),
          }
        : null,
      // 5 · Resultados: lo publicado de su evaluación (el examen de áreas no acreditadas no se muestra en esta etapa)
      resultados: elegida
        ? {
            modalidad: ev.modalidad,
            propedeutico: ev.modalidad === 'propedeutico' ? publicado(ev.propedeutico) : null,
            examen: ev.modalidad === 'examen' ? publicado(ev.examen) : null,
          }
        : null,
      // 6 · Dictamen final: la resolución del Colegio, cuando Posgrado la publica (Comisión de Admisión)
      dictamen: a.resolucion
        ? { resolucion: a.resolucion, motivo: a.resolucion === 'Con reservas' ? (a.motivoReservas ?? '') : '', publicadoEl: a.turnadoUteycv ?? null }
        : null,
    };
  }

  async elegir(u: UsuarioSesion, d: { modalidad: string; grupos?: Record<string, string> }) {
    const p = await this.postulacionDe(u);
    const a = this.adm.aFront(p, 'completa') as { etapa: string; concluido?: string; evaluacion: Evaluacion };
    if (yaElegida(a.evaluacion ?? {}, a.etapa)) throw new ConflictException('Ya registraste tu elección; es definitiva. Si necesitas un cambio, escribe al Departamento de Posgrado.');
    if (a.etapa !== 'evaluacion' || a.concluido) throw new BadRequestException('Aún no puedes elegir tu evaluación');
    if (!['propedeutico', 'examen'].includes(d.modalidad)) throw new BadRequestException('Elige cursos propedéuticos o examen');
    const cfg = await this.config();
    if (!cfg?.materias?.length) throw new BadRequestException('El Departamento de Posgrado aún no publica los horarios');
    const grupos: Record<string, string> = {};
    if (d.modalidad === 'propedeutico')
      for (const m of cfg.materias) {
        const g = m.grupos.length === 1 ? m.grupos[0].id : d.grupos?.[m.id];
        if (!g || !m.grupos.some((x) => x.id === g)) throw new BadRequestException(`Elige tu grupo de ${m.nombre ?? m.id}`);
        grupos[m.id] = g;
      }
    const evaluacion = { ...(a.evaluacion ?? {}), modalidad: d.modalidad, grupos, confirmadaEl: new Date().toISOString() };
    await this.prisma.$transaction(async (tx) => {
      // Uno a la vez: así dos aspirantes no pueden tomar el último lugar de un grupo
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(${BLOQUEO_CUPO})::text`;
      const actual = await tx.postulacion.findUnique({ where: { id: p.id } });
      const proc = { ...((actual?.estadoProceso ?? {}) as Record<string, unknown>) };
      if (yaElegida((proc.evaluacion ?? {}) as Evaluacion, a.etapa)) throw new ConflictException('Ya registraste tu elección');
      if (d.modalidad === 'propedeutico') {
        const ocupados = await this.ocupados(tx, p.id);
        for (const m of cfg.materias!) {
          const g = m.grupos.find((x) => x.id === grupos[m.id])!;
          if (g.cupo && (ocupados.get(clave(m.id, g.id)) ?? 0) >= g.cupo)
            throw new ConflictException(
              m.grupos.length === 1
                ? `Ya no hay lugares en ${m.nombre ?? m.id}. Puedes elegir presentar solo el examen o escribir al Departamento de Posgrado.`
                : `El grupo ${g.id} de ${m.nombre ?? m.id} se llenó mientras elegías. Elige otro grupo.`,
            );
        }
      }
      await tx.postulacion.update({ where: { id: p.id }, data: { estadoProceso: { ...proc, evaluacion } as object } });
    });
    const nombres = (cfg.materias ?? []).map((m) => `${m.nombre ?? m.id} grupo ${grupos[m.id]}`).join(', ');
    await this.adm.bitacora(p.folio, u.nombre, d.modalidad === 'propedeutico' ? `El aspirante eligió cursos propedéuticos (${nombres})` : 'El aspirante eligió presentar solo el examen de admisión');
    return this.yo(u);
  }

  // ---------- Expediente: documentos ----------

  /** Documentos que el aspirante ve en su portal (escaneados y, si se registró en línea, su SIP-02). */
  private documentosDe(p: Awaited<ReturnType<AdmisionService['postulacion']>>, exp: ExpedienteAspirante) {
    const claves = new Set(p.documentos.map((d) => d.catalogo.clave).filter((c) => DOCUMENTOS_EXPEDIENTE.includes(c)));
    // La CURP es opcional pero siempre se puede entregar; los obligatorios se muestran aunque no tengan registro
    for (const c of DOCUMENTOS_EXPEDIENTE) if (c === 'curp' || CATALOGO_EXPEDIENTE[c]?.obligatorio) claves.add(c);
    if (exp.enLinea) claves.add('sip-02');
    const orden = [...DOCUMENTOS_EXPEDIENTE, 'sip-02'];
    return [...claves]
      .sort((x, y) => orden.indexOf(x) - orden.indexOf(y))
      .map((clave) => {
        const d = p.documentos.find((x) => x.catalogo.clave === clave);
        const estado = d ? estadoParaAspirante(d) : 'falta';
        return {
          clave,
          nombre: d?.catalogo.nombre ?? CATALOGO_EXPEDIENTE[clave]?.nombre ?? clave,
          obligatorio: d?.catalogo.obligatorio ?? CATALOGO_EXPEDIENTE[clave]?.obligatorio ?? false,
          estado,
          archivo: d?.nombreArchivo ?? null,
          subidoEl: d?.nombreArchivo ? d.actualizadoEn.toISOString() : null,
          observacion: estado === 'observado' || estado === 'prorroga' ? (d?.observacion ?? null) : null,
          prorrogaHasta: d?.prorrogaHasta ? deFechaHora(d.prorrogaHasta).fecha : null,
          puedeSubir: puedeSubir(estado) && !p.estado.startsWith('RECHAZ'),
        };
      });
  }

  private async limiteMB() {
    return convocatorias(await this.adm.almacenLeer('convocatorias')).limiteMB ?? 5;
  }

  async documentos(u: UsuarioSesion) {
    const p = await this.postulacionDe(u);
    const exp = (p.expediente ?? {}) as ExpedienteAspirante;
    return { enLinea: !!exp.enLinea, limiteMB: await this.limiteMB(), documentos: this.documentosDe(p, exp) };
  }

  /** El aspirante sube un documento que falta, que tiene observaciones o que está en prórroga; queda por revisar. */
  async subirDocumento(u: UsuarioSesion, clave: string, archivo: { originalname: string; buffer: Buffer; mimetype: string; size: number } | undefined) {
    const p = await this.postulacionDe(u);
    const exp = (p.expediente ?? {}) as ExpedienteAspirante;
    const doc = this.documentosDe(p, exp).find((d) => d.clave === clave);
    if (!doc) throw new NotFoundException('Ese documento no forma parte de tu expediente');
    if (!doc.puedeSubir)
      throw new ConflictException(doc.estado === 'aprobado' ? 'Ese documento ya fue aprobado.' : 'Ya enviaste ese documento; el Departamento de Posgrado lo está revisando. Solo podrás cambiarlo si te hace observaciones.');
    if (!archivo) throw new BadRequestException('Adjunta el documento en PDF');
    if (archivo.mimetype !== 'application/pdf' || !esPdf(archivo.buffer)) throw new BadRequestException('El documento debe ser un PDF');
    const limite = await this.limiteMB();
    if (archivo.size > limite * 1024 * 1024) throw new BadRequestException(`El archivo pesa más de ${limite} MB. Redúcelo e inténtalo de nuevo.`);
    const info = CATALOGO_EXPEDIENTE[clave] ?? { nombre: doc.nombre, obligatorio: doc.obligatorio };
    const catalogo = await this.prisma.catalogoDocumento.upsert({ where: { clave }, create: { clave, nombre: info.nombre, obligatorio: info.obligatorio }, update: {} });
    const nombre = archivo.originalname.replace(/[^\w.\- ]+/g, '_').slice(0, 120) || `${clave}.pdf`;
    const ruta = guardarArchivo(`aspirantes/${p.folio}/${clave}_${Date.now()}.pdf`, archivo.buffer);
    const datos = { nombreArchivo: nombre, urlArchivo: ruta, tipoMime: 'application/pdf', tamanoBytes: archivo.size, estado: 'PENDIENTE' as const, observacion: null, prorrogaHasta: null };
    await this.prisma.documentoPostulacion.upsert({
      where: { postulacionId_catalogoId: { postulacionId: p.id, catalogoId: catalogo.id } },
      create: { postulacionId: p.id, catalogoId: catalogo.id, ...datos },
      update: datos,
    });
    const antes = doc.estado === 'observado' ? ' para atender la observación' : doc.estado === 'prorroga' ? ' (estaba en prórroga)' : '';
    await this.adm.bitacora(p.folio, u.nombre, `El aspirante subió ${catalogo.nombre}${antes}; queda por revisar`);
    return this.documentos(u);
  }

  /** Ruta del archivo que el aspirante subió (para que lo vuelva a ver). */
  async archivoPropio(u: UsuarioSesion, clave: string) {
    const p = await this.postulacionDe(u);
    const d = p.documentos.find((x) => x.catalogo.clave === clave && (DOCUMENTOS_EXPEDIENTE.includes(clave) || clave === 'sip-02'));
    if (!d?.urlArchivo) throw new NotFoundException('Documento no disponible');
    return { ruta: d.urlArchivo, nombre: `${clave}_${p.folio}.pdf` };
  }

  // ---------- Registro: datos del aspirante ----------

  private datosDe(p: Awaited<ReturnType<AdmisionService['postulacion']>>): DatosAspirante {
    const a = p.aspirante;
    const r = (p.respuestasRegistro ?? {}) as Record<string, unknown>;
    const txt = (v: unknown) => (typeof v === 'string' ? v : '');
    return {
      nombres: a.nombres,
      apellidoPaterno: a.apellidoPaterno,
      apellidoMaterno: a.apellidoMaterno ?? '',
      curp: a.curp ?? '',
      correo: /sigap\.local$/i.test(a.correo) ? '' : a.correo,
      telefono: a.telefono ?? '',
      procedencia: txt(r.procedencia),
      carrera: txt(r.carrera),
      promedio: txt(r.promedio),
    };
  }

  async registro(u: UsuarioSesion) {
    const p = await this.postulacionDe(u);
    const exp = (p.expediente ?? {}) as ExpedienteAspirante;
    return {
      idTemporal: idTemporal(p.folio),
      enLinea: !!exp.enLinea,
      registradoEl: exp.registradoEl ?? null,
      verificadoEl: exp.verificadoEl ?? null,
      datos: this.datosDe(p),
      // Quien se registró en línea: sus respuestas (para volver a generar su SIP-02 llenado)
      respuestas: exp.enLinea ? p.respuestasRegistro : null,
    };
  }

  /** El aspirante revisa sus datos, corrige lo necesario y confirma que son correctos (una sola vez). */
  async verificar(u: UsuarioSesion, d: DatosAspirante) {
    const p = await this.postulacionDe(u);
    const exp = (p.expediente ?? {}) as ExpedienteAspirante;
    if (exp.verificadoEl) throw new ConflictException('Ya confirmaste tus datos. Si necesitas corregir algo, escribe al Departamento de Posgrado.');
    const limpio = Object.fromEntries(Object.entries(d).map(([k, v]) => [k, String(v ?? '').trim().replace(/\s+/g, ' ')])) as DatosAspirante;
    limpio.curp = limpio.curp.toUpperCase();
    limpio.correo = limpio.correo.toLowerCase();
    if (!limpio.nombres || !limpio.apellidoPaterno) throw new BadRequestException('Escribe tu nombre y tu apellido paterno');
    const errorCurp = limpio.curp ? validarCurpCompleta(limpio.curp, { nombre: limpio.nombres, apellidoPaterno: limpio.apellidoPaterno, apellidoMaterno: limpio.apellidoMaterno }) : null;
    if (errorCurp) throw new BadRequestException(errorCurp);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio.correo)) throw new BadRequestException('Escribe un correo válido');
    if (!/^\d{10}$/.test(limpio.telefono.replace(/[\s-]/g, ''))) throw new BadRequestException('El teléfono debe tener 10 dígitos');
    limpio.telefono = limpio.telefono.replace(/[\s-]/g, '');
    if (limpio.promedio && !(Number(limpio.promedio) >= 6 && Number(limpio.promedio) <= 10)) throw new BadRequestException('El promedio debe estar entre 6 y 10');
    const antes = this.datosDe(p);
    const cambios = (Object.keys(limpio) as (keyof DatosAspirante)[]).filter((k) => (antes[k] ?? '') !== limpio[k]);
    const a = p.aspirante;
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.aspirante.update({
          where: { id: a.id },
          data: { nombres: limpio.nombres, apellidoPaterno: limpio.apellidoPaterno, apellidoMaterno: limpio.apellidoMaterno || null, curp: limpio.curp || null, correo: limpio.correo, telefono: limpio.telefono },
        });
        const r = (p.respuestasRegistro ?? {}) as Record<string, unknown>;
        await tx.postulacion.update({
          where: { id: p.id },
          data: {
            respuestasRegistro: { ...r, procedencia: limpio.procedencia, carrera: limpio.carrera, promedio: limpio.promedio } as Prisma.InputJsonValue,
            expediente: { ...exp, verificadoEl: new Date().toISOString() } as Prisma.InputJsonValue,
          },
        });
        // La cuenta usa el correo del aspirante (si nadie más lo usa); así le llega la recuperación de contraseña
        const cuenta = await tx.usuario.findFirst({ where: { aspiranteId: a.id } });
        if (cuenta && cuenta.correo !== limpio.correo && !(await tx.usuario.findUnique({ where: { correo: limpio.correo } })))
          await tx.usuario.update({ where: { id: cuenta.id }, data: { correo: limpio.correo, nombre: [limpio.nombres, limpio.apellidoPaterno, limpio.apellidoMaterno].filter(Boolean).join(' ') } });
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException('Ese correo o esa CURP ya están registrados en otra solicitud. Escribe al Departamento de Posgrado.');
      throw e;
    }
    const ETIQ: Record<string, string> = { nombres: 'nombre', apellidoPaterno: 'apellido paterno', apellidoMaterno: 'apellido materno', curp: 'CURP', correo: 'correo', telefono: 'teléfono', procedencia: 'procedencia', carrera: 'carrera', promedio: 'promedio' };
    await this.adm.bitacora(
      p.folio,
      u.nombre,
      cambios.length ? `El aspirante confirmó sus datos y corrigió: ${cambios.map((k) => `${ETIQ[k]} (antes: ${antes[k] || 'vacío'})`).join(', ')}` : 'El aspirante confirmó que sus datos son correctos',
    );
    return this.registro(u);
  }

  // ---------- Notificaciones en SIGAP ----------

  /** Avisos y comunicados de Posgrado para el aspirante (canal SIGAP) y las notificaciones automáticas de su proceso. */
  private async listaNotificaciones(u: UsuarioSesion, p: { folio: string }, exp: ExpedienteAspirante) {
    const almacen = ((await this.adm.almacenLeer('posgrado')) ?? {}) as { avisos?: AvisoAlmacen[]; comunicados?: ComunicadoAlmacen[] };
    const vistas = exp.notificacionesVistasEl ?? '';
    const lista: { id: string; fecha: string; titulo: string; mensaje: string; origen: 'aviso' | 'comunicado' | 'proceso'; adjuntos?: string[]; nueva?: boolean }[] = [];
    for (const a of almacen.avisos ?? [])
      if (a.aspirante === p.folio && (a.canal === 'sistema' || a.canal === 'ambos') && a.id && a.fecha)
        lista.push({ id: a.id, fecha: a.fecha, titulo: a.asunto ?? 'Aviso del Departamento de Posgrado', mensaje: a.mensaje ?? '', origen: 'aviso' });
    for (const c of almacen.comunicados ?? [])
      if (c.destinatarios?.includes(p.folio) && c.id && c.fecha)
        lista.push({ id: c.id, fecha: c.fecha, titulo: c.asunto ?? 'Comunicado del Departamento de Posgrado', mensaje: c.cuerpo ?? '', origen: 'comunicado', ...(c.adjuntos?.length ? { adjuntos: c.adjuntos } : {}) });
    const propias = await this.prisma.notificacion.findMany({ where: { usuarioId: u.id }, orderBy: { creadoEn: 'desc' }, take: 200 });
    for (const n of propias) lista.push({ id: n.id, fecha: n.creadoEn.toISOString(), titulo: n.titulo, mensaje: n.mensaje, origen: 'proceso' });
    return lista.sort((x, y) => y.fecha.localeCompare(x.fecha)).map((n) => ({ ...n, nueva: n.fecha > vistas }));
  }

  async notificaciones(u: UsuarioSesion) {
    const p = await this.postulacionDe(u);
    const lista = await this.listaNotificaciones(u, p, (p.expediente ?? {}) as ExpedienteAspirante);
    return { lista, noLeidas: lista.filter((n) => n.nueva).length };
  }

  /** Marca como vistas todas las notificaciones hasta ahora. */
  async notificacionesVistas(u: UsuarioSesion) {
    const p = await this.postulacionDe(u);
    const ahora = new Date();
    await this.prisma.postulacion.update({ where: { id: p.id }, data: { expediente: { ...((p.expediente ?? {}) as object), notificacionesVistasEl: ahora.toISOString() } } });
    await this.prisma.notificacion.updateMany({ where: { usuarioId: u.id, leidaEn: null }, data: { leidaEn: ahora } });
    return { noLeidas: 0 };
  }
}
