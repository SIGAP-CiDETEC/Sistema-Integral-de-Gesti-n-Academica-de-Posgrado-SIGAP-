import {
  Body, Controller, Get, Param, Post, Put, Patch, Req, UploadedFile,
  UseGuards, UseInterceptors, UsePipes, ValidationPipe, HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  IsArray, IsBoolean, IsDateString, IsDefined, IsEmail, IsEnum, IsNumber, IsObject,
  IsOptional, IsString, Max, MaxLength, Min, MinLength,
} from 'class-validator';
import { AreaPersonal, EstadoDocumento, ModalidadCurso, TipoResultadoEvaluacion, ResolucionColegio, DedicacionInscripcion } from '../generated/prisma/client';
import { AuthGuard, Areas, type UsuarioSesion } from '../auth/auth.guard';
import { WorkflowsService } from './workflows.service';

type RequestWithUser = { usuario: UsuarioSesion };

class RegistroDto {
  @IsString() @MinLength(1) @MaxLength(100) nombres!: string;
  @IsString() @MinLength(1) @MaxLength(100) apellidoPaterno!: string;
  @IsOptional() @IsString() @MaxLength(100) apellidoMaterno?: string;
  @IsOptional() @IsString() @MaxLength(18) curp?: string;
  @IsEmail() @MaxLength(254) correo!: string;
  @IsOptional() @IsString() @MaxLength(30) telefono?: string;
  @IsString() convocatoriaId!: string;
  @IsString() programaId!: string;
  @IsObject() respuestasRegistro!: Record<string, unknown>;
}
class RevisionDocumentoDto {
  @IsEnum(EstadoDocumento) estado!: EstadoDocumento;
  @IsOptional() @IsString() @MaxLength(2000) observaciones?: string;
  @IsOptional() @IsDateString() prorrogaHasta?: string;
}
class ConfigEvaluacionDto {
  @IsDateString() inicioPropedeutico!: string;
  @IsDateString() finPropedeutico!: string;
  @IsEnum(ModalidadCurso) modalidadCurso!: ModalidadCurso;
  @IsString() @MaxLength(120) duracionPropedeutico!: string;
  @IsDateString() fechaExamen!: string;
  @IsString() @MaxLength(20) horaExamen!: string;
  @IsString() @MaxLength(250) lugarExamen!: string;
  @IsNumber() @Min(0) @Max(10) calificacionMinima!: number;
  @IsArray() materias!: Array<{ clave: string; nombre: string }>;
}
class GrupoDto {
  @IsString() materiaId!: string;
  @IsString() @MaxLength(50) clave!: string;
  @IsOptional() @IsString() @MaxLength(200) lugar?: string;
  @IsOptional() @IsString() docenteId?: string;
  @IsOptional() @IsArray() sesiones?: Array<{ dia: string; inicio: string; fin: string }>;
}
class CalificacionDto {
  @IsEnum(TipoResultadoEvaluacion) tipo!: TipoResultadoEvaluacion;
  @IsNumber() @Min(0) @Max(10) calificacion!: number;
  @IsBoolean() acreditado!: boolean;
  @IsOptional() @IsObject() areas?: Record<string, { calificacion: number; acreditado: boolean; profesorId?: string }>;
}
class DictamenDto {
  @IsEnum(ResolucionColegio) resolucion!: ResolucionColegio;
  @IsOptional() @IsDateString() fechaSesion?: string;
  @IsOptional() @IsString() @MaxLength(100) numeroSesion?: string;
}
class InscripcionDto {
  @IsOptional() @IsEnum(DedicacionInscripcion) dedicacion?: DedicacionInscripcion;
  @IsOptional() @IsBoolean() fotoRecibida?: boolean;
  @IsOptional() @IsString() @MaxLength(50) sicep?: string;
  @IsOptional() @IsBoolean() formalizar?: boolean;
  @IsOptional() @IsObject() firmas?: Record<string, boolean>;
}
class AvisoDto {
  @IsString() @MinLength(1) @MaxLength(180) titulo!: string;
  @IsString() @MinLength(1) @MaxLength(10000) mensaje!: string;
  @IsOptional() @IsBoolean() publico?: boolean;
  @IsOptional() @IsEnum(AreaPersonal) areaDestinataria?: AreaPersonal;
  @IsOptional() @IsDateString() iniciaEn?: string;
  @IsOptional() @IsDateString() terminaEn?: string;
}
class ComunicadoDto {
  @IsString() @MinLength(1) @MaxLength(180) titulo!: string;
  @IsString() @MinLength(1) @MaxLength(20000) contenido!: string;
  @IsOptional() @IsBoolean() publico?: boolean;
  @IsOptional() @IsEnum(AreaPersonal) areaDestinataria?: AreaPersonal;
}
class ContenidoDto {
  @IsDefined() valor!: unknown;
}
class RolDto {
  @IsString() @MinLength(2) @MaxLength(80) nombre!: string;
  @IsOptional() @IsString() @MaxLength(500) descripcion?: string;
  @IsOptional() @IsArray() permisos?: string[];
}

