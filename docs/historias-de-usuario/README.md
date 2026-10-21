# Historias de usuario — Proceso de admisión (SIGAP)

**Sistema:** SIGAP · Sistema Integral de Gestión Académica de Posgrado
**Programa:** Maestría en Tecnología de Cómputo — CIDETEC-IPN
**Alcance:** únicamente el **proceso de admisión completo**, desde que la convocatoria se publica hasta que el Departamento de Posgrado **publica el resultado** (resolución del Colegio de Profesores). La inscripción con Control Escolar (UTEyCV: SIP-04, SIP-01, SIP-05, SIP-06, SIP-08 y número SICEP) es un proceso posterior y **no** se incluye aquí.

## Actores

| Actor | Rol en la admisión | Archivo |
|---|---|---|
| Aspirante | Se registra, entrega documentos, se entrevista, se evalúa y consulta su resultado | [01-aspirante.md](01-aspirante.md) |
| Departamento de Posgrado (Analista y Jefatura) | Valida expedientes, publica horarios y entrevistas, gestiona la evaluación, define las fechas de las convocatorias, califica el examen (Jefatura), publica resultados y registra la resolución del Colegio | [02-departamento-posgrado.md](02-departamento-posgrado.md) |
| Profesores (colegiados y de asignatura) | Eligen sus entrevistas, reciben el registro del aspirante, integran los profesores entrevistadores (acta MTC-EC) y califican los grupos del propedéutico que imparten (y firman su acta SIP-12) | [03-profesores.md](03-profesores.md) |
| Coordinador del programa | Únicamente firma las actas de los cursos propedéuticos (SIP-12) que ya firmaron los docentes | [07-coordinador.md](07-coordinador.md) |
| Control Escolar (UTEyCV) | No interviene en la admisión: recibe a los admitidos para su inscripción | [04-uteycv.md](04-uteycv.md) |
| Subdirección Académica | Consulta todo el proceso sin intervenir | [05-subdireccion-academica.md](05-subdireccion-academica.md) |
| Administrador del sistema | Configura parámetros del proceso, roles, usuarios y revisa la bitácora de seguridad | [06-administrador.md](06-administrador.md) |

## Flujo del proceso

```
Convocatoria (A / B)
  └─ 1. Registro ............................ Aspirante           → SIP-02 → ID temporal (MTC-A27001)
  └─ 2. Documentos .......................... Aspirante / Posgrado → expediente validado
  └─ 3. Entrevista colegiada ................ Posgrado publica horarios → profesores los eligen → Posgrado publica la entrevista → acta MTC-EC firmada por 3
  └─ 4. Evaluación .......................... Aspirante / Profesores / Jefatura → propedéutico (lo califica el docente del grupo) o examen (lo califica la Jefatura)
  └─ 5. Resultados .......................... Posgrado publica      → segunda oportunidad si no acreditó un área
  └─ Comisión de Admisión y Colegio ......... Posgrado             → Aceptado · Con reservas · No aceptado (se publica en la fecha de la convocatoria)
  └─ 6. Dictamen final (informativo) ........ Posgrado publica      → fin del proceso de admisión
  └─ (Inscripción, proceso aparte) .......... Aspirante / UTEyCV    → SIP-04 lo llena el aspirante; SIP-08 lo elabora UTEyCV
```

## Formato de cada historia

- **ID:** `HU-<actor>-NN` (ASP, PG, PR, UT, SD, AD).
- **Historia:** *Como* <actor>, *quiero* <acción>, *para* <beneficio>.
- **Criterios de aceptación:** condiciones verificables (lo que debe pasar para darla por terminada).
- **Referencias:** requisitos funcionales (RF), reglas de negocio (RN) y casos de uso (CU) del documento de requerimientos.
- **Pantalla:** ruta del cascarón de Next.js donde ya está implementada.

## Reglas de negocio que aparecen en varias historias

| Regla | Resumen |
|---|---|
| RN-05 | Si la entrevista resulta **Rechazado**, el proceso concluye y se bloquea. |
| RN-07 | Los profesores entrevistadores lo forman **3 profesores**, colegiados con nombramiento vigente o de asignatura, que **eligen** las entrevistas cuyos horarios publica Posgrado (solo ven día y hora). |
| RN-08 | Quien no acredita una o las dos áreas del propedéutico puede presentar el examen de esas áreas; si no acredita el examen, el proceso concluye y se le invita a una nueva convocatoria. |
| RN-09 | La constancia de inglés la valida **solo** el Departamento de Posgrado. |
| RN-10 | La dedicación (tiempo completo o parcial) la **elige el aspirante** y aparece en su SIP-04 (que llena en Inscripción). |

## Resumen

| Actor | Historias |
|---|---|
| Aspirante | 15 |
| Departamento de Posgrado | 25 |
| Profesores | 9 |
| UTEyCV | 1 |
| Subdirección Académica | 4 |
| Administrador | 5 |
| **Total** | **59** |

## Pendientes fuera del alcance de la admisión

- **SIP-10 · Solicitud de reinscripción** (módulo del alumno): llevará la misma tabla de materias que el SIP-01, con botón **+** para agregar materias. Se construirá cuando se tenga la plantilla oficial del SIP-10.
