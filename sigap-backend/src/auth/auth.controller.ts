import { Body, Controller, Get, HttpCode, Ip, Post, Req, UnauthorizedException, UseGuards, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { sign } from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard, secretoJwt, type UsuarioSesion } from './auth.guard';

class LoginDto {
  @IsString() @MaxLength(120) usuario!: string;
  @IsString() @MaxLength(200) contrasena!: string;
}
class CambioDto {
  @IsString() actual!: string;
  @IsString() @MinLength(10) @MaxLength(200) nueva!: string;
}

/** Rol del front según el área de la cuenta. */
const ROL_FRONT: Record<string, string> = { POSGRADO: 'posgrado', PROFESORES: 'profesor', SUBDIRECCION: 'subdireccion', UTEYCV: 'uteycv', ADMINISTRADOR: 'admin', ASPIRANTES: 'aspirante' };

// Freno simple de intentos fallidos por IP (10 en 10 minutos)
const intentos = new Map<string, { n: number; desde: number }>();
const VENTANA = 10 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(private readonly prisma: PrismaService) {}

  private async perfil(id: string) {
    const u = await this.prisma.usuario.findUniqueOrThrow({ where: { id }, include: { roles: { include: { rol: true } } } });
    return {
      id: u.id,
      nombre: u.nombre,
      correo: u.correo,
      rol: ROL_FRONT[u.area],
      puesto: u.roles.map((r) => r.rol.nombre).join(' · ') || u.area,
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
    const u = await this.prisma.usuario.findFirst({
      where: { OR: [{ correo: usuario }, { identificadorAcceso: dto.usuario.trim().toUpperCase() }], activo: true },
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
