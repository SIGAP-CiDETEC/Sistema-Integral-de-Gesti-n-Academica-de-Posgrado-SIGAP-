import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Body, Controller, Get, HttpCode, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, Areas, type UsuarioSesion } from '../auth/auth.guard';
import { SeminarioService } from './seminario.service';

class ConfigDto {
  @IsString() @MaxLength(120) titulo!: string;
  @IsString() @MaxLength(300) lugar!: string;
  @IsArray() @ArrayMaxSize(40) @Matches(/^\d{4}-\d{2}-\d{2}$/, { each: true }) sesiones!: string[];
  @Matches(/^\d{2}:\d{2}$/) horaInicio!: string;
  @IsInt() @IsIn([10, 15, 20, 25, 30, 40, 45, 50, 60, 90, 120]) duracionMin!: number;
  @IsInt() @Min(1) @Max(20) espaciosPorSesion!: number;
  @IsBoolean() abierto!: boolean;
  @IsInt() @Min(1) @Max(10) maxPorProfesor!: number;
  @IsOptional() @IsObject() porSesion?: Record<string, { modalidad: 'presencial' | 'en-linea'; lugar: string }>;
}
class ConfigurarDto {
  @ValidateNested() @Type(() => ConfigDto) config!: ConfigDto;
  @IsOptional() @IsBoolean() forzar?: boolean;
}
const ESPACIO = /^\d{4}-\d{2}-\d{2}_\d{2}:\d{2}$/;
class ElegirDto {
  @Matches(ESPACIO) espacio!: string;
  @IsString() @MaxLength(160) laboratorio!: string;
}
class DejarDto {
  @Matches(ESPACIO) espacio!: string;
}
class AsignarDto {
  @Matches(ESPACIO) espacio!: string;
  @IsOptional() @IsString() @MaxLength(40) profesorId?: string | null;
  @IsOptional() @IsString() @MaxLength(160) laboratorio?: string;
}

type Req_ = { usuario: UsuarioSesion };

/** Seminario de Inducción: Posgrado define las sesiones; los profesores eligen día y hora; Posgrado también asigna. */
@Controller('seminario')
@UseGuards(AuthGuard)
export class SeminarioController {
  constructor(private readonly s: SeminarioService) {}

  @Get()
  @Areas('POSGRADO', 'SUBDIRECCION', 'PROFESORES')
  ver(@Req() r: Req_) {
    return this.s.ver(r.usuario);
  }

  @Put()
  @Areas('POSGRADO')
  configurar(@Body() d: ConfigurarDto, @Req() r: Req_) {
    return this.s.configurar(d.config, !!d.forzar, r.usuario);
  }

  @Post('elegir')
  @HttpCode(200)
  @Areas('PROFESORES')
  elegir(@Body() d: ElegirDto, @Req() r: Req_) {
    return this.s.elegir(d.espacio, d.laboratorio, r.usuario);
  }

  @Post('dejar')
  @HttpCode(200)
  @Areas('PROFESORES')
  dejar(@Body() d: DejarDto, @Req() r: Req_) {
    return this.s.dejar(d.espacio, r.usuario);
  }

  @Post('asignar')
  @HttpCode(200)
  @Areas('POSGRADO')
  asignar(@Body() d: AsignarDto, @Req() r: Req_) {
    return this.s.asignar(d.espacio, d.profesorId || null, d.laboratorio, r.usuario);
  }
}
