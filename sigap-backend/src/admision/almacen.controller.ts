import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { Allow } from 'class-validator';
import { AuthGuard, Areas, type UsuarioSesion } from '../auth/auth.guard';
import { AdmisionService } from './admision.service';

/**
 * Datos compartidos que edita Posgrado. Cada clave tiene quién la puede leer:
 * - convocatorias y contenido: públicos (la página de inicio y el login los muestran a cualquiera).
 * - evaluacion: cualquier cuenta del personal (los profesores ven sus grupos).
 * - posgrado (comunicados, avisos, acta del Colegio, actas SIP-12): Posgrado y Subdirección.
 * Solo Posgrado los modifica.
 */
const LECTURA: Record<string, 'publico' | 'personal' | 'posgrado'> = { convocatorias: 'publico', contenido: 'publico', evaluacion: 'personal', posgrado: 'posgrado' };

class AlmacenDto {
  @Allow() valor!: unknown;
}

@Controller('almacen')
export class AlmacenPublicoController {
  constructor(private readonly s: AdmisionService) {}

  @Get('publico/:clave')
  leerPublico(@Param('clave') clave: string) {
    if (LECTURA[clave] !== 'publico') throw new ForbiddenException('Inicia sesión');
    return this.s.almacenLeer(clave).then((valor) => ({ valor }));
  }
}

@Controller('almacen')
@UseGuards(AuthGuard)
export class AlmacenController {
  constructor(private readonly s: AdmisionService) {}

  private clave(clave: string) {
    if (!LECTURA[clave]) throw new BadRequestException('Clave desconocida');
    return clave;
  }

  @Get(':clave')
  leer(@Param('clave') clave: string, @Req() r: { usuario: UsuarioSesion }) {
    const nivel = LECTURA[this.clave(clave)];
    if (nivel === 'posgrado' && !['POSGRADO', 'SUBDIRECCION'].includes(r.usuario.area)) throw new ForbiddenException('Tu cuenta no tiene acceso a esta sección');
    return this.s.almacenLeer(clave).then((valor) => ({ valor }));
  }

  @Put(':clave')
  @Areas('POSGRADO')
  guardar(@Param('clave') clave: string, @Body() d: AlmacenDto, @Req() r: { usuario: UsuarioSesion }) {
    return this.s.almacenGuardar(this.clave(clave), d.valor, r.usuario).then((valor) => ({ valor }));
  }
}
