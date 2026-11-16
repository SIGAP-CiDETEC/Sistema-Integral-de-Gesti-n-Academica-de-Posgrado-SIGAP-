import { Body, Controller, Get, HttpCode, NotFoundException, Param, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import type { Response } from 'express';
import { AuthGuard, Areas, type UsuarioSesion } from '../auth/auth.guard';
import { existeArchivo, rutaAlmacen } from '../comun/almacen';
import { PortalService } from './portal.service';

class EleccionDto {
  @IsIn(['propedeutico', 'examen']) modalidad!: string;
  @IsOptional() @IsObject() grupos?: Record<string, string>;
}
class DatosDto {
  @IsString() @MaxLength(80) nombres!: string;
  @IsString() @MaxLength(80) apellidoPaterno!: string;
  @IsString() @MaxLength(80) apellidoMaterno!: string;
  @IsString() @MaxLength(18) curp!: string;
  @IsString() @MaxLength(120) correo!: string;
  @IsString() @MaxLength(20) telefono!: string;
  @IsString() @MaxLength(200) procedencia!: string;
  @IsString() @MaxLength(200) carrera!: string;
  @IsString() @MaxLength(10) promedio!: string;
}

type Req_ = { usuario: UsuarioSesion };
const CLAVE = /^[a-z0-9-]{2,40}$/;

/** Portal del aspirante (servidor real). */
@Controller('portal')
@UseGuards(AuthGuard)
@Areas('ASPIRANTES')
export class PortalController {
  constructor(private readonly s: PortalService) {}

  @Get('yo')
  yo(@Req() r: Req_) {
    return this.s.yo(r.usuario);
  }

  @Post('eleccion')
  @HttpCode(200)
  elegir(@Req() r: Req_, @Body() d: EleccionDto) {
    return this.s.elegir(r.usuario, d);
  }

  @Get('registro')
  registro(@Req() r: Req_) {
    return this.s.registro(r.usuario);
  }

  @Post('registro/verificar')
  @HttpCode(200)
  verificar(@Req() r: Req_, @Body() d: DatosDto) {
    return this.s.verificar(r.usuario, d);
  }

  @Get('documentos')
  documentos(@Req() r: Req_) {
    return this.s.documentos(r.usuario);
  }

  @Post('documentos/:clave')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: 20 * 1024 * 1024, files: 1 } }))
  subir(@Req() r: Req_, @Param('clave') clave: string, @UploadedFile() archivo: Express.Multer.File | undefined) {
    if (!CLAVE.test(clave)) throw new NotFoundException('Ese documento no forma parte de tu expediente');
    return this.s.subirDocumento(r.usuario, clave, archivo);
  }

  @Get('documentos/:clave')
  async ver(@Req() r: Req_, @Param('clave') clave: string, @Res() res: Response) {
    if (!CLAVE.test(clave)) throw new NotFoundException('Documento no disponible');
    const a = await this.s.archivoPropio(r.usuario, clave);
    if (!existeArchivo(a.ruta)) throw new NotFoundException('Documento no disponible');
    res.setHeader('Content-Disposition', `inline; filename="${a.nombre}"`);
    res.sendFile(rutaAlmacen(a.ruta));
  }

  @Get('notificaciones')
  notificaciones(@Req() r: Req_) {
    return this.s.notificaciones(r.usuario);
  }

  @Post('notificaciones/vistas')
  @HttpCode(200)
  vistas(@Req() r: Req_) {
    return this.s.notificacionesVistas(r.usuario);
  }
}
