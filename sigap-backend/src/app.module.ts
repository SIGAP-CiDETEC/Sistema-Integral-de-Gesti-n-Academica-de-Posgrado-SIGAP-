import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdmisionModule } from './admision/admision.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { WorkflowsModule } from './workflows/workflows.module';

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, HealthModule, AuthModule, AdmisionModule, WorkflowsModule] })
export class AppModule {}
