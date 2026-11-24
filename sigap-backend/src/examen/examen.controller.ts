import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { Allow, IsBoolean, IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { AuthGuard, Areas, type UsuarioSesion } from '../auth/auth.guard';
import type { AreaFront, Pregunta } from './calificar';
import { ExamenService } from './examen.service';

type Req_ = { usuario: UsuarioSesion };
const FOLIO = /^[A-Z0-9-]{4,20}$/;
const AREA = ['matematicas', 'programacion'];

class PreguntaDto {
  @Allow() pregunta!: Pregunta;
}
class ImportarDto {
  @IsIn(AREA) area!: AreaFront;
  @Allow() preguntas!: Pregunta[];
  @IsOptional() @IsBoolean() reemplazar?: boolean;
}
class AplicacionDto {
  @IsString() @Matches(FOLIO) folio!: string;
  @IsIn(AREA) area!: AreaFront;
  @IsOptional() @IsBoolean() habilitar?: boolean;
}
class RespuestasDto {
  @Allow() respuestas!: Record<string, unknown>;
}
class IncidenteDto {
  @IsString() tipo!: string;
}

const area = (a: string) => {
  if (!AREA.includes(a)) throw new BadRequestException('Área inválida');
  return a as AreaFront;
};

/** Banco de preguntas y aplicación del examen en línea (personal). */
@Controller('examen')
@UseGuards(AuthGuard)
export class ExamenController {
  constructor(private readonly s: ExamenService) {}

  @Get('banco')
  @Areas('POSGRADO', 'SUBDIRECCION')
  banco() {
    return this.s.listarBanco();
  }

  @Put('banco/:id')
  @Areas('POSGRADO', 'SUBDIRECCION')
  guardar(@Param('id') id: string, @Body() d: PreguntaDto, @Req() r: Req_) {
    return this.s.guardarPregunta(id, d.pregunta, r.usuario);
  }

  @Delete('banco/:id')
  @Areas('POSGRADO', 'SUBDIRECCION')
  eliminar(@Param('id') id: string) {
    return this.s.eliminarPregunta(id);
  }

  @Post('banco/importar')
  @HttpCode(200)
  @Areas('POSGRADO', 'SUBDIRECCION')
  importar(@Body() d: ImportarDto, @Req() r: Req_) {
    return this.s.importar(d.area, d.preguntas, !!d.reemplazar, r.usuario);
  }

  @Get('aplicacion')
  @Areas('POSGRADO', 'SUBDIRECCION')
  aplicacion() {
    return this.s.aplicacion();
  }

  @Post('habilitar')
  @HttpCode(200)
  @Areas('POSGRADO')
  habilitar(@Body() d: AplicacionDto, @Req() r: Req_) {
    return this.s.habilitar(d.folio, d.area, d.habilitar !== false, r.usuario);
  }

  @Post('reiniciar')
  @HttpCode(200)
  @Areas('POSGRADO')
  reiniciar(@Body() d: AplicacionDto, @Req() r: Req_) {
    return this.s.reiniciar(d.folio, d.area, r.usuario);
  }

  @Post('registrado')
  @HttpCode(200)
  @Areas('POSGRADO')
  registrado(@Body() d: AplicacionDto) {
    return this.s.marcarRegistrado(d.folio, d.area);
  }
}

/** El aspirante presenta su examen en línea. */
@Controller('portal/examen')
@UseGuards(AuthGuard)
@Areas('ASPIRANTES')
export class PortalExamenController {
  constructor(private readonly s: ExamenService) {}

  @Get()
  ver(@Req() r: Req_) {
    return this.s.portal(r.usuario);
  }

  @Post(':area/iniciar')
  @HttpCode(200)
  iniciar(@Param('area') a: string, @Req() r: Req_) {
    return this.s.iniciar(r.usuario, area(a));
  }

  @Put(':area/respuestas')
  responder(@Param('area') a: string, @Body() d: RespuestasDto, @Req() r: Req_) {
    return this.s.responder(r.usuario, area(a), d.respuestas);
  }

  @Post(':area/incidente')
  @HttpCode(200)
  incidente(@Param('area') a: string, @Body() d: IncidenteDto, @Req() r: Req_) {
    return this.s.incidente(r.usuario, area(a), d.tipo);
  }

  @Post(':area/entregar')
  @HttpCode(200)
  entregar(@Param('area') a: string, @Body() d: Partial<RespuestasDto>, @Req() r: Req_) {
    return this.s.entregar(r.usuario, area(a), d?.respuestas);
  }
}
