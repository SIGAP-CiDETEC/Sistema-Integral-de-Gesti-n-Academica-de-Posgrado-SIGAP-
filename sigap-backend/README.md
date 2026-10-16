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

El esquema parte de las pantallas y reglas ya presentes en `sigap-frontend`: registro por convocatoria, expediente documental con revisión y prórrogas, entrevistas con profesores entrevistadores y acta MTC-EC, evaluación por modalidad/grupo/área, dictamen del Colegio, documentos SIP y transición posterior a alumno con registro SICEP. También contempla cuentas y roles por área, avisos, comunicados y bitácora.

`Postulacion.respuestasRegistro` conserva en JSON las respuestas variables del wizard para permitir cambios al formulario sin migrar una columna por pregunta. Identidad, convocatoria, etapas, archivos, revisiones, evaluaciones y dictámenes se modelan en tablas relacionadas. El esquema almacena metadatos y URL de los archivos; los binarios deben guardarse en un servicio de archivos, no en PostgreSQL.

La estructura del modelo puede verse en `prisma/schema.prisma`. Los catálogos oficiales de programas/unidades, campos requeridos por SICEP, políticas de retención y matriz final de permisos deben confirmarse antes de cargar información real. La validación de los profesores entrevistadores de tres personas y reglas de negocio entre etapas debe implementarse en servicios NestJS; Prisma por sí solo no las impone.

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


## Recordatorios de evaluación

El esquema persiste recordatorios por postulación y canal en `RecordatorioProgramado`, con clave de idempotencia, fecha del evento, fecha programada, estado de entrega, intentos y error de último envío. Cada recordatorio se registra por separado para correo y notificación dentro de SIGAP; la clave idempotente debe incluir la postulación, el tipo de recordatorio, el canal y la fecha del evento para evitar duplicados entre aspirantes.

Reglas de programación alineadas con `sigap-frontend/src/lib/recordatorios.ts`:

- **Examen de admisión:** hasta tres avisos: una semana antes, un día antes y el mismo día a las 07:00. Los avisos de una semana y un día antes solo se programan si todavía son posteriores a la fecha/hora en que el aspirante eligió el examen.
- **Entrevista colegiada:** un día antes y una hora antes de la cita.
- Si cambia o se cancela la fecha del evento, el backend debe cancelar los avisos pendientes anteriores y regenerarlos; los envíos ya realizados se conservan como historial.
- La programación y el envío real deben ejecutarse en el backend mediante una cola de trabajos (por ejemplo, BullMQ); la simulación de envío del frontend con `localStorage` no constituye evidencia de entrega.
- Definir una zona horaria institucional y usarla consistentemente al convertir fechas locales a `DateTime` de PostgreSQL. No asumir que las 07:00 locales equivalen a UTC.

El esquema agrega la estructura persistente, pero no implementa por sí solo el planificador ni el envío de correo/notificaciones. Tras configurar `DATABASE_URL`, valida con `npm run prisma:validate` y genera la migración inicial en el entorno de desarrollo con `npm run prisma:migrate -- --name init`.


## Alineación con el flujo actual de SIGAP

El esquema también contempla los cambios recientes del frontend:

- Las convocatorias A y B tienen configuración independiente de evaluación y calendario publicado; su estado operativo debe calcularse con las fechas de apertura y cierre.
- La configuración de cada convocatoria guarda periodo/modalidad del propedéutico, fecha/hora/lugar del examen, materias, grupos, docentes y sesiones. `GrupoElegido` permite una selección por materia; los choques de horario deben validarse en el servicio antes de confirmar.
- `EleccionEvaluacion` registra si el aspirante eligió propedéutico o examen y su decisión de segunda oportunidad. `ResultadoEvaluacion` y `CalificacionArea` separan las calificaciones por área, quién las capturó y cuándo se publicaron.
- `Entrevista`, `IntegranteSinodo`, `ActaEntrevista` y `FirmaActaEntrevista` reflejan el horario publicado, la selección de hasta tres profesores, el acta MTC-EC y sus firmas. La regla de exactamente tres integrantes y el requisito de tener las tres firmas antes de aplicar/publicar la resolución se deben hacer cumplir en la lógica de negocio.
- `RegistroResolucionColegio` separa la resolución del Colegio de la inscripción posterior. `Inscripcion` y `DocumentoInscripcion` conservan la dedicación elegida, los estados de los formatos SIP, los archivos firmados y el número SICEP.
- Los documentos usan estados propios (`PENDIENTE`, `APROBADO`, `OBSERVADO`, `PRORROGA`) y permiten guardar observaciones y fecha límite de prórroga.

El esquema define la persistencia y las relaciones; las validaciones cruzadas (pertenencia de un grupo a su materia, choques de horario, promedio de áreas, nota mínima por convocatoria, habilitación de segunda oportunidad, profesores entrevistadores completos, publicación y transición a inscripción) deben validarse en servicios NestJS y transacciones. La configuración del frontend sigue siendo un cascarón local hasta que se conecte a estos endpoints.
