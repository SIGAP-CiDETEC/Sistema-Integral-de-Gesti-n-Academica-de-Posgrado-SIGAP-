import { Body, Controller, Get, HttpCode, Ip, Post, Req, UnauthorizedException, UseGuards, BadRequestException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { sign } from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard, secretoJwt, type UsuarioSesion } from './auth.guard';
import { correoConfigurado, correoReal, enviarCorreo, urlSigap } from '../correo/correo';

class LoginDto {
  @IsString() @MaxLength(120) usuario!: string;
  @IsString() @MaxLength(200) contrasena!: string;
}
class CambioDto {
  @IsString() actual!: string;
  @IsString() @MinLength(10) @MaxLength(200) nueva!: string;
}

class RecuperarDto {
  @IsString() @MaxLength(120) usuario!: string;
}
class RestablecerDto {
  @IsString() @MinLength(20) @MaxLength(200) token!: string;
  @IsString() @MinLength(10) @MaxLength(200) nueva!: string;
}

/** Vigencia del enlace para restablecer la contraseña. */
const VIGENCIA_ENLACE_MIN = 30;
const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');

/** Rol del front según el área de la cuenta. */
const ROL_FRONT: Record<string, string> = { POSGRADO: 'posgrado', PROFESORES: 'profesor', SUBDIRECCION: 'subdireccion', UTEYCV: 'uteycv', ADMINISTRADOR: 'admin', ASPIRANTES: 'aspirante' };

// Freno simple de intentos fallidos por IP (10 en 10 minutos)
const intentos = new Map<string, { n: number; desde: number }>();
const VENTANA = 10 * 60 * 1000;
// Solicitudes de recuperación por IP (5 en 10 minutos)
const solicitudes = new Map<string, { n: number; desde: number }>();

@Controller('auth')
export class AuthController {
  private readonly log = new Logger('Recuperación de contraseña');
  constructor(private readonly prisma: PrismaService) {}

  /** Si la recuperación por correo está disponible (si no, la página indica a quién escribir). */
  @Get('recuperacion')
  recuperacion() {
    return { disponible: correoConfigurado() };
  }

  /**
   * Envía un enlace para restablecer la contraseña al correo de la cuenta. Siempre responde lo mismo, exista o no la
   * cuenta, para no revelar quién tiene cuenta en SIGAP.
   */
  @Post('recuperar')
  @HttpCode(200)
  async recuperar(@Body() dto: RecuperarDto, @Ip() ip: string) {
    const r = solicitudes.get(ip);
    if (r && Date.now() - r.desde < VENTANA && r.n >= 5) throw new HttpException('Demasiadas solicitudes; espera unos minutos', HttpStatus.TOO_MANY_REQUESTS);
    const x = r && Date.now() - r.desde < VENTANA ? r : { n: 0, desde: Date.now() };
    solicitudes.set(ip, { ...x, n: x.n + 1 });
    if (!correoConfigurado()) return { ok: true };
    const usuario = dto.usuario.trim().toLowerCase();
    const acceso = dto.usuario.trim().toUpperCase().replace(/^MTC-?([AB])(\d{4})$/, 'MTC-$1$2');
    const u = await this.prisma.usuario.findFirst({ where: { OR: [{ correo: usuario }, { identificadorAcceso: acceso }], activo: true }, include: { aspirante: { select: { correo: true } } } });
    // Aspirantes cuya cuenta usa un correo interno: se manda al correo que registraron en su solicitud
    const destino = correoReal(u?.correo) ?? correoReal(u?.aspirante?.correo);
    if (!u || !destino) return { ok: true };
    // Un enlace a la vez: si se pidió hace menos de 2 minutos, no se manda otro
    const reciente = await this.prisma.tokenRecuperacion.findFirst({ where: { usuarioId: u.id, usadoEn: null, creadoEn: { gt: new Date(Date.now() - 2 * 60_000) } } });
    if (reciente) return { ok: true };
    const token = randomBytes(32).toString('base64url');
    await this.prisma.tokenRecuperacion.updateMany({ where: { usuarioId: u.id, usadoEn: null }, data: { usadoEn: new Date() } });
    await this.prisma.tokenRecuperacion.create({ data: { usuarioId: u.id, hashToken: hashToken(token), expiraEn: new Date(Date.now() + VIGENCIA_ENLACE_MIN * 60_000) } });
    await this.prisma.eventoBitacora.create({ data: { entidad: 'Acceso', entidadId: u.id, accion: 'Pidió restablecer su contraseña por correo', actor: u.nombre, detalle: { ip } } });
    // Se envía en segundo plano: la respuesta tarda lo mismo exista o no la cuenta
    void enviarCorreo({
      para: destino,
      asunto: 'Restablecer tu contraseña de SIGAP',
      texto: `Hola, ${u.nombre}:\n\nRecibimos una solicitud para restablecer la contraseña de tu cuenta de SIGAP${u.identificadorAcceso && u.area === 'ASPIRANTES' ? ` (usuario ${u.identificadorAcceso})` : ''}. El enlace sirve una sola vez y vence en ${VIGENCIA_ENLACE_MIN} minutos.\n\nSi no lo pediste, ignora este correo: tu contraseña no cambiará.`,
      boton: { texto: 'Restablecer mi contraseña', url: `${urlSigap()}/restablecer-contrasena?token=${token}` },
    }).catch((e: unknown) => this.log.error(`No se pudo enviar el correo a la cuenta ${u.id}: ${e instanceof Error ? e.message : String(e)}`));
    return { ok: true };
  }