@Controller()
@UsePipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }))
export class WorkflowsController {
  constructor(private readonly s: WorkflowsService) {}

  // 1. Registro y expediente documental
  @Post('registro/postulaciones')
  registrar(@Body() d: RegistroDto) { return this.s.registrar(d); }

  @UseGuards(AuthGuard)
  @Post('registro/postulaciones/:folio/documentos/:clave')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  subirDocumento(@Param('folio') f: string, @Param('clave') c: string, @UploadedFile() file: Express.Multer.File | undefined, @Req() r: RequestWithUser) {
    return this.s.subirDocumento(f, c, file, r.usuario);
  }

  @UseGuards(AuthGuard)
  @Areas('POSGRADO', 'SUBDIRECCION')
  @Patch('posgrado/postulaciones/:folio/documentos/:clave/revision')
  revisarDocumento(@Param('folio') f: string, @Param('clave') c: string, @Body() d: RevisionDocumentoDto, @Req() r: RequestWithUser) {
    return this.s.revisarDocumento(f, c, d, r.usuario);
  }

  @UseGuards(AuthGuard)
  @Areas('POSGRADO', 'SUBDIRECCION')
  @Post('posgrado/postulaciones/:folio/enviar-revision')
  enviarRevision(@Param('folio') f: string, @Req() r: RequestWithUser) { return this.s.enviarRevision(f, r.usuario); }

  // 2. Evaluación
  @UseGuards(AuthGuard)
  @Areas('POSGRADO', 'SUBDIRECCION')
  @Get('evaluacion/convocatorias/:convocatoriaId/configuracion')
  obtenerConfiguracion(@Param('convocatoriaId') id: string) { return this.s.obtenerConfiguracion(id); }

  @UseGuards(AuthGuard)
  @Areas('POSGRADO', 'SUBDIRECCION')
  @Put('evaluacion/convocatorias/:convocatoriaId/configuracion')
  guardarConfiguracion(@Param('convocatoriaId') id: string, @Body() d: ConfigEvaluacionDto, @Req() r: RequestWithUser) {
    return this.s.guardarConfiguracion(id, d, r.usuario);
  }

  @UseGuards(AuthGuard)
  @Areas('POSGRADO', 'SUBDIRECCION')
  @Post('evaluacion/grupos')
  crearGrupo(@Body() d: GrupoDto, @Req() r: RequestWithUser) { return this.s.crearGrupo(d, r.usuario); }

  @UseGuards(AuthGuard)
  @Areas('POSGRADO', 'SUBDIRECCION')
  @Put('evaluacion/postulaciones/:folio/calificaciones')
  guardarCalificacion(@Param('folio') f: string, @Body() d: CalificacionDto, @Req() r: RequestWithUser) {
    return this.s.guardarCalificacion(f, d, r.usuario);
  }

