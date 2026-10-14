# Historias de usuario — Aspirante

[← Índice](README.md)

---

### HU-ASP-01 · Consultar las convocatorias
**Como** aspirante, **quiero** ver en el inicio las convocatorias de admisión vigentes, **para** saber cuándo puedo registrarme y qué necesito.

**Criterios de aceptación**
- Se muestran las dos convocatorias del ciclo: **A** (ingreso enero–junio) y **B** (ingreso agosto–diciembre), con su nombre (p. ej. A-27, B-27), periodo de ingreso y fechas de registro.
- Cada convocatoria indica si está **Abierta** o **Cerrada**; solo la abierta muestra el botón para registrarse.
- Se muestra la imagen del calendario del proceso que publicó la Jefatura de Posgrado, y se puede abrir en grande.
- Se listan los requisitos generales (título y cédula, certificado y CURP, constancia de inglés, promedio mínimo).
- La página se ve correctamente en celular.

**Referencias:** RF-08, RF-81 · RNF-03
**Pantalla:** `/`

---

### HU-ASP-02 · Registrarme al proceso de admisión
**Como** aspirante, **quiero** llenar mi registro inicial en línea, **para** iniciar formalmente mi proceso de admisión.

**Criterios de aceptación**
- El formulario se divide en secciones: datos personales, formación académica, experiencia profesional, habilidades, motivos, proyectos, intereses, personalidad y situación personal y familiar.
- Cada sección se valida antes de avanzar (campos obligatorios, formato de CURP, correo y teléfono).
- Si estudió en el IPN, puede elegir su unidad académica de la lista completa de unidades del IPN.
- Solo puede registrarse a una convocatoria **abierta**.
- Al terminar, el sistema le asigna un **ID temporal** (`ASP-AAAA-NNN`) y se lo muestra junto con su contraseña de acceso.

**Referencias:** CU-ADM-01 · RF-01, RF-02, RF-81
**Pantalla:** `/registro`, `/registro/exito`

---

### HU-ASP-03 · Iniciar sesión con mi ID temporal
**Como** aspirante, **quiero** entrar al sistema con mi ID temporal, **para** dar seguimiento a mi proceso.

**Criterios de aceptación**
- El inicio de sesión acepta el ID temporal (`ASP-…`) y la contraseña.
- Con credenciales incorrectas se muestra un mensaje de error sin revelar cuál dato falló.
- Al entrar, llega a su inicio de aspirante.

**Referencias:** RF-32
**Pantalla:** `/login`

---

### HU-ASP-04 · Ver en qué etapa va mi admisión
**Como** aspirante, **quiero** ver en un solo lugar en qué fase estoy y qué sigue, **para** no perderme en el proceso.

**Criterios de aceptación**
- "Mi admisión" muestra el estado general, las 6 fases y cuál es la actual.
- Indica el **siguiente paso** concreto (p. ej. "Sube tus documentos", "Consulta tu cita", "Elige tu modalidad").
- Cada fase explica qué hace el aspirante y qué hace cada área (Posgrado, Profesores, UTEyCV).
- Las fases que aún no le corresponden aparecen bloqueadas con el requisito para habilitarse.

**Referencias:** RF-49 · CU-ADM-01
**Pantalla:** `/aspirante/admision`

---

### HU-ASP-05 · Entregar mi currículum firmado (SIP-02)
**Como** aspirante, **quiero** generar mi currículum (SIP-02) con los datos de mi registro, **para** imprimirlo, firmarlo y entregarlo sin capturar todo otra vez.

**Criterios de aceptación**
- El SIP-02 se llena automáticamente con los datos del registro; solo se capturan los datos que falten.
- Se descarga en PDF sobre la plantilla oficial.
- Se sube la versión firmada (PDF) y queda registrada como entregada.

**Referencias:** RF-25
**Pantalla:** `/aspirante/registro`, `/aspirante/formatos/sip-02`

---

### HU-ASP-06 · Subir mis documentos oficiales
**Como** aspirante, **quiero** subir mis documentos escaneados, **para** que Posgrado integre mi expediente.

**Criterios de aceptación**
- La lista de documentos se adapta a mi registro: título y cédula (o constancia de trámite de titulación si no estoy titulado), certificado, constancia de inglés, CURP (solo para mexicanos), acta de nacimiento, identificación oficial (INE o pasaporte) y documentos apostillados si soy extranjero.
- Solo se aceptan PDF que no excedan el límite de tamaño configurado en la convocatoria.
- Cada documento muestra su estado: falta, por revisar, aprobado, con observación o en prórroga.
- Se muestran las notas de ayuda (p. ej. la validación ante la DFLE para constancias distintas a CENLEX puede tardar más de 40 días).

**Referencias:** CU-ADM-02 · RF-03, RF-04
**Pantalla:** `/aspirante/documentos`

---

### HU-ASP-07 · Atender observaciones de mis documentos
**Como** aspirante, **quiero** saber qué documento fue observado y por qué, **para** corregirlo y volver a subirlo.

**Criterios de aceptación**
- Recibo un aviso en el sistema (y por correo) con el documento y el motivo de la observación.
- Al reemplazar el archivo, el documento vuelve a quedar **por revisar** para Posgrado.
- Si Posgrado me dio prórroga, veo la fecha límite y puedo seguir con mi proceso mientras tanto.

**Referencias:** CU-ADM-03 · RF-05, RF-06, RF-07
**Pantalla:** `/aspirante/documentos`, `/aspirante/notificaciones`

