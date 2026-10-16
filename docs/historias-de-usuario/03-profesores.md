# Historias de usuario — Profesores del Colegio

[← Índice](README.md)

Pueden participar los **profesores colegiados con nombramiento vigente** y los **profesores de asignatura** (RN-07). Participan en la admisión de dos formas: como **sínodo** de la entrevista colegiada (acta MTC-EC) y como **evaluadores** de su área (Matemáticas Discretas y Continuas o Programación).

---

### HU-PR-01 · Ver mis pendientes del proceso de admisión
**Como** profesor, **quiero** ver en mi inicio lo que me toca hacer, **para** no dejar pendientes entrevistas ni calificaciones.

**Criterios de aceptación**
- Veo indicadores: actas MTC-EC por llenar, actas por subir firmadas, calificaciones por capturar y entrevistas disponibles para elegir.
- Veo las listas de entrevistas pendientes y de calificaciones por capturar, con acceso directo a cada una.

**Referencias:** RF-10, RF-16
**Pantalla:** `/profesor`

---

### HU-PR-02 · Consultar las entrevistas en las que soy sínodo
**Como** profesor, **quiero** ver solo las entrevistas en las que formo parte del sínodo, **para** prepararme.

**Criterios de aceptación**
- La lista muestra aspirante, fecha, hora, modalidad, sala, los integrantes del sínodo y el estado del acta (sínodo incompleto, esperando publicación, por llenar acta, por subir firmada, dictaminada).
- El acta se puede llenar cuando el sínodo tiene 3 profesores **y** Posgrado ya publicó la entrevista al aspirante.
- Si entro a una entrevista en la que no soy sínodo, el sistema me lo indica y no me deja llenar el acta.
- En cada entrevista veo los datos principales del aspirante (procedencia, promedio, correo, documentos aprobados).

**Referencias:** RF-10 · RN-07
**Pantalla:** `/profesor/entrevistas`, `/profesor/entrevistas/[id]`

---

### HU-PR-03 · Llenar la hoja 1 del acta (entrevista al aspirante)
**Como** profesor del sínodo, **quiero** registrar las respuestas del aspirante durante la entrevista, **para** que queden en el acta oficial MTC-EC.

**Criterios de aceptación**
- El formulario del acta **solo aparece cuando pulso "Llenar acta MTC-EC"**.
- Capturo:
  - tres áreas de interés para la tesis, en orden de preferencia y sin repetir;
  - si solicitará beca SECIHTI y si continuaría sin beca;
  - profesor de interés (con nombre si responde "Sí");
  - preferencia de horario;
  - si tiene dos habilidades de inglés acreditadas;
  - si tiene certificado de estudios;
  - argumentación final del aspirante.
- La hoja 1 llega **prellenada** con lo que el aspirante dio en su registro y expediente (áreas de interés, certificado, situación de su constancia de inglés, promedio y escuela); el sínodo la confirma o la corrige y completa lo demás durante la entrevista.

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

### HU-PR-05 · Subir el acta firmada por los 3 y aplicar el dictamen (cola)
**Como** profesor del sínodo, **quiero** que el acta se maneje como cola entre los tres, **para** no duplicar el trabajo y que el dictamen quede oficial con el acta firmada.

**Criterios de aceptación**
- El **primer** profesor del sínodo que llena el acta la bloquea: a los otros dos ya no les aparece la opción de llenarla, solo de **descargarla e imprimirla**.
- Quien la llenó puede corregirla mientras no se haya subido firmada.
- Los tres firman el acta impresa y cualquiera de ellos sube el **PDF firmado**; el **primero** que lo sube bloquea la subida para los demás (ven quién la subió y cuándo).
- Al subir el acta firmada, el dictamen se aplica automáticamente:
  - **Aprobado** o **Con reservas**: el aspirante pasa a evaluación;
  - **Rechazado**: el proceso concluye (RN-05).
- Al aplicarse el dictamen, se avisa al aspirante y queda en la bitácora a nombre de quien subió el acta.

**Referencias:** RF-12 · RN-05, RN-07
**Pantalla:** `/profesor/entrevistas/[id]`

---

### HU-PR-06 · Descargar el acta MTC-EC en PDF
**Como** profesor, **quiero** descargar el acta llenada sobre la plantilla oficial, **para** imprimirla o archivarla.

**Criterios de aceptación**
- El PDF contiene las dos hojas del formato MTC-EC con todos los datos capturados y los nombres de los entrevistadores, listo para imprimirse y firmarse.
- La descarga también está disponible para Posgrado.

**Referencias:** RF-12
**Pantalla:** `/profesor/entrevistas/[id]`, `/posgrado/entrevistas/[id]`

---

### HU-PR-07 · Capturar las calificaciones de los grupos del propedéutico que imparto
**Como** docente del curso propedéutico, **quiero** capturar la calificación de los aspirantes de mis grupos, **para** que Posgrado pueda publicar sus resultados.

**Criterios de aceptación**
- Solo veo a los aspirantes inscritos en los grupos que imparto (el docente de cada grupo lo asigna Posgrado), con el horario y lugar de cada grupo.
- El examen de admisión **no** lo califican los profesores: lo captura la Jefatura de Posgrado (HU-PG-22).
- La calificación es de 0 a 10; el sistema indica si el área queda acreditada (mínima aprobatoria por área: 8.0, configurable por convocatoria).
- Una vez capturada, se muestra con su fecha y la puedo **corregir hasta una semana después de la primera captura**, mientras Posgrado no publique el resultado; después ya no se edita.
- Cuando todas las áreas de un aspirante están capturadas, el resultado queda listo "sin publicar" para Posgrado; el aspirante no lo ve todavía.

**Referencias:** RF-16 · RN-08
**Pantalla:** `/profesor/evaluacion`

---

### HU-PR-08 · Elegir las entrevistas colegiadas en las que participo
**Como** profesor (colegiado o de asignatura), **quiero** elegir en qué entrevistas colegiadas participo, **para** organizar mi tiempo.

**Criterios de aceptación**
- Veo los horarios que Posgrado publicó y que tienen lugares libres en el sínodo, mostrando **solo el día y la hora** (y cuántos lugares quedan); no veo el nombre ni los datos del aspirante.
- Al elegir una, me integro al sínodo y ya veo los datos del aspirante en "Mis entrevistas".
- No puedo elegir una entrevista a la misma fecha y hora que otra en la que ya participo.
- Cuando el sínodo llega a 3 profesores, la entrevista deja de aparecer como disponible y queda lista para que Posgrado la publique al aspirante.
- Puedo **dejar mi lugar** mientras Posgrado no haya publicado la entrevista al aspirante.
- Elegir y dejar lugar queda en la bitácora a mi nombre.

**Referencias:** RF-10, RF-56 · RN-07
**Pantalla:** `/profesor/entrevistas`

---

### HU-PR-09 · Recibir el registro del aspirante
**Como** profesor del sínodo, **quiero** recibir los documentos del aspirante en cuanto me integro a su entrevista, **para** prepararla.

**Criterios de aceptación**
- En la entrevista veo "Documentos del aspirante" con el PDF del **Registro de admisión**: lo que el aspirante respondió en el primer formulario (formación, experiencia, motivos, intereses…).
- La hoja 1 del acta MTC-EC se llena con sus datos hasta que elijo "Llenar acta MTC-EC" (HU-PR-04).
- Lo veo desde que elijo la entrevista, aunque el sínodo aún no esté completo.

**Referencias:** RF-10, RF-12
**Pantalla:** `/profesor/entrevistas/[id]`
