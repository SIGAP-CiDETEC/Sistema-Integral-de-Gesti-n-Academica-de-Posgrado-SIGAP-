import { Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, Areas, type UsuarioSesion } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';

type Req_ = { usuario: UsuarioSesion };

/** Notificaciones en SIGAP del personal (p. ej. los cambios del seminario para los profesores). */
@Controller('notificaciones')
@UseGuards(AuthGuard)
@Areas('PROFESORES', 'POSGRADO', 'SUBDIRECCION', 'ADMINISTRADOR')
export class NotificacionesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async lista(@Req() r: Req_) {
    const ns = await this.prisma.notificacion.findMany({ where: { usuarioId: r.usuario.id }, orderBy: { creadoEn: 'desc' }, take: 100 });
    return {
      lista: ns.map((n) => ({ id: n.id, fecha: n.creadoEn.toISOString(), titulo: n.titulo, mensaje: n.mensaje, nueva: !n.leidaEn })),
      noLeidas: ns.filter((n) => !n.leidaEn).length,
    };
  }

  @Get('pendientes')
  async pendientes(@Req() r: Req_) {
    return { noLeidas: await this.prisma.notificacion.count({ where: { usuarioId: r.usuario.id, leidaEn: null } }) };
  }

  @Post('vistas')
  @HttpCode(200)
  async vistas(@Req() r: Req_) {
    await this.prisma.notificacion.updateMany({ where: { usuarioId: r.usuario.id, leidaEn: null }, data: { leidaEn: new Date() } });
    return { noLeidas: 0 };
  }
}
