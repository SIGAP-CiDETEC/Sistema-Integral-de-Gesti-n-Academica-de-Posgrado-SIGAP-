# Historias de usuario — Subdirección Académica

[← Índice](README.md)

La Subdirección Académica **solo consulta**: puede ver todo el proceso de admisión, pero no puede intervenir en él.

---

### HU-SD-01 · Ver el panorama del proceso de admisión
**Como** Subdirección Académica, **quiero** ver cuántos aspirantes hay en cada fase, **para** conocer el avance general de la convocatoria.

**Criterios de aceptación**
- Veo indicadores: aspirantes registrados, en proceso, admitidos por el Colegio y concluidos sin admisión.
- Veo una gráfica de barras por fase (registro, documentos, entrevista, evaluación, comisión, admitido, concluido sin admisión); cada aspirante cuenta en una sola fase.
- Veo las convocatorias (abierta o cerrada, periodo y fechas de registro) e indicadores como promedio de licenciatura, procedencia IPN, entrevistas aprobadas, evaluaciones acreditadas y admitidos.
- Veo el **calendario de cada convocatoria** (la imagen que publica la Jefatura de Posgrado), con sus fechas de registro y de publicación de resultados; al hacer clic se abre en grande.
- Se muestra un aviso permanente de "Solo consulta".

**Referencias:** RF-49 (consulta)
**Pantalla:** `/subdireccion`

---

### HU-SD-02 · Consultar la lista de aspirantes
**Como** Subdirección Académica, **quiero** ver la lista de aspirantes con sus datos principales, **para** conocer el perfil de quienes participan.

**Criterios de aceptación**
- La lista muestra nombre e ID, CURP, contacto (correo y teléfono), procedencia (institución y unidad académica), promedio, fecha de registro, avance, estado y **dictamen**: **Favorable**, **Con reservas** o **No favorable** (según la resolución del Colegio).
- Puedo buscar por nombre o ID y filtrar por fase (también desde las barras del panorama).
- Puedo descargar la lista filtrada en **CSV** (se abre directo en Excel) con **todo el proceso de admisión** de cada aspirante:
  - datos, procedencia en columnas separadas (**institución**, **unidad académica / escuela**, si es egresado del IPN) y promedio declarado y **validado por Posgrado**;
  - **1 · Registro**: completo o pendiente, y si entregó su SIP-02;
  - **2 · Documentos**: una columna por documento con su estado (no subido, subido · pendiente de validación, **resubido** · pendiente de validación, validado por Posgrado, con observación o en prórroga) y el estado del expediente;
  - **3 · Entrevista**: horario, estado, profesores entrevistadores, acta MTC-EC y dictamen de entrevista;
  - **4 · Evaluación**: modalidad, grupos, las **2 calificaciones del propedéutico** y su promedio, las **2 del examen** y su promedio, y el **promedio final**;
  - **5 · Resultados** de la evaluación publicados;
  - **6 · Dictamen final**: resolución del Colegio, dictamen (Favorable, Con reservas o No favorable) y fecha de publicación;
  - fase actual, estado y motivo de conclusión.
- El Departamento de Posgrado puede descargar el mismo CSV con todos los aspirantes (HU-PG-20).
- No aparece ningún botón para aprobar, validar, registrar o publicar.

**Referencias:** RF-49 (consulta)
**Pantalla:** `/subdireccion/aspirantes`

---

### HU-SD-03 · Consultar el proceso completo de un aspirante
**Como** Subdirección Académica, **quiero** ver paso a paso el proceso de un aspirante, **para** conocer su situación sin pedirla a Posgrado.

**Criterios de aceptación**
- Veo los datos principales y una línea de tiempo con cada fase marcada como hecha, actual, pendiente o detenida:
  - registro;
  - documentos (con su estado);
  - entrevista (cita, profesores entrevistadores, acta firmada y resultado);
  - evaluación (modalidad y resultados por área);
  - resolución del Colegio (resultado publicado);
  - inscripción con UTEyCV (solo consulta de su estado).
- Veo el historial de movimientos de ese aspirante.
- Si el proceso concluyó sin admisión, se indica el motivo.

**Referencias:** RF-49 (consulta)
**Pantalla:** `/subdireccion/aspirantes/[id]`

---

### HU-SD-04 · Consultar la bitácora del proceso
**Como** Subdirección Académica, **quiero** consultar la bitácora de movimientos, **para** tener trazabilidad de lo que hacen las áreas.

**Criterios de aceptación**
- Veo fecha, usuario, aspirante y acción de cada movimiento, con enlace al proceso del aspirante.
- No puedo borrar ni reiniciar la bitácora.

**Referencias:** RNF-11
**Pantalla:** `/subdireccion/bitacora`
