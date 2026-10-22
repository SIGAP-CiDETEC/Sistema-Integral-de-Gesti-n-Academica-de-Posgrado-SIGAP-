import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  // Detrás de Nginx: la IP real del cliente (para el freno de intentos de acceso y la bitácora)
  app.getHttpAdapter().getInstance().set('trust proxy', 'loopback');
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'] });
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  const port = Number(process.env.PORT ?? 4000);
  // Solo escucha en el propio servidor: el acceso de fuera entra por Nginx
  await app.listen(port, process.env.HOST ?? '127.0.0.1');
}

void bootstrap();
