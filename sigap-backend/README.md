# SIGAP Backend

API inicial de SIGAP construida con NestJS y Prisma. El frontend actual mantiene parte del estado en el navegador; este backend introduce una base persistente para centralizarlo.

## Requisitos e inicio

- Node.js 20 o superior
- PostgreSQL 15 o superior

```bash
cd sigap-backend
npm install
cp .env.example .env
# Edita DATABASE_URL para apuntar a tu PostgreSQL
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run start:dev
```

La API usa el prefijo `/api`; `GET /api/health` verifica que NestJS responde. Ejecuta `npm run prisma:studio` para revisar datos.

## Modelo inicial

El esquema parte de las pantallas y reglas ya presentes en `sigap-frontend`: registro por convocatoria, expediente documental con revisión y prórrogas, entrevistas con sínodo y acta MTC-EC, evaluación por modalidad/grupo/área, dictamen del Colegio, documentos SIP y transición posterior a alumno con registro SICEP. También contempla cuentas y roles por área, avisos, comunicados y bitácora.

`Postulacion.respuestasRegistro` conserva en JSON las respuestas variables del wizard para permitir cambios al formulario sin migrar una columna por pregunta. Identidad, convocatoria, etapas, archivos, revisiones, evaluaciones y dictámenes se modelan en tablas relacionadas. El esquema almacena metadatos y URL de los archivos; los binarios deben guardarse en un servicio de archivos, no en PostgreSQL.

La estructura del modelo puede verse en `prisma/schema.prisma`. Los catálogos oficiales de programas/unidades, campos requeridos por SICEP, políticas de retención y matriz final de permisos deben confirmarse antes de cargar información real. La validación del sínodo de tres personas y reglas de negocio entre etapas debe implementarse en servicios NestJS; Prisma por sí solo no las impone.

## Estructura

```text
src/
  health/       endpoint de salud
  prisma/       servicio y módulo global de Prisma
  app.module.ts composition de módulos
  main.ts       arranque, prefijo API y validación
prisma/
  schema.prisma modelo relacional PostgreSQL
```

Módulos de dominio sugeridos para la siguiente iteración: `auth`, `convocatorias`, `aspirantes`, `expedientes`, `entrevistas`, `evaluaciones`, `dictamenes` e `inscripciones`.
