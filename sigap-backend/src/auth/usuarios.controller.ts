import { BadRequestException, Body, Controller, ForbiddenException, Get, HttpCode, NotFoundException, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { hash } from 'bcryptjs';
import { ArrayMaxSize, IsArray, IsBoolean, IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { AreaPersonal } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard, Areas, type UsuarioSesion } from './auth.guard';

type Req_ = { usuario: UsuarioSesion };

class EstadoDto {
  @IsBoolean() activo!: boolean;
}
/** Áreas adicionales que puede tener una cuenta del personal. */
const AREAS_EXTRA = ['POSGRADO', 'UTEYCV', 'SUBDIRECCION', 'PROFESORES'] as const;
class AreasExtraDto {
  @IsArray() @ArrayMaxSize(4) @IsIn(AREAS_EXTRA, { each: true }) areas!: (typeof AREAS_EXTRA)[number][];
}
const NOMBRE_AREA: Record<string, string> = { POSGRADO: 'Departamento de Posgrado', UTEYCV: 'UTEyCV', SUBDIRECCION: 'Subdirección Académica', PROFESORES: 'Profesores' };
const AREAS_PERSONAL = ['PROFESORES', 'POSGRADO', 'UTEYCV', 'SUBDIRECCION', 'ADMINISTRADOR'] as const;
class NuevaCuentaDto {
  @IsString() @MinLength(3) @MaxLength(120) nombre!: string;
  @IsEmail() @MaxLength(120) correo!: string;
  @IsIn(AREAS_PERSONAL) area!: (typeof AREAS_PERSONAL)[number];
  @IsString() @MinLength(3) @MaxLength(80) puesto!: string;
}

/**
 * Contraseña temporal: 12 caracteres al azar (≈69 bits) sin los que se confunden al dictarla (0/O, 1/l/I).
 * Se muestra una sola vez y se debe cambiar al entrar.
 */
export const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
export const temporal = () => Array.from({ length: 12 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');

// Freno de restablecimientos: 20 por hora por cada cuenta que los hace
const usos = new Map<string, number[]>();
const frenar = (quien: string) => {
  const ahora = Date.now();
  const v = (usos.get(quien) ?? []).filter((t) => ahora - t < 60 * 60 * 1000);
  if (v.length >= 20) throw new BadRequestException('Demasiados restablecimientos en una hora; espera un poco');
  usos.set(quien, [...v, ahora]);
};

/**
 * Cuentas del personal (RF-80):
 * - El Administrador ve todas, las activa o desactiva, crea cuentas y restablece cualquier contraseña.
 * - El Departamento de Posgrado ve y restablece las de los profesores y los aspirantes (sin esperar al Administrador).
 * Restablecer genera una contraseña temporal que se muestra una sola vez, obliga a cambiarla al entrar y cierra las
 * sesiones abiertas de esa cuenta. Todo queda en la bitácora.
 */
@Controller('usuarios')
@UseGuards(AuthGuard)
export class UsuariosController {
  constructor(private readonly prisma: PrismaService) {}

  private alcance(u: UsuarioSesion) {
    // Administrador: todas las cuentas; Posgrado: las de profesores y aspirantes
    return u.area === 'ADMINISTRADOR' ? {} : { area: { in: ['PROFESORES', 'ASPIRANTES'] as AreaPersonal[] } };
  }

  private async cuenta(id: string, u: UsuarioSesion) {
    const c = await this.prisma.usuario.findFirst({ where: { id, ...this.alcance(u) }, include: { roles: { include: { rol: true } } } });
    if (!c) throw new NotFoundException('No existe esa cuenta o no la puedes administrar');
    return c;
  }

  private registrar(entidadId: string, actor: string, accion: string, detalle?: object) {
    return this.prisma.eventoBitacora.create({ data: { entidad: 'Usuario', entidadId, actor, accion, ...(detalle ? { detalle } : {}) } });
  }

  @Get()
  @Areas('ADMINISTRADOR')
  async listar(@Req() r: Req_) {
    const cs = await this.prisma.usuario.findMany({ where: this.alcance(r.usuario), include: { roles: { include: { rol: true } } }, orderBy: [{ area: 'asc' }, { nombre: 'asc' }] });
    return cs.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      correo: c.correo.endsWith('.sigap.local') && c.correo.includes('@pendiente.') ? '' : c.correo,
      acceso: c.identificadorAcceso ?? '',
      area: c.area,
      areasExtra: c.areasExtra,
      puesto: c.roles.map((x) => x.rol.nombre).join(' · ') || c.area,
      activo: c.activo,
      temporal: c.debeCambiarContrasena,
      ultimoAcceso: c.ultimoAccesoEn?.toISOString() ?? null,
      yo: c.id === r.usuario.id,
    }));
  }

  @Post(':id/restablecer')
  @HttpCode(200)
  @Areas('ADMINISTRADOR')
  async restablecer(@Req() r: Req_, @Param('id') id: string) {
    const c = await this.cuenta(id, r.usuario);
    if (c.id === r.usuario.id) throw new BadRequestException('Para tu propia cuenta usa “Cambiar contraseña”');
    if (!c.activo) throw new BadRequestException('La cuenta está desactivada; reactívala primero');
    frenar(r.usuario.id);
    const t = temporal();
    await this.prisma.usuario.update({ where: { id: c.id }, data: { hashContrasena: await hash(t, 12), debeCambiarContrasena: true, sesionesDesde: new Date() } });
    await this.registrar(c.id, r.usuario.nombre, `Restableció la contraseña de ${c.nombre} (${c.correo}); sus sesiones abiertas se cerraron`);
    return { temporal: t, nombre: c.nombre, usuario: c.area === 'ASPIRANTES' || c.correo.includes('@pendiente.') || c.correo.endsWith('.sigap.local') ? c.identificadorAcceso : c.correo };
  }

  @Patch(':id')
  @Areas('ADMINISTRADOR')
  async estado(@Req() r: Req_, @Param('id') id: string, @Body() dto: EstadoDto) {
    const c = await this.cuenta(id, r.usuario);
    if (c.id === r.usuario.id) throw new BadRequestException('No puedes desactivar tu propia cuenta');
    if (!dto.activo && c.area === 'ADMINISTRADOR') {
      const otros = await this.prisma.usuario.count({ where: { area: 'ADMINISTRADOR', activo: true, id: { not: c.id } } });
      if (!otros) throw new BadRequestException('Debe quedar al menos un Administrador activo');
    }
    await this.prisma.usuario.update({ where: { id: c.id }, data: { activo: dto.activo, ...(dto.activo ? {} : { sesionesDesde: new Date() }) } });
    await this.registrar(c.id, r.usuario.nombre, `${dto.activo ? 'Reactivó' : 'Desactivó'} la cuenta de ${c.nombre} (${c.correo})`);
    return { ok: true };
  }

  /**
   * El Administrador agrega o quita áreas adicionales a una cuenta (p. ej. Subdirección Académica a una profesora).
   * Al quitarlas, la persona deja de ver esa sesión en cuanto recarga SIGAP.
   */
  @Patch(':id/areas')
  @Areas('ADMINISTRADOR')
  async areasExtra(@Req() r: Req_, @Param('id') id: string, @Body() dto: AreasExtraDto) {
    const c = await this.cuenta(id, r.usuario);
    if (c.area === 'ASPIRANTES' || c.area === 'ADMINISTRADOR') throw new BadRequestException('A esta cuenta no se le pueden agregar áreas');
    const nuevas = [...new Set(dto.areas)].filter((a) => a !== c.area);
    const antes = c.areasExtra;
    await this.prisma.usuario.update({ where: { id: c.id }, data: { areasExtra: nuevas } });
    const agregadas = nuevas.filter((a) => !antes.includes(a)).map((a) => NOMBRE_AREA[a]);
    const quitadas = antes.filter((a) => !nuevas.includes(a as (typeof AREAS_EXTRA)[number])).map((a) => NOMBRE_AREA[a] ?? a);
    if (agregadas.length || quitadas.length)
      await this.registrar(
        c.id,
        r.usuario.nombre,
        `${[agregadas.length && `Dio acceso a ${agregadas.join(', ')}`, quitadas.length && `Quitó el acceso a ${quitadas.join(', ')}`].filter(Boolean).join('; ')} a ${c.nombre} (${c.correo})`,
      );
    return { areasExtra: nuevas };
  }

  @Post()
  @Areas('ADMINISTRADOR')
  async crear(@Req() r: Req_, @Body() dto: NuevaCuentaDto) {
    const correo = dto.correo.trim().toLowerCase();
    if (dto.area === 'PROFESORES') throw new ForbiddenException('Las cuentas de profesores se dan de alta con la carga de profesores del Colegio');
    if (await this.prisma.usuario.findUnique({ where: { correo } })) throw new BadRequestException('Ya existe una cuenta con ese correo');
    const rol = await this.prisma.rol.upsert({ where: { nombre: dto.puesto.trim() }, create: { nombre: dto.puesto.trim() }, update: {} });
    const t = temporal();
    const c = await this.prisma.usuario.create({
      data: { nombre: dto.nombre.trim(), correo, area: dto.area, hashContrasena: await hash(t, 12), debeCambiarContrasena: true, roles: { create: { rolId: rol.id } } },
    });
    await this.registrar(c.id, r.usuario.nombre, `Creó la cuenta de ${c.nombre} (${correo}) · ${dto.puesto.trim()}`);
    return { id: c.id, temporal: t, nombre: c.nombre, usuario: correo };
  }

  /** Bitácora de accesos y cuentas (solo Administrador). */
  @Get('actividad')
  @Areas('ADMINISTRADOR')
  async actividad() {
    const ev = await this.prisma.eventoBitacora.findMany({ where: { entidad: { in: ['Acceso', 'Usuario'] } }, orderBy: { creadoEn: 'desc' }, take: 300 });
    return ev.map((e) => ({ fecha: e.creadoEn.toISOString(), usuario: e.actor ?? '', accion: e.accion, ip: (e.detalle as { ip?: string } | null)?.ip ?? '' }));
  }
}
