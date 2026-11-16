import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { UsuarioSesion } from '../auth/auth.guard';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdmisionService } from './admision.service';

/**
 * Seminario de Inducción: cada sesión (día) se divide en espacios (p. ej. 5 de 30 min a partir de las 11:00) y en
 * cada espacio un profesor investigador presenta su laboratorio. Posgrado define las sesiones; los profesores eligen
 * su día y hora (y escriben su laboratorio) y Posgrado también puede asignarlos, como en las entrevistas.
 * Se guarda en el almacén con la clave "seminario" (no se edita por /almacen: solo por estas reglas).
 */
export type ConfigSeminario = {
  titulo: string;
  lugar: string;
  /** Fechas de las sesiones (AAAA-MM-DD) */
  sesiones: string[];
  horaInicio: string;
  duracionMin: number;
  espaciosPorSesion: number;
  /** Los profesores pueden elegir (Posgrado lo cierra cuando ya no quiere cambios) */
  abierto: boolean;
  /** Espacios que puede elegir cada profesor por su cuenta (Posgrado puede asignar más) */
  maxPorProfesor: number;
  /** Por día: presencial o en línea y su lugar o enlace (si no se indica, se usa el lugar general) */
  porSesion?: Record<string, { modalidad: 'presencial' | 'en-linea'; lugar: string }>;
};
export type Espacio = { id: string; fecha: string; inicio: string; fin: string; profesorId?: string; laboratorio?: string; el?: string; por?: 'profesor' | 'posgrado' };
type Seminario = { config: ConfigSeminario; espacios: Espacio[] };

const CLAVE = 'seminario';
/** Bloqueo para que dos profesores no tomen al mismo tiempo el mismo espacio. */
const BLOQUEO = 4209;
/** Como el listado del Seminario de Inducción A27 que entregó Posgrado */
export const CONFIG_INICIAL: ConfigSeminario = {
  titulo: 'Seminario de Inducción A27',
  lugar: '',
  sesiones: ['2026-11-20', '2026-11-27', '2026-12-04', '2026-12-11'],
  horaInicio: '11:00',
  duracionMin: 30,
  espaciosPorSesion: 5,
  abierto: false,
  maxPorProfesor: 1,
};

const minutos = (h: string) => {
  const [a, b] = h.split(':').map(Number);
  return a * 60 + b;
};
const hora = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/** Espacios que resultan de la configuración (los ya ocupados conservan su profesor si siguen existiendo). */
function generar(c: ConfigSeminario, previos: Espacio[]): Espacio[] {
  const ocupados = new Map(previos.filter((e) => e.profesorId).map((e) => [e.id, e]));
  return [...c.sesiones].sort().flatMap((fecha) =>
    Array.from({ length: c.espaciosPorSesion }, (_, i) => {
      const inicio = hora(minutos(c.horaInicio) + i * c.duracionMin);
      const id = `${fecha}_${inicio}`;
      const prev = ocupados.get(id);
      return { id, fecha, inicio, fin: hora(minutos(inicio) + c.duracionMin), ...(prev ? { profesorId: prev.profesorId, laboratorio: prev.laboratorio, el: prev.el, por: prev.por } : {}) };
    }),
  );
}

const fechaTexto = (f: string) => {
  const d = new Date(`${f}T12:00:00-06:00`);
  return d.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', weekday: 'long', day: 'numeric', month: 'long' });
};

