# Historias de usuario — Proceso de admisión (SIGAP)

**Sistema:** SIGAP · Sistema Integral de Gestión Académica de Posgrado
**Programa:** Maestría en Tecnología de Cómputo — CIDETEC-IPN
**Alcance:** únicamente el **proceso de admisión completo**, desde que la convocatoria se publica hasta que el aspirante recibe su **dictamen SIP-04**. La inscripción (número SICEP, SIP-01, SIP-05, SIP-06, SIP-08) es un proceso posterior y **no** se incluye aquí.

## Actores

| Actor | Rol en la admisión | Archivo |
|---|---|---|
| Aspirante | Se registra, entrega documentos, se entrevista, se evalúa y recibe su dictamen | [01-aspirante.md](01-aspirante.md) |
| Departamento de Posgrado (Analista y Jefatura) | Valida expedientes, programa entrevistas, gestiona la evaluación, publica resultados y registra la resolución del Colegio | [02-departamento-posgrado.md](02-departamento-posgrado.md) |
| Profesores del Colegio | Integran el sínodo de la entrevista (acta MTC-EC) y califican su área de la evaluación | [03-profesores.md](03-profesores.md) |
| Control Escolar (UTEyCV) | Elabora, recaba firmas y publica el dictamen SIP-04 | [04-uteycv.md](04-uteycv.md) |
| Subdirección Académica | Consulta todo el proceso sin intervenir | [05-subdireccion-academica.md](05-subdireccion-academica.md) |
| Administrador del sistema | Configura convocatorias, roles, usuarios y revisa la bitácora de seguridad | [06-administrador.md](06-administrador.md) |

## Flujo del proceso

```
Convocatoria (A / B)
  └─ 1. Registro ............................ Aspirante           → ID temporal (ASP-AAAA-NNN) + SIP-02
  └─ 2. Documentos .......................... Aspirante / Posgrado → expediente validado
  └─ 3. Entrevista colegiada ................ Posgrado / Profesores → acta MTC-EC firmada por 3 → Aprobado · Con reservas · Rechazado
  └─ 4. Evaluación .......................... Aspirante / Profesores → propedéutico o examen, calificación por área
  └─ 5. Resultados .......................... Posgrado publica      → segunda oportunidad si no acreditó un área
  └─ Comisión de Admisión y Colegio ......... Posgrado             → Aceptado · Condicionado · No aceptado
  └─ 6. Dictamen final (SIP-04) ............. UTEyCV               → fin del proceso de admisión
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
| RN-07 | El sínodo lo forman **exactamente 3 profesores colegiados con nombramiento vigente**. |
| RN-08 | Quien no acredita una o las dos áreas del propedéutico puede presentar el examen de esas áreas; si no acredita el examen, el proceso concluye y se le invita a una nueva convocatoria. |
| RN-09 | La constancia de inglés la valida **solo** el Departamento de Posgrado. |
| RN-10 | La dedicación (tiempo completo o parcial) la **elige el aspirante** y aparece en su SIP-04. |

## Resumen

| Actor | Historias |
|---|---|
| Aspirante | 15 |
| Departamento de Posgrado | 19 |
| Profesores | 7 |
| UTEyCV | 5 |
| Subdirección Académica | 4 |
| Administrador | 5 |
| **Total** | **55** |
