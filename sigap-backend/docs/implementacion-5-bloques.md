# Implementación inicial de los cinco bloques SIGAP

Este cambio añade una primera capa de endpoints de negocio basada en el esquema Prisma existente. No sustituye los módulos actuales de autenticación ni admisión.

## 1. Registro y expediente documental
- `POST /api/registro/postulaciones`: crea aspirante y postulación dentro de una transacción.
- `POST /api/registro/postulaciones/:folio/documentos/:clave`: carga PDF/JPG/PNG en almacenamiento privado.
- `PATCH /api/posgrado/postulaciones/:folio/documentos/:clave/revision`: registra aprobación, observación o prórroga y crea historial.
- `POST /api/posgrado/postulaciones/:folio/enviar-revision`: valida documentos obligatorios y cambia estado.

## 2. Evaluación
- Lectura/actualización de configuración por convocatoria y materias.
- Alta de grupos y sesiones propedéuticas.
- Captura de resultados y calificaciones por área.
- Publicación de resultados.

## 3. Dictamen e inscripción
- Registro del dictamen del Colegio y transición del estado de la postulación.
- Actualización de inscripción, dedicación, SICEP, fotografía y marcas de firma SIP-01/04/05/06/08. La formalización exige todos esos requisitos.

## 4. Actas SIP-12
- Endpoint de carga de PDF SIP-12 ligado a grupo y postulación, usando el catálogo de formatos existente.
- **Limitación conocida:** el esquema actual no modela todavía un expediente de acta por grupo con dos firmas independientes (docente/coordinación); este endpoint guarda la etapa y metadatos en `FormatoPostulacion.capturas`. Debe migrarse a `ActaSip12` antes de considerarlo definitivo.

## 5. Administración y servicios transversales
- CRUD inicial de roles y asignación de permisos existentes.
- Alta/listado de avisos y comunicados.
- Contenido editable guardado como JSON en registros internos de `Aviso` para no requerir una migración inmediata. **Es una solución transitoria**; sustituir por `ContenidoSistema` con auditoría y versionado.
- Notificaciones por correo, recordatorios automáticos, reportes agregados y gestión completa de usuarios quedan pendientes de integrar con un proveedor de correo y un modelo de permisos por endpoint.

## Seguridad y pruebas pendientes antes de producción
- El registro público no crea sesión ni contraseña; hace falta completar el flujo de verificación de correo/establecimiento de contraseña antes de habilitar acceso de aspirantes.
- Los archivos se almacenan fuera de la carpeta pública; configurar `STORAGE_DIR`, límites del proxy y respaldos.
- Ejecutar `npm run prisma:generate`, validación Prisma, compilación y pruebas contra PostgreSQL de pruebas antes de desplegar.
- Añadir DTO tipado a cada estructura anidada, rate limiting al registro/carga y pruebas de autorización por rol.
