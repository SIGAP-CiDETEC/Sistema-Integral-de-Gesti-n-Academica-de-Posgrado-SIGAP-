import { Body, Controller, Get, HttpCode, NotFoundException, Param, Patch, Post, Put, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsIn, IsInt, IsObject, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import type { Response } from 'express';
import { AuthGuard, Areas, type UsuarioSesion } from '../auth/auth.guard';
import { existeArchivo, rutaAlmacen } from '../comun/almacen';
import { AdmisionService } from './admision.service';

type Req_ = { usuario: UsuarioSesion };
const FOLIO = /^[A-Z0-9-]{4,20}$/;

class HorarioDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/) fecha!: string;
  @Matches(/^\d{2}:\d{2}$/) hora!: string;
  @IsOptional() @IsInt() @IsIn([20, 25, 30, 40, 45, 60, 90, 120]) duracion?: number;
  @IsIn(['Presencial', 'En línea']) modalidad!: string;
  @IsString() @MaxLength(2000) sala!: string;
}
class ProcesoDto {
  @IsObject() patch!: Record<string, unknown>;
  @IsString() @MaxLength(1000) accion!: string;
}
class RevisionDto {
  @IsIn(['aprobado', 'observado', 'prorroga', 'pendiente']) estado!: string;
  @IsOptional() @IsString() @MaxLength(2000) observacion?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) prorrogaHasta?: string;
  @IsOptional() @IsString() @MaxLength(1000) accion?: string;
}
class EvaluacionDto {
  @IsObject() evaluacion!: Record<string, unknown>;
  @IsString() @MaxLength(1000) accion!: string;
}
class BitacoraDto {
  @IsString() @MaxLength(1000) accion!: string;
  @IsOptional() @Matches(FOLIO) aspirante?: string;
}
class ActaDto {
  @IsObject() hoja1!: object;
  @IsObject() criterios!: object;
  @IsString() @MaxLength(4000) proyeccion!: string;
  @IsString() @MaxLength(4000) observaciones!: string;
  @IsIn(['Aprobado', 'Con reservas', 'Rechazado']) resolucion!: string;
  @IsString() @MaxLength(180) motivo!: string;
}

/** Proceso de admisión: entrevista colegiada (horarios, profesores entrevistadores y acta MTC-EC). */
@Controller()
@UseGuards(AuthGuard)
export class AdmisionController {
  constructor(private readonly s: AdmisionService) {}

  private folio(f: string) {
    if (!FOLIO.test(f)) throw new NotFoundException('No existe ese aspirante');
    return f;
  }

  @Get('aspirantes')
  @Areas('POSGRADO', 'SUBDIRECCION', 'PROFESORES')
  listar(@Req() r: Req_) {
    return this.s.listar(r.usuario);
  }

  @Get('profesores')
  @Areas('POSGRADO', 'SUBDIRECCION', 'PROFESORES')
  profesores() {
    return this.s.profesores();
  }

  @Get('bitacora')
  @Areas('POSGRADO', 'SUBDIRECCION')
  bitacora() {
    return this.s.bitacora_();
  }

  @Post('bitacora')
  @Areas('POSGRADO')
  registrar(@Body() d: BitacoraDto, @Req() r: Req_) {
    return this.s.registrarEnBitacora(d.accion, r.usuario, d.aspirante).then(() => ({ ok: true }));
  }

  // ---------- Avance del proceso ----------

  @Patch('aspirantes/:folio/proceso')
  @Areas('POSGRADO')
  proceso(@Param('folio') f: string, @Body() d: ProcesoDto, @Req() r: Req_) {
    return this.s.actualizarProceso(this.folio(f), d.patch, d.accion, r.usuario);
  }

  @Put('aspirantes/:folio/documentos/:clave/revision')
  @Areas('POSGRADO')
  revision(@Param('folio') f: string, @Param('clave') clave: string, @Body() d: RevisionDto, @Req() r: Req_) {
    return this.s.revisarDocumento(this.folio(f), clave, d, r.usuario);
  }

