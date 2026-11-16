import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdmisionController } from './admision.controller';
import { AdmisionService } from './admision.service';
import { AlmacenController, AlmacenPublicoController } from './almacen.controller';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { AccesosAspirantesController, RegistroController } from './registro.controller';
import { RegistroService } from './registro.service';

@Module({ imports: [AuthModule], controllers: [AdmisionController, AlmacenPublicoController, AlmacenController, PortalController, RegistroController, AccesosAspirantesController], providers: [AdmisionService, PortalService, RegistroService] })
export class AdmisionModule {}
