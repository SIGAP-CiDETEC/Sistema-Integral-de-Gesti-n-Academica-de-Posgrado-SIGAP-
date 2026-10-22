import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AreaPersonal } from '../generated/prisma/client';
import { verify } from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';

export type UsuarioSesion = { id: string; nombre: string; correo: string; area: AreaPersonal; profesorId: string | null };

export const AREAS = 'areas';
/** Restringe una ruta a ciertas áreas del personal. */
export const Areas = (...areas: AreaPersonal[]) => SetMetadata(AREAS, areas);

export const secretoJwt = () => {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) throw new Error('Define JWT_SECRET (al menos 16 caracteres) en .env');
  return s;
};

/** Verifica el token (Authorization: Bearer …) y que la cuenta siga activa; aplica las áreas permitidas. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const h: string = req.headers.authorization ?? '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Inicia sesión');
    let id: string;
    try {
      id = (verify(token, secretoJwt()) as { sub: string }).sub;
    } catch {
      throw new UnauthorizedException('Tu sesión expiró; vuelve a iniciar sesión');
    }
    const u = await this.prisma.usuario.findUnique({ where: { id } });
    if (!u || !u.activo) throw new UnauthorizedException('Cuenta inactiva');
    req.usuario = { id: u.id, nombre: u.nombre, correo: u.correo, area: u.area, profesorId: u.profesorId } satisfies UsuarioSesion;
    const areas = this.reflector.getAllAndOverride<AreaPersonal[] | undefined>(AREAS, [ctx.getHandler(), ctx.getClass()]);
    if (areas?.length && !areas.includes(u.area)) throw new ForbiddenException('Tu cuenta no tiene acceso a esta sección');
    return true;
  }
}
