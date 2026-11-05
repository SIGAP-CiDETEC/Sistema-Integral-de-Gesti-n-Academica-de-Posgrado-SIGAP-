import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { IsIn, IsObject, IsOptional } from 'class-validator';
import { AuthGuard, Areas, type UsuarioSesion } from '../auth/auth.guard';
import { PortalService } from './portal.service';

class EleccionDto {
  @IsIn(['propedeutico', 'examen']) modalidad!: string;
  @IsOptional() @IsObject() grupos?: Record<string, string>;
}

/** Portal del aspirante (servidor real). */
@Controller('portal')
@UseGuards(AuthGuard)
@Areas('ASPIRANTES')
export class PortalController {
  constructor(private readonly s: PortalService) {}

  @Get('yo')
  yo(@Req() r: { usuario: UsuarioSesion }) {
    return this.s.yo(r.usuario);
  }

  @Post('eleccion')
  @HttpCode(200)
  elegir(@Req() r: { usuario: UsuarioSesion }, @Body() d: EleccionDto) {
    return this.s.elegir(r.usuario, d);
  }
}
