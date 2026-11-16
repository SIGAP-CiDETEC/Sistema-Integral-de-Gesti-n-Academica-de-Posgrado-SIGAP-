import { ArrayMaxSize, ArrayMinSize, IsArray, IsObject, Matches } from 'class-validator';
import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Ip, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, Areas, type UsuarioSesion } from '../auth/auth.guard';
import { RegistroService } from './registro.service';

class RegistroDto {
  @IsObject() respuestas!: Record<string, unknown>;
}
class AccesosDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(200) @Matches(/^[A-Z0-9]{4,20}$/, { each: true }) folios!: string[];
}

// Freno de registros: 10 por hora por IP
const VENTANA = 60 * 60_000;
const intentos = new Map<string, { n: number; desde: number }>();

/** Registro en línea (público, solo con convocatoria abierta). */
@Controller('registro')
export class RegistroController {
  constructor(private readonly s: RegistroService) {}

  @Post()
  @HttpCode(200)
  registrar(@Body() d: RegistroDto, @Ip() ip: string) {
    const r = intentos.get(ip);
    const x = r && Date.now() - r.desde < VENTANA ? r : { n: 0, desde: Date.now() };
    if (x.n >= 10) throw new HttpException('Demasiados registros desde esta conexión; inténtalo más tarde', HttpStatus.TOO_MANY_REQUESTS);
    intentos.set(ip, { ...x, n: x.n + 1 });
    return this.s.registrar(d.respuestas);
  }
}

/** Posgrado entrega la contraseña temporal a quienes se registraron en línea (el correo aún no se envía). */
@Controller('aspirantes-accesos')
@UseGuards(AuthGuard)
@Areas('POSGRADO')
export class AccesosAspirantesController {
  constructor(private readonly s: RegistroService) {}

  @Get()
  pendientes() {
    return this.s.accesosPendientes();
  }

  @Post()
  @HttpCode(200)
  generar(@Body() d: AccesosDto, @Req() r: { usuario: UsuarioSesion }) {
    return this.s.generarAccesos(d.folios, r.usuario);
  }
}
