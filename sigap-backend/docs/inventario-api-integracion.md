# Inventario e integración del backend SIGAP

Auditoría del contenido de `main` realizada el 22 de octubre de 2026. Este documento distingue lo que ya existe en el repositorio de lo que está propuesto en el paquete local `sigap-backend-api-pendiente.zip`. No sustituye pruebas de compilación ni de integración con PostgreSQL.

## Lo que ya existe en GitHub

La carpeta `sigap-backend/` ya contiene un backend NestJS + Prisma + PostgreSQL; no debe crearse otra carpeta anidada ni reemplazarse el proyecto completo.

- **Persistencia Prisma:** `prisma/schema.prisma` y migración inicial `prisma/migrations/20261022000000_init/migration.sql`.
- **Acceso a datos y arranque:** `src/prisma/`, `src/main.ts`, `src/app.module.ts` y `src/health/`.
- **Autenticación existente:** `src/auth/auth.controller.ts` y `src/auth/auth.guard.ts`. Expone inicio de sesión, perfil y cambio de contraseña. Usa el contrato `req.usuario`, token `token` y configuración de secreto propia.
- **Admisión ya implementada:** `src/admision/` incluye listado de aspirantes según área, profesores, bitácora, programación/publicación de entrevista, selección de sinodales, acta MTC-EC y descarga de acta/documentos con controles de acceso.
- **Herramientas y documentación:** `src/carga/`, `src/comun/`, `scripts/migrar.js`, `docs/modelo-datos.md`, `.env.example` y README.

## Qué aporta el paquete pendiente

El paquete propone un módulo transversal `src/api/` con operaciones para:

- convocatorias, unidades académicas y programas;
- postulaciones y respuestas de registro;
- catálogo, carga y revisión de documentos;
- catálogo y captura de formatos;
- configuración de evaluación, materias, grupos, sesiones y elecciones;
- resultados y calificaciones;
- entrevistas, actas, firmas y resoluciones del Colegio;
- inscripciones, documentos SIP y actas SIP-12;
- usuarios, roles, permisos y bitácora administrativa;
- avisos, comunicados, notificaciones y recordatorios;
- reportes y contenido configurable;
- expediente de alumno, tesis, programa individual y reinscripción.

La mayor parte de esas rutas **todavía no está registrada como controladores de dominio en el árbol actual**. El hecho de que existan modelos Prisma no significa que las operaciones HTTP estén implementadas.

## Por qué no se debe copiar el paquete completo encima del backend

1. **Autenticación duplicada e incompatible.** El repositorio ya implementa `AuthModule` con `AuthGuard`, `req.usuario` y JWT mediante `jsonwebtoken`. El paquete agrega otro guard basado en `@nestjs/jwt`, usa `req.user` y devuelve `accessToken`. Sustituir el módulo actual rompería contratos existentes; primero debe adaptarse el nuevo módulo al contrato actual o introducir una migración de contrato coordinada.
2. **La admisión ya tiene lógica de negocio.** `AdmisionService` y `AdmisionController` ya administran entrevistas y actas con permisos por área. Las rutas equivalentes del paquete no deben registrarse en paralelo porque producirían endpoints duplicados o reglas divergentes.
3. **Hay referencias de esquema que no existen todavía.** El esquema actual contiene modelos de admisión, evaluación, inscripción, cuentas, avisos y recordatorios, pero no define `ExpedienteAlumno`, `ContenidoSistema` ni `ActaSip12`. El parche local también pide agregar relaciones/campos a `Inscripcion`, `GrupoPropedeutico` y `CatalogoDocumento`. Esas adiciones requieren revisar relaciones y generar una migración Prisma consistente.
4. **Dependencias y configuración.** El paquete requiere integrar el módulo API y revisar dependencias/scripts sin borrar las configuraciones Prisma actuales. No se debe sobrescribir `package.json` ni `package-lock.json` con versiones del paquete.
5. **Seguridad.** Varias rutas del paquete reciben objetos `any` sin DTOs completos. Antes de exponerlas hay que validar entradas, autorizar por área/permiso y derivar el actor desde la sesión autenticada, no desde el cuerpo de la petición. Las operaciones destructivas y cambios de estado necesitan reglas de transición explícitas.

## Orden de integración recomendado

1. Mantener el backend existente como base y preservar `schema.prisma`, migraciones, `AuthModule` y `AdmisionModule`.
2. Mapear cada ruta pendiente a los modelos y nombres reales del esquema actual; reutilizar los servicios de admisión ya implementados.
3. Añadir primero los modelos y relaciones faltantes de expediente de alumno, contenido configurable y SIP-12; validar el esquema y generar una migración nueva en desarrollo, sin reescribir la migración inicial.
4. Incorporar el módulo API por familias, con DTOs, guards compatibles, permisos y pruebas; evitar una API genérica que permita escribir cualquier campo de Prisma.
5. Probar generación de cliente, validación de esquema, compilación NestJS y pruebas con una base PostgreSQL de desarrollo.
6. Documentar endpoints y contratos finales para que el frontend pueda consumirlos. La publicación del código no implica despliegue ni cambios en el servidor.

## Estado de verificación

- [x] Se inspeccionó el árbol de `main` y se identificaron los módulos existentes.
- [x] Se compararon los modelos declarados en el esquema con las propuestas del paquete.
- [ ] Compilación real con dependencias instaladas.
- [ ] Validación de Prisma y migración contra PostgreSQL de desarrollo.
- [ ] Pruebas de autorización y pruebas de integración de endpoints.
- [ ] Integración del módulo API pendiente.

No se realizaron cambios en el servidor ni en una base de datos de producción.