---

### HU-ASP-08 · Consultar mi cita de entrevista
**Como** aspirante, **quiero** ver la fecha, hora, modalidad y lugar de mi entrevista colegiada, **para** presentarme a tiempo.

**Criterios de aceptación**
- La fase 3 se habilita cuando mi expediente está validado.
- Veo fecha, hora, modalidad (presencial o en línea) y sala o enlace; **no** se muestran los nombres del sínodo.
- Recibo recordatorios automáticos **un día antes** y **una hora antes** de la entrevista.
- Si Posgrado reprograma la cita, recibo un aviso con los nuevos datos.

**Referencias:** CU-ADM-04 · RF-10, RF-11
**Pantalla:** `/aspirante/entrevista`

---

### HU-ASP-09 · Conocer el resultado de mi entrevista
**Como** aspirante, **quiero** saber si puedo continuar después de mi entrevista, **para** preparar mi evaluación.

**Criterios de aceptación**
- Cuando los 3 profesores del sínodo firman el acta, recibo un aviso.
- Si el resultado es **Aprobado** o **Con reservas**, se habilita la fase 4 (Evaluación).
- Si es **Rechazado**, mi proceso concluye: recibo un mensaje general (sin calificaciones ni comentarios del sínodo) y las demás fases quedan bloqueadas.

**Referencias:** CU-ADM-05 · RF-12, RF-14 · RN-05
**Pantalla:** `/aspirante/entrevista`, `/aspirante/notificaciones`

---

### HU-ASP-10 · Elegir mi modalidad de evaluación
**Como** aspirante, **quiero** elegir entre cursos propedéuticos (con opción a examen) o presentar solo el examen, **para** acreditar mi evaluación de la forma que más me convenga.

**Criterios de aceptación**
- Veo las fechas y la modalidad vigentes de cada opción (las configura Posgrado).
- Si elijo propedéutico, elijo un grupo de cada curso (Matemáticas Discretas y Continuas, Programación, Seminario de Inducción) y el sistema **impide** grupos con choque de horario.
- Al confirmar, la elección queda fija; para cambiarla debo solicitarlo por correo a Posgrado.
- Si elijo examen, recibo recordatorios **cada 5 días, un día antes y el mismo día** del examen.

**Referencias:** CU-ADM-06 · RF-15
**Pantalla:** `/aspirante/evaluacion`

---

### HU-ASP-11 · Consultar mis resultados por área
**Como** aspirante, **quiero** ver mis calificaciones por área cuando se publiquen, **para** saber si acredité mi evaluación.

**Criterios de aceptación**
- No veo ningún resultado hasta que Posgrado lo publica.
- Veo la calificación de cada área y si la acredité o no.
- Si acredité todas las áreas, se me informa que mi resultado pasa a la Comisión de Admisión.

**Referencias:** RF-16, RF-17
**Pantalla:** `/aspirante/resultados`

---

### HU-ASP-12 · Decidir si presento el examen de las áreas no acreditadas
**Como** aspirante que no acreditó una o las dos áreas del propedéutico, **quiero** decidir si presento el examen solo de esas áreas, **para** tener una segunda oportunidad.

**Criterios de aceptación**
- El sistema me pregunta si quiero presentar el examen de las áreas no acreditadas y me muestra la fecha.
- Si digo que **sí**, quedo registrado para el examen de esas áreas y recibo recordatorios.
- Si digo que **no**, mi proceso concluye con un mensaje que me invita a la siguiente convocatoria.
- Si no acredito el examen, el proceso concluye (RN-08).

**Referencias:** RF-17, RF-18 · RN-08
**Pantalla:** `/aspirante/resultados`

---

### HU-ASP-13 · Revisar y confirmar mis datos del dictamen (SIP-04)
**Como** aspirante admitido, **quiero** revisar mis datos del dictamen y elegir mi dedicación, **para** que mi dictamen salga correcto.

**Criterios de aceptación**
- La fase 6 solo se habilita a quien acreditó su evaluación (RF-22).
- Veo los datos que llevará mi SIP-04 y debo elegir mi dedicación: **tiempo completo** o **tiempo parcial** (RN-10).
- Al confirmar, UTEyCV puede continuar con las firmas.

**Referencias:** CU-ADM-07 · RF-22 · RN-10
**Pantalla:** `/aspirante/dictamen`, `/aspirante/formatos/sip-04`

---

### HU-ASP-14 · Descargar mi dictamen firmado
**Como** aspirante admitido, **quiero** descargar mi dictamen SIP-04 firmado, **para** tener el documento oficial que concluye mi admisión.

**Criterios de aceptación**
- Recibo un aviso cuando UTEyCV publica mi dictamen.
- Puedo descargar el SIP-04 firmado desde mi sesión.
- El sistema indica que con el dictamen concluye mi proceso de admisión.

**Referencias:** RF-22 · CU-ADM-07
**Pantalla:** `/aspirante/dictamen`

---

### HU-ASP-15 · Recibir mis notificaciones en un solo lugar
**Como** aspirante, **quiero** ver todos los avisos de mi proceso en el sistema, **para** no depender solo del correo.

**Criterios de aceptación**
- Recibo avisos de observaciones, citas, recordatorios, resultados y dictamen, por correo y dentro de SIGAP.
- Cada aviso indica fecha, área que lo envía y asunto.
- Los recordatorios programados se distinguen de los ya enviados.

**Referencias:** RF-07, RF-50, RF-51
**Pantalla:** `/aspirante/notificaciones`