  @Post('aspirantes/:folio/calificaciones')
  @HttpCode(200)
  @Areas('PROFESORES')
  calificaciones(@Param('folio') f: string, @Body() d: EvaluacionDto, @Req() r: Req_) {
    return this.s.capturarPropedeutico(this.folio(f), d.evaluacion, d.accion, r.usuario);
  }

  @Put('aspirantes/:folio/entrevista')
  @Areas('POSGRADO')
  horario(@Param('folio') f: string, @Body() d: HorarioDto, @Req() r: Req_) {
    return this.s.guardarHorario(this.folio(f), d, r.usuario);
  }

  @Post('aspirantes/:folio/entrevista/publicar-horario')
  @HttpCode(200)
  @Areas('POSGRADO')
  publicarHorario(@Param('folio') f: string, @Req() r: Req_) {
    return this.s.publicarHorario(this.folio(f), r.usuario);
  }

  @Post('aspirantes/:folio/entrevista/publicar')
  @HttpCode(200)
  @Areas('POSGRADO')
  publicar(@Param('folio') f: string, @Req() r: Req_) {
    return this.s.publicarEntrevista(this.folio(f), r.usuario);
  }

  @Post('aspirantes/:folio/entrevista/elegir')
  @HttpCode(200)
  @Areas('PROFESORES')
  elegir(@Param('folio') f: string, @Req() r: Req_) {
    return this.s.elegir(this.folio(f), r.usuario);
  }

  @Post('aspirantes/:folio/entrevista/dejar')
  @HttpCode(200)
  @Areas('PROFESORES')
  dejar(@Param('folio') f: string, @Req() r: Req_) {
    return this.s.dejar(this.folio(f), r.usuario);
  }

  @Put('aspirantes/:folio/acta')
  @Areas('PROFESORES')
  acta(@Param('folio') f: string, @Body() d: ActaDto, @Req() r: Req_) {
    return this.s.guardarActa(this.folio(f), d, r.usuario);
  }

  @Post('aspirantes/:folio/acta/descargada')
  @HttpCode(200)
  @Areas('PROFESORES')
  descargada(@Param('folio') f: string, @Req() r: Req_) {
    return this.s.marcarDescargada(this.folio(f), r.usuario);
  }

  @Post('aspirantes/:folio/acta/firmada')
  @HttpCode(200)
  @Areas('PROFESORES')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  subirFirmada(@Param('folio') f: string, @UploadedFile() archivo: Express.Multer.File | undefined, @Req() r: Req_) {
    return this.s.subirActaFirmada(this.folio(f), archivo, r.usuario);
  }

  @Get('aspirantes/:folio/acta/firmada')
  @Areas('POSGRADO', 'SUBDIRECCION', 'PROFESORES')
  async verFirmada(@Param('folio') f: string, @Req() r: Req_, @Res() res: Response) {
    const p = await this.s.puedeVerArchivos(this.folio(f), r.usuario);
    const ruta = p.entrevista?.acta?.firmadaArchivoRuta;
    if (!ruta || !existeArchivo(ruta)) throw new NotFoundException('El acta firmada aún no se sube');
    res.setHeader('Content-Disposition', `inline; filename="MTC-EC_${p.folio}.pdf"`);
    res.sendFile(rutaAlmacen(ruta));
  }

  @Get('aspirantes/:folio/documentos/:clave')
  @Areas('POSGRADO', 'SUBDIRECCION', 'PROFESORES')
  async documento(@Param('folio') f: string, @Param('clave') clave: string, @Req() r: Req_, @Res() res: Response) {
    const p = await this.s.puedeVerArchivos(this.folio(f), r.usuario, clave);
    const d = p.documentos.find((x) => x.catalogo.clave === clave);
    if (!d?.urlArchivo || !existeArchivo(d.urlArchivo)) throw new NotFoundException('Documento no disponible');
    res.setHeader('Content-Disposition', `inline; filename="${clave}_${p.folio}.pdf"`);
    res.sendFile(rutaAlmacen(d.urlArchivo));
  }
}