@Injectable()
export class SeminarioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adm: AdmisionService,
  ) {}

  private async leer(cliente: Pick<PrismaService, 'almacen'> = this.prisma): Promise<Seminario | null> {
    const v = (await cliente.almacen.findUnique({ where: { clave: CLAVE } }))?.valor as Seminario | undefined;
    return v?.config ? v : null;
  }

  private async guardar(cliente: Pick<PrismaService, 'almacen'>, s: Seminario, u: UsuarioSesion) {
    await cliente.almacen.upsert({
      where: { clave: CLAVE },
      create: { clave: CLAVE, valor: s as unknown as Prisma.InputJsonValue, actualizadoPor: u.nombre },
      update: { valor: s as unknown as Prisma.InputJsonValue, actualizadoPor: u.nombre },
    });
  }

  /** Lo que ve cada cuenta: Posgrado y Subdirección todo; los profesores el calendario con quién tomó cada espacio. */
  async ver(u: UsuarioSesion) {
    const s = await this.leer();
    const profesores = await this.prisma.profesor.findMany({ select: { id: true, nombre: true } });
    const nombre = new Map(profesores.map((p) => [p.id, p.nombre]));
    return {
      publicado: !!s,
      config: s?.config ?? CONFIG_INICIAL,
      espacios: (s?.espacios ?? []).map((e) => ({ ...e, profesor: e.profesorId ? (nombre.get(e.profesorId) ?? 'Profesor') : null })),
      yo: u.profesorId ?? null,
    };
  }

  /** Posgrado define (o cambia) las sesiones. Si un cambio quita espacios ya ocupados, pide confirmarlo. */
  async configurar(c: ConfigSeminario, forzar: boolean, u: UsuarioSesion) {
    const sesiones = [...new Set(c.sesiones)].filter((f) => /^\d{4}-\d{2}-\d{2}$/.test(f)).sort();
    if (!sesiones.length) throw new BadRequestException('Agrega al menos una fecha de sesión');
    if (!/^\d{2}:\d{2}$/.test(c.horaInicio)) throw new BadRequestException('Indica la hora de inicio');
    if (minutos(c.horaInicio) + c.duracionMin * c.espaciosPorSesion > 24 * 60) throw new BadRequestException('Los espacios pasan de la medianoche');
    // Solo los días que existen, con modalidad válida
    const porSesion = Object.fromEntries(
      sesiones
        .map((f) => [f, c.porSesion?.[f]] as const)
        .filter(([, d]) => d && (d.modalidad === 'en-linea' || d.lugar?.trim()))
        .map(([f, d]) => [f, { modalidad: d!.modalidad === 'en-linea' ? ('en-linea' as const) : ('presencial' as const), lugar: String(d!.lugar ?? '').trim().slice(0, 500) }]),
    );
    const config: ConfigSeminario = { ...c, titulo: c.titulo.trim() || CONFIG_INICIAL.titulo, lugar: c.lugar.trim(), sesiones, porSesion };
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(${BLOQUEO})::text`;
      const previo = await this.leer(tx);
      const espacios = generar(config, previo?.espacios ?? []);
      const perdidos = (previo?.espacios ?? []).filter((e) => e.profesorId && !espacios.some((x) => x.id === e.id));
      if (perdidos.length && !forzar)
        throw new ConflictException(`El cambio quita ${perdidos.length} espacio(s) que ya tienen profesor (${perdidos.map((e) => `${e.fecha} ${e.inicio}`).join(', ')}). Confirma para quitarlos.`);
      await this.guardar(tx, { config, espacios }, u);
      await this.adm.bitacora('', u.nombre, previo ? `Actualizó el ${config.titulo}: ${sesiones.length} sesiones, ${config.espaciosPorSesion} espacios de ${config.duracionMin} min desde las ${config.horaInicio}${config.abierto ? '' : ' (cerrado para elegir)'}` : `Publicó el ${config.titulo} para que los profesores elijan su día y hora`);
      return this.ver(u);
    });
  }

  /** El profesor elige un espacio libre (con el nombre de su laboratorio). */
  async elegir(espacioId: string, laboratorio: string, u: UsuarioSesion) {
    const prof = u.profesorId;
    if (!prof) throw new ForbiddenException('Solo los profesores pueden elegir un espacio');
    const lab = laboratorio.trim();
    if (!lab) throw new BadRequestException('Escribe el nombre de tu laboratorio');
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(${BLOQUEO})::text`;
      const s = await this.leer(tx);
      if (!s) throw new NotFoundException('El Departamento de Posgrado aún no publica el seminario');
      if (!s.config.abierto) throw new ConflictException('El Departamento de Posgrado ya cerró la elección de horarios. Si necesitas un cambio, escríbele.');
      const e = s.espacios.find((x) => x.id === espacioId);
      if (!e) throw new NotFoundException('Ese horario ya no existe');
      if (e.profesorId) throw new ConflictException(e.profesorId === prof ? 'Ya tienes ese horario' : 'Otro profesor acaba de tomar ese horario. Elige otro.');
      const mios = s.espacios.filter((x) => x.profesorId === prof).length;
      if (mios >= s.config.maxPorProfesor) throw new ConflictException(s.config.maxPorProfesor === 1 ? 'Ya tienes un horario en el seminario. Si quieres cambiarlo, primero libera el que tienes.' : `Ya tienes ${mios} horarios (el máximo es ${s.config.maxPorProfesor}).`);
      Object.assign(e, { profesorId: prof, laboratorio: lab.slice(0, 160), el: new Date().toISOString(), por: 'profesor' });
      await this.guardar(tx, s, u);
      await this.adm.bitacora('', u.nombre, `Eligió presentar en el ${s.config.titulo} el ${fechaTexto(e.fecha)} de ${e.inicio} a ${e.fin} (${lab})`);
    });
    return this.ver(u);
  }

  /** El profesor libera su espacio (mientras la elección esté abierta). */
  async dejar(espacioId: string, u: UsuarioSesion) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(${BLOQUEO})::text`;
      const s = await this.leer(tx);
      const e = s?.espacios.find((x) => x.id === espacioId);
      if (!s || !e || e.profesorId !== u.profesorId) throw new NotFoundException('Ese horario no es tuyo');
      if (!s.config.abierto) throw new ConflictException('El Departamento de Posgrado ya cerró la elección de horarios. Si necesitas un cambio, escríbele.');
      if (e.por === 'posgrado') throw new ConflictException('Ese horario te lo asignó el Departamento de Posgrado; para cambiarlo, escríbele.');
      for (const k of ['profesorId', 'laboratorio', 'el', 'por'] as const) delete e[k];
      await this.guardar(tx, s, u);
      await this.adm.bitacora('', u.nombre, `Liberó su horario del ${s.config.titulo} (${fechaTexto(e.fecha)}, ${e.inicio})`);
    });
    return this.ver(u);
  }

  /** Posgrado asigna (o quita, con null) al profesor de un espacio y su laboratorio. */
  async asignar(espacioId: string, profesorId: string | null, laboratorio: string | undefined, u: UsuarioSesion) {
    const prof = profesorId ? await this.prisma.profesor.findUnique({ where: { id: profesorId } }) : null;
    if (profesorId && !prof) throw new NotFoundException('No existe ese profesor');
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(${BLOQUEO})::text`;
      const s = await this.leer(tx);
      const e = s?.espacios.find((x) => x.id === espacioId);
      if (!s || !e) throw new NotFoundException('Ese horario no existe');
      const antes = e.profesorId;
      if (!prof) for (const k of ['profesorId', 'laboratorio', 'el', 'por'] as const) delete e[k];
      else
        Object.assign(e, {
          profesorId: prof.id,
          laboratorio: (laboratorio ?? (antes === prof.id ? e.laboratorio : '') ?? '').trim().slice(0, 160),
          ...(antes === prof.id ? {} : { el: new Date().toISOString(), por: 'posgrado' as const }),
        });
      await this.guardar(tx, s, u);
      const cuando = `${fechaTexto(e.fecha)}, ${e.inicio} a ${e.fin}`;
      await this.adm.bitacora('', u.nombre, prof ? (antes === prof.id ? `Actualizó el laboratorio del horario ${cuando} del ${s.config.titulo}` : `Asignó a ${prof.nombre} al ${s.config.titulo} (${cuando})`) : `Quitó al profesor del horario ${cuando} del ${s.config.titulo}`);
    });
    return this.ver(u);
  }
}
