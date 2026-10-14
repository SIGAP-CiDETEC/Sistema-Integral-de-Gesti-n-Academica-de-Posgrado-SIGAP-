# Historias de usuario — Profesores del Colegio

[← Índice](README.md)

Los profesores participan en la admisión de dos formas: como **sínodo** de la entrevista colegiada (acta MTC-EC) y como **evaluadores** de su área (Matemáticas Discretas y Continuas o Programación).

---

### HU-PR-01 · Ver mis pendientes del proceso de admisión
**Como** profesor, **quiero** ver en mi inicio lo que me toca hacer, **para** no dejar pendientes entrevistas ni calificaciones.

**Criterios de aceptación**
- Veo indicadores: entrevistas por realizar, actas por firmar, calificaciones por capturar y entrevistas dictaminadas.
- Veo las listas de entrevistas pendientes y de calificaciones por capturar, con acceso directo a cada una.

**Referencias:** RF-10, RF-16
**Pantalla:** `/profesor`

---

### HU-PR-02 · Consultar las entrevistas en las que soy sínodo
**Como** profesor, **quiero** ver solo las entrevistas en las que formo parte del sínodo, **para** prepararme.

**Criterios de aceptación**
- La lista muestra aspirante, fecha, hora, modalidad, sala, los 3 integrantes del sínodo y el estado del acta (por realizar, por firmar, esperando firmas, dictaminada).
- Si entro a una entrevista en la que no soy sínodo, el sistema me lo indica y no me deja llenar el acta.
- En cada entrevista veo los datos principales del aspirante (procedencia, promedio, correo, documentos aprobados).

**Referencias:** RF-10 · RN-07
**Pantalla:** `/profesor/entrevistas`, `/profesor/entrevistas/[id]`

---

### HU-PR-03 · Llenar la hoja 1 del acta (entrevista al aspirante)
**Como** profesor del sínodo, **quiero** registrar las respuestas del aspirante durante la entrevista, **para** que queden en el acta oficial MTC-EC.

**Criterios de aceptación**
- Capturo:
  - tres áreas de interés para la tesis, en orden de preferencia y sin repetir;
  - si solicitará beca SECIHTI y si continuaría sin beca;
  - profesor de interés (con nombre si responde "Sí");
  - preferencia de horario;
  - si tiene dos habilidades de inglés acreditadas;
  - si tiene certificado de estudios;
  - argumentación final del aspirante.
- El promedio y la escuela de procedencia se toman del registro del aspirante.

**Referencias:** RF-12
**Pantalla:** `/profesor/entrevistas/[id]`

---

### HU-PR-04 · Llenar la hoja 2 del acta (conclusiones del sínodo)
**Como** profesor del sínodo, **quiero** registrar las conclusiones de la entrevista, **para** dejar el dictamen del sínodo.

**Criterios de aceptación**
- Califico cada consideración como Muy buena, Buena, Regular, Mala (y No aplica en las laborales):
  - congruencia de formación académica;
  - motivación y conocimiento del programa;
  - congruencia de experiencias profesionales;
  - condiciones laborales para continuar los estudios;
  - condiciones personales;
  - entorno familiar.
- Capturo proyección a futuro y observaciones generales.
- Elijo "¿Continuar proceso de admisión?": **Sí** (Aprobado), **Con reservas** o **No** (Rechazado). La entrevista no lleva ponderación.
- Con "Con reservas" o "No", el motivo es obligatorio.
- No puedo guardar mientras falte algún dato; el sistema me dice qué falta.

**Referencias:** RF-12 · RN-05
**Pantalla:** `/profesor/entrevistas/[id]`

---

### HU-PR-05 · Firmar el acta y aplicar el dictamen
**Como** profesor del sínodo, **quiero** firmar el acta en el sistema, **para** que el dictamen de la entrevista quede oficial cuando firmemos los tres.

**Criterios de aceptación**
- Al guardar el acta, queda firmada por quien la llenó; los otros dos profesores la revisan y la firman.
- Quien la llenó puede corregirla mientras nadie más la haya firmado.
- Con la **tercera firma**, el dictamen se aplica automáticamente:
  - **Aprobado** o **Con reservas**: el aspirante pasa a evaluación;
  - **Rechazado**: el proceso concluye (RN-05).
- Al aplicarse el dictamen, se avisa al aspirante y se registra en la bitácora a nombre de cada profesor.

**Referencias:** RF-12 · RN-05, RN-07
**Pantalla:** `/profesor/entrevistas/[id]`

---

### HU-PR-06 · Descargar el acta MTC-EC en PDF
**Como** profesor, **quiero** descargar el acta llenada sobre la plantilla oficial, **para** imprimirla o archivarla.

**Criterios de aceptación**
- El PDF contiene las dos hojas del formato MTC-EC con todos los datos capturados y los nombres de los entrevistadores, indicando quién firmó en SIGAP.
- La descarga también está disponible para Posgrado.

**Referencias:** RF-12
**Pantalla:** `/profesor/entrevistas/[id]`, `/posgrado/entrevistas/[id]`

---

### HU-PR-07 · Capturar las calificaciones de mi área
**Como** profesor evaluador, **quiero** capturar la calificación de mi área para cada aspirante, **para** que Posgrado pueda publicar sus resultados.

**Criterios de aceptación**
- Solo veo a los aspirantes y el área que me corresponde (p. ej. Programación), separados en curso propedéutico (con su grupo) y examen de admisión, incluido el examen de segunda oportunidad.
- La calificación es de 0 a 10; el sistema indica si el área queda acreditada (mínima aprobatoria por área: 8.0, configurable por convocatoria).
- Una vez capturada, se muestra como capturada con su fecha y ya no se edita.
- Cuando todas las áreas de un aspirante están capturadas, el resultado queda listo "sin publicar" para Posgrado; el aspirante no lo ve todavía.

**Referencias:** RF-16 · RN-08
**Pantalla:** `/profesor/evaluacion`