  /** Cambia la contraseña con el enlace que llegó por correo (una sola vez, antes de que venza). */
  @Post('restablecer')
  @HttpCode(200)
  async restablecer(@Body() dto: RestablecerDto) {
    const t = await this.prisma.tokenRecuperacion.findUnique({ where: { hashToken: hashToken(dto.token) }, include: { usuario: true } });
    if (!t || t.usadoEn || t.expiraEn < new Date() || !t.usuario.activo) throw new BadRequestException('El enlace ya no es válido: venció o ya se usó. Pide uno nuevo.');
    const ahora = new Date();
    const r = await this.prisma.tokenRecuperacion.updateMany({ where: { id: t.id, usadoEn: null }, data: { usadoEn: ahora } });
    if (!r.count) throw new BadRequestException('El enlace ya se usó. Pide uno nuevo.');
    await this.prisma.$transaction([
      this.prisma.usuario.update({ where: { id: t.usuarioId }, data: { hashContrasena: await hash(dto.nueva, 12), debeCambiarContrasena: false, sesionesDesde: ahora } }),
      this.prisma.tokenRecuperacion.updateMany({ where: { usuarioId: t.usuarioId, usadoEn: null }, data: { usadoEn: ahora } }),
      this.prisma.eventoBitacora.create({ data: { entidad: 'Acceso', entidadId: t.usuarioId, accion: 'Restableció su contraseña con el enlace del correo', actor: t.usuario.nombre } }),
    ]);
    return { ok: true, usuario: t.usuario.area === 'ASPIRANTES' ? t.usuario.identificadorAcceso : t.usuario.correo };
  }

  private async perfil(id: string) {
    const u = await this.prisma.usuario.findUniqueOrThrow({ where: { id }, include: { roles: { include: { rol: true } } } });
    return {
      id: u.id,
      nombre: u.nombre,
      correo: u.correo,
      rol: ROL_FRONT[u.area],
      // Sesiones que puede abrir con la misma cuenta (su área principal y las adicionales)
      roles: [u.area, ...u.areasExtra.filter((a) => a !== u.area)].map((a) => ROL_FRONT[a]),
      puesto: u.area === 'ASPIRANTES' ? `Aspirante · ${u.identificadorAcceso ?? ''}` : u.roles.map((r) => r.rol.nombre).join(' · ') || u.area,
      profesorId: u.profesorId,
      debeCambiarContrasena: u.debeCambiarContrasena,
    };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Ip() ip: string) {
    const r = intentos.get(ip);
    if (r && Date.now() - r.desde < VENTANA && r.n >= 10) throw new HttpException('Demasiados intentos; espera unos minutos', HttpStatus.TOO_MANY_REQUESTS);
    const usuario = dto.usuario.trim().toLowerCase();
    // Aspirantes: ID temporal "MTC-A2701" (también se acepta "MTCA2701" o en minúsculas)
    const acceso = dto.usuario.trim().toUpperCase().replace(/^MTC-?([AB])(\d{4})$/, 'MTC-$1$2');
    const u = await this.prisma.usuario.findFirst({
      where: { OR: [{ correo: usuario }, { identificadorAcceso: acceso }], activo: true },
    });
    const ok = !!u && (await compare(dto.contrasena, u.hashContrasena));
    await this.prisma.eventoBitacora.create({
      data: { entidad: 'Acceso', entidadId: u?.id ?? usuario, accion: ok ? 'Inició sesión' : 'Intento fallido', actor: u?.nombre ?? usuario, detalle: { ip } },
    });
    if (!ok || !u) {
      const x = r && Date.now() - r.desde < VENTANA ? r : { n: 0, desde: Date.now() };
      intentos.set(ip, { ...x, n: x.n + 1 });
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }
    intentos.delete(ip);
    await this.prisma.usuario.update({ where: { id: u.id }, data: { ultimoAccesoEn: new Date() } });
    const token = sign({ sub: u.id }, secretoJwt(), { expiresIn: '10h' });
    return { token, usuario: await this.perfil(u.id) };
  }

  @Get('yo')
  @UseGuards(AuthGuard)
  yo(@Req() req: { usuario: UsuarioSesion }) {
    return this.perfil(req.usuario.id);
  }

  @Post('contrasena')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async cambiar(@Req() req: { usuario: UsuarioSesion }, @Body() dto: CambioDto) {
    const u = await this.prisma.usuario.findUniqueOrThrow({ where: { id: req.usuario.id } });
    if (!(await compare(dto.actual, u.hashContrasena))) throw new BadRequestException('La contraseña actual no es correcta');
    if (dto.actual === dto.nueva) throw new BadRequestException('La nueva contraseña debe ser distinta');
    await this.prisma.usuario.update({ where: { id: u.id }, data: { hashContrasena: await hash(dto.nueva, 12), debeCambiarContrasena: false } });
    await this.prisma.eventoBitacora.create({ data: { entidad: 'Acceso', entidadId: u.id, accion: 'Cambió su contraseña', actor: u.nombre } });
    return { ok: true };
  }
}
