import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { UsuarioSesion } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AdmisionService } from './admision.service';
import { idTemporal } from './id-temporal';

type Sesion = { dia: string; inicio: string; fin: string };
type Grupo = { id: string; sesiones?: Sesion[]; lugar?: string; docente?: string; cupo?: number };
type Materia = { id: string; nombre?: string; grupos: Grupo[] };
type Config = { propedeutico?: Record<string, string>; examen?: Record<string, string>; materias?: Materia[] };
type Evaluacion = { modalidad?: string; grupos?: Record<string, string>; confirmadaEl?: string; [k: string]: unknown };
const yaElegida = (ev: Evaluacion, etapa: string) => !!ev.modalidad && (!!ev.confirmadaEl || etapa === 'evaluacion');
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
    const a = this.adm.aFront(p, 'completa') as { nombre: string; etapa: string; concluido?: string; dictamen?: { resolucion: string }; evaluacion: Evaluacion };
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
    return {
      nombre: a.nombre,
      idTemporal: idTemporal(p.folio),
      puedeElegir,
      motivo,
      // Antes de elegir: horarios y lugares, sin el docente de cada grupo
      // y los lugares que quedan en cada grupo con cupo
      config: cfg
        ? {
            propedeutico: cfg.propedeutico,
            examen: cfg.examen,
            materias: (cfg.materias ?? []).map((m) => ({
              id: m.id,
              nombre: m.nombre,
              grupos: m.grupos.map(({ docente: _d, ...g }) => ({ ...g, ...(g.cupo ? { disponibles: Math.max(0, g.cupo - (ocupados.get(clave(m.id, g.id)) ?? 0)) } : {}) })),
            })),
          }
        : null,
      eleccion: elegida
        ? {
            modalidad: ev.modalidad,
            confirmadaEl: ev.confirmadaEl,
            grupos: ev.grupos ?? {},
            // Ya elegido: quién imparte cada curso de sus grupos
            docentes: Object.fromEntries(
              (cfg?.materias ?? []).map((m) => {
                const g = m.grupos.find((x) => x.id === ev.grupos?.[m.id]);
                return [m.id, profesores.find((x) => x.id === g?.docente)?.nombre ?? ''];
              }),
            ),
          }
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
}
