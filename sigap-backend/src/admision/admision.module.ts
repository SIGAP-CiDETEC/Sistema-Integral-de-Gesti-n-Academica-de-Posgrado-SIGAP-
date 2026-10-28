import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdmisionController } from './admision.controller';
import { AdmisionService } from './admision.service';
import { AlmacenController, AlmacenPublicoController } from './almacen.controller';

@Module({ imports: [AuthModule], controllers: [AdmisionController, AlmacenPublicoController, AlmacenController], providers: [AdmisionService] })
export class AdmisionModule {}
