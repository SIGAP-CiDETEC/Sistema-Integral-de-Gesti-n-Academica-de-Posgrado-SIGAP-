import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { UsuariosController } from './usuarios.controller';
import { AuthGuard } from './auth.guard';

@Module({ controllers: [AuthController, UsuariosController], providers: [AuthGuard], exports: [AuthGuard] })
export class AuthModule {}
