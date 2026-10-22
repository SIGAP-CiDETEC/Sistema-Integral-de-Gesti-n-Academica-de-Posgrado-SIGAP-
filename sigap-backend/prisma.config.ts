import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { defineConfig } from 'prisma/config';

/**
 * Prisma sin binarios nativos: el cliente y las migraciones usan el adaptador de PostgreSQL
 * (motor en JavaScript/WASM incluido en npm). Así el despliegue no depende de descargar
 * motores de binaries.prisma.sh, que suele estar bloqueado en redes institucionales.
 */
export default defineConfig({
  experimental: { adapter: true },
  engine: 'js',
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'node dist/prisma/seed.js' },
  adapter: async () => new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
});
