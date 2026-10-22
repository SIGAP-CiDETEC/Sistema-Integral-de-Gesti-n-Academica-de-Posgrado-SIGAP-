import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdmisionController } from './admision.controller';
import { AdmisionService } from './admision.service';

@Module({ imports: [AuthModule], controllers: [AdmisionController], providers: [AdmisionService] })
export class AdmisionModule {}
