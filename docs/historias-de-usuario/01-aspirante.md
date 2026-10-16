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
- Al terminar el registro, el sistema me lleva a completar mi **SIP-02** (currículum) con los datos que ya capturé.
- Cada sección se valida antes de avanzar (campos obligatorios, formato de CURP, correo y teléfono).
- Si estudió en el IPN, puede elegir su unidad académica de la lista completa de unidades del IPN.
- Solo puede registrarse a una convocatoria **abierta**.
- Después de completar el SIP-02, el sistema le asigna un **ID temporal** (p. ej. `MTC-A27001`: programa, convocatoria y consecutivo) y se lo muestra junto con su contraseña de acceso.

**Referencias:** CU-ADM-01 · RF-01, RF-02, RF-81
**Pantalla:** `/registro`, `/registro/exito`

---

### HU-ASP-03 · Iniciar sesión con mi ID temporal
**Como** aspirante, **quiero** entrar al sistema con mi ID temporal, **para** dar seguimiento a mi proceso.

**Criterios de aceptación**
- El inicio de sesión acepta el ID temporal (`MTC-A27001`) y la contraseña.
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
- Cada fase explica qué hace el aspirante y qué hace cada área (Posgrado y Profesores).
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
- La fotografía debe ser a color, de frente, con fondo blanco y **rostro descubierto** (sin lentes, gorra, sombrero ni accesorios, con orejas y frente visibles), en JPG o PNG de **máximo 2 MB**; el sistema rechaza archivos más pesados.
- Cada documento muestra su estado: falta, por revisar, aprobado, con observación o en prórroga.
- Se muestran las notas de ayuda (p. ej. la validación ante la DFLE para constancias distintas a CENLEX puede tardar más de 40 días).

**Referencias:** CU-ADM-02 · RF-03, RF-04
**Pantalla:** `/aspirante/documentos`

---

### HU-ASP-07 · Atender observaciones de mis documentos
**Como** aspirante, **quiero** saber qué documento fue observado y por qué, **para** corregirlo y volver a subirlo.

**Criterios de aceptación**
- Recibo un aviso en el sistema (y por correo) con el documento y el motivo de la observación.
- Mientras tenga observaciones, **solo puedo reemplazar el documento observado**; no puedo cambiar, quitar ni volver a subir ningún otro archivo, y mucho menos los que Posgrado ya aprobó.
- Una vez que envío mi expediente a revisión, todos mis documentos (y el SIP-02 firmado) quedan bloqueados salvo los que Posgrado observe o a los que dé prórroga.
- Al subir la corrección, el documento vuelve a revisión ("Resubido por el aspirante" para Posgrado) y queda bloqueado hasta que Posgrado responda.
- En **Mi admisión** veo el aviso "Documentos con observaciones" con el documento y el motivo, y el botón **Ver observaciones** me lleva a 2 · Documentos.
- Perfil de ejemplo: con el ID **ASP-2026-050** (Mariana Torres Vidal) se entra al portal del aspirante con el certificado observado, la identificación en revisión y lo demás aprobado.
- Los documentos **aprobados** quedan bloqueados y ya no se pueden reemplazar.
- Al reemplazar el archivo, el documento vuelve a quedar **por revisar** para Posgrado.
- Si Posgrado me dio prórroga, veo la fecha límite y puedo seguir con mi proceso mientras tanto.

**Referencias:** CU-ADM-03 · RF-05, RF-06, RF-07
**Pantalla:** `/aspirante/documentos`, `/aspirante/notificaciones`

---

### HU-ASP-08 · Consultar mi cita de entrevista
**Como** aspirante, **quiero** ver la fecha, hora, modalidad y lugar de mi entrevista colegiada, **para** presentarme a tiempo.

**Criterios de aceptación**
- La fase 3 se habilita cuando mi expediente está validado.
- Veo mi cita **solo cuando Posgrado publica la entrevista** (después de que se completa el sínodo de 3 profesores); antes aparece "Aún no tienes cita".
- Veo fecha, hora, modalidad (presencial o en línea) y sala o enlace; **no** se muestran los nombres del sínodo.
- Recibo recordatorios automáticos **un día antes** y **una hora antes** de la entrevista.
- Si Posgrado actualiza el horario, recibo un aviso con los nuevos datos.

**Referencias:** CU-ADM-04 · RF-10, RF-11
**Pantalla:** `/aspirante/entrevista`

---

### HU-ASP-09 · Conocer el resultado de mi entrevista
**Como** aspirante, **quiero** saber si puedo continuar después de mi entrevista, **para** preparar mi evaluación.

**Criterios de aceptación**
- Cuando el sínodo sube el acta firmada por los 3 profesores, recibo un aviso.
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
- De cada grupo veo su horario y su **lugar**; **no** se me muestra el nombre del docente.
- Al confirmar, la elección queda fija; para cambiarla debo solicitarlo por correo a Posgrado.
- Si elijo examen, recibo **3 recordatorios** del examen: una semana antes, un día antes y el mismo día.

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

### HU-ASP-13 · Consultar dónde y cuándo se publican los resultados
**Como** aspirante, **quiero** saber dónde y cuándo se publicarán los resultados del proceso de admisión, **para** estar pendiente de mi resultado.

**Criterios de aceptación**
- La fase 6 (Dictamen final) es **informativa**: solo la ve el aspirante y no requiere que haga ningún trámite.
- Indica que los resultados se publican en SIGAP, que recibiré un aviso por correo y en mis notificaciones, la **fecha de publicación de resultados** de mi convocatoria y el calendario.
- Mientras mi resultado está en la Comisión de Admisión, se indica que todavía no se publica.

**Referencias:** RF-22, RF-50
**Pantalla:** `/aspirante/dictamen`

---

### HU-ASP-14 · Conocer mi resultado de admisión
**Como** aspirante, **quiero** ver mi resultado cuando Posgrado publique la resolución del Colegio de Profesores, **para** saber si fui admitido y qué sigue.

**Criterios de aceptación**
- Recibo un aviso cuando se publica mi resultado.
- Si fui **Aceptado** o **Aceptado con reservas**, veo la fecha y hora de la sesión del Colegio y un acceso a mi **inscripción**; con esto concluye mi proceso de admisión.
- El dictamen **SIP-04** lo lleno yo en Inscripción (con mi dedicación, RN-10); antes de ser admitido aparece bloqueado.
- Si no fui aceptado, mi proceso concluye con un mensaje general.

**Referencias:** CU-ADM-07 · RF-22 · RN-10
**Pantalla:** `/aspirante/dictamen`, `/aspirante/inscripcion`

---

### HU-ASP-15 · Recibir mis notificaciones en un solo lugar
**Como** aspirante, **quiero** ver todos los avisos de mi proceso en el sistema, **para** no depender solo del correo.

**Criterios de aceptación**
- Recibo avisos de observaciones, citas, recordatorios y resultados, por correo y dentro de SIGAP.
- Cada aviso indica fecha, área que lo envía y asunto.
- Los recordatorios programados se distinguen de los ya enviados.

**Referencias:** RF-07, RF-50, RF-51
**Pantalla:** `/aspirante/notificaciones`
