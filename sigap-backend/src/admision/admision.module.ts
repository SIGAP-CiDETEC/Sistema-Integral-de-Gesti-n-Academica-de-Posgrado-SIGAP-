import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdmisionController } from './admision.controller';
import { AdmisionService } from './admision.service';
import { AlmacenController, AlmacenPublicoController } from './almacen.controller';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';

@Module({ imports: [AuthModule], controllers: [AdmisionController, AlmacenPublicoController, AlmacenController, PortalController], providers: [AdmisionService, PortalService] })
export class AdmisionModule {}