  @UseGuards(AuthGuard)
  @Areas('POSGRADO', 'SUBDIRECCION')
  @Post('evaluacion/resultados/:tipo/publicar')
  @HttpCode(200)
  publicarResultados(@Param('tipo') tipo: TipoResultadoEvaluacion, @Req() r: RequestWithUser) { return this.s.publicarResultados(tipo, r.usuario); }

  // 3. Dictamen e inscripción
  @UseGuards(AuthGuard)
  @Areas('POSGRADO', 'SUBDIRECCION')
  @Put('colegio/postulaciones/:folio/dictamen')
  dictamen(@Param('folio') f: string, @Body() d: DictamenDto, @Req() r: RequestWithUser) { return this.s.dictamen(f, d, r.usuario); }

  @UseGuards(AuthGuard)
  @Areas('POSGRADO', 'SUBDIRECCION')
  @Put('inscripciones/postulaciones/:folio')
  inscripcion(@Param('folio') f: string, @Body() d: InscripcionDto, @Req() r: RequestWithUser) { return this.s.inscripcion(f, d, r.usuario); }

  // 4. SIP-12: primera integración sobre el catálogo de formatos existente.
  @UseGuards(AuthGuard)
  @Areas('PROFESORES', 'POSGRADO', 'SUBDIRECCION')
  @Post('sip12/:grupoId/postulaciones/:folio')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  subirSip12(@Param('grupoId') grupoId: string, @Param('folio') folio: string, @UploadedFile() file: Express.Multer.File | undefined, @Req() r: RequestWithUser) {
    return this.s.subirSip12(grupoId, folio, file, r.usuario);
  }

  // 5. Administración y servicios transversales
  @UseGuards(AuthGuard)
  @Areas('POSGRADO', 'SUBDIRECCION', 'ADMINISTRADOR')
  @Get('admin/roles')
  roles() { return this.s.roles(); }

  @UseGuards(AuthGuard)
  @Areas('ADMINISTRADOR')
  @Post('admin/roles')
  crearRol(@Body() d: RolDto) { return this.s.crearRol(d); }

  @UseGuards(AuthGuard)
  @Areas('ADMINISTRADOR')
  @Put('admin/roles/:id')
  actualizarRol(@Param('id') id: string, @Body() d: RolDto) { return this.s.actualizarRol(id, d); }

  @UseGuards(AuthGuard)
  @Areas('POSGRADO', 'SUBDIRECCION', 'ADMINISTRADOR')
  @Get('avisos')
  avisos(@Req() r: RequestWithUser) { return this.s.avisos(r.usuario); }

  @UseGuards(AuthGuard)
  @Areas('POSGRADO', 'SUBDIRECCION', 'ADMINISTRADOR')
  @Post('avisos')
  crearAviso(@Body() d: AvisoDto, @Req() r: RequestWithUser) { return this.s.crearAviso(d, r.usuario); }

  @UseGuards(AuthGuard)
  @Areas('POSGRADO', 'SUBDIRECCION', 'ADMINISTRADOR')
  @Post('comunicados')
  crearComunicado(@Body() d: ComunicadoDto, @Req() r: RequestWithUser) { return this.s.crearComunicado(d, r.usuario); }

  @UseGuards(AuthGuard)
  @Areas('POSGRADO', 'SUBDIRECCION', 'ADMINISTRADOR')
  @Post('comunicados/:id/publicar')
  @HttpCode(200)
  publicarComunicado(@Param('id') id: string) { return this.s.publicarComunicado(id); }

  @UseGuards(AuthGuard)
  @Areas('POSGRADO', 'SUBDIRECCION', 'ADMINISTRADOR')
  @Get('contenido')
  contenido() { return this.s.contenido(); }

  @UseGuards(AuthGuard)
  @Areas('ADMINISTRADOR')
  @Put('contenido/:clave')
  guardarContenido(@Param('clave') clave: string, @Body() d: ContenidoDto) { return this.s.guardarContenido(clave, d.valor); }
}
