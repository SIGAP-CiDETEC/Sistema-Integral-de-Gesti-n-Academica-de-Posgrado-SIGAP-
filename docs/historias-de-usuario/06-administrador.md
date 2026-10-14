# Historias de usuario — Administrador del sistema

[← Índice](README.md)

---

### HU-AD-01 · Configurar las convocatorias A y B
**Como** administrador, **quiero** configurar cada convocatoria, **para** controlar cuándo pueden registrarse los aspirantes.

**Criterios de aceptación**
- Por convocatoria (A y B) edito nombre (p. ej. "Convocatoria de admisión A-27"), estado **Abierta/Cerrada** y fechas de inicio y cierre del registro.
- Configuro el **límite de tamaño por archivo (MB)** que aplica a los documentos de los aspirantes.
- Debo confirmar los cambios antes de guardarlos; quedan en la bitácora de administración.
- Si una convocatoria está cerrada, el inicio muestra "Registro no disponible" y no permite registrarse.

**Referencias:** RF-81
**Pantalla:** `/admin/convocatoria`

---

### HU-AD-02 · Administrar roles y permisos por área
**Como** administrador, **quiero** definir roles con permisos por área, **para** que cada persona vea solo lo que le corresponde (menor privilegio).

**Criterios de aceptación**
- Las áreas son Departamento de Posgrado, Control Escolar (UTEyCV), Subdirección Académica y Profesores (Colegio).
- Cada permiso abre una sección del área. Ejemplos:
  - revisar expedientes;
  - programar entrevistas;
  - gestionar la evaluación;
  - comisión;
  - comunicados;
  - calendario (Jefatura);
  - dictamen SIP-04;
  - entrevistas del sínodo;
  - calificaciones.
- Puedo crear, editar y eliminar roles; los roles base no se eliminan.
- Los cambios aplican de inmediato a las sesiones abiertas.

**Referencias:** RF-79 · RNF-01
**Pantalla:** `/admin/roles`

---

### HU-AD-03 · Dar de alta usuarios auxiliares
**Como** administrador, **quiero** dar de alta a secretarias y analistas con un rol, **para** que apoyen en el proceso con su propia cuenta.

**Criterios de aceptación**
- Capturo nombre, correo institucional, contraseña inicial y rol (filtrado por área).
- Puedo activar o desactivar cualquier cuenta; una cuenta desactivada no puede iniciar sesión y su sesión abierta deja de valer.

**Referencias:** RF-80
**Pantalla:** `/admin/usuarios`

---

### HU-AD-04 · Consultar la bitácora de administración y seguridad
**Como** administrador, **quiero** ver los accesos y cambios administrativos, **para** auditar el uso del sistema.

**Criterios de aceptación**
- Se registran los inicios de sesión exitosos y fallidos del personal, y los cambios a usuarios, roles y convocatorias.
- Puedo filtrar por módulo y exportar a CSV.

**Referencias:** RF-82 · RNF-11
**Pantalla:** `/admin/bitacora`

---

### HU-AD-05 · Proteger el acceso a cada sesión
**Como** administrador, **quiero** que cada área solo pueda entrar a su propia sesión, **para** proteger la información de los aspirantes.

**Criterios de aceptación**
- Sin sesión, cualquier pantalla del personal redirige al inicio de sesión.
- Una cuenta de un área no puede abrir pantallas de otra área.
- Si un rol no tiene el permiso de una sección, se muestra "No tienes acceso a esta sección" aunque se entre por URL.

**Referencias:** RF-32, RF-80 · RNF-01
**Pantalla:** todas las de personal
