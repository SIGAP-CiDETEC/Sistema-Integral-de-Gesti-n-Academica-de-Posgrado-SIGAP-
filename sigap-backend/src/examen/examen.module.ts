import { Module } from '@nestjs/common';
import { AdmisionModule } from '../admision/admision.module';
import { AuthModule } from '../auth/auth.module';
import { ExamenController, PortalExamenController } from './examen.controller';
import { ExamenService } from './examen.service';

@Module({ imports: [AuthModule, AdmisionModule], controllers: [ExamenController, PortalExamenController], providers: [ExamenService] })
export class ExamenModule {}
