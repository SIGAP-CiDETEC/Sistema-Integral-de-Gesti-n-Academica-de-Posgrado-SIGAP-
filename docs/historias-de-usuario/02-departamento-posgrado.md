# Historias de usuario — Departamento de Posgrado

[← Índice](README.md)

Incluye al **Analista de Posgrado** y a la **Jefatura de Posgrado**. Lo que puede hacer cada cuenta depende de los permisos de su rol (ver [06-administrador.md](06-administrador.md)).

---

### HU-PG-01 · Iniciar sesión con mi cuenta institucional
**Como** personal de Posgrado, **quiero** entrar con mi propia cuenta, **para** que todo lo que haga quede a mi nombre.

**Criterios de aceptación**
- Se inicia sesión con correo institucional y contraseña; cada persona tiene su cuenta.
- Sin sesión, cualquier pantalla de Posgrado redirige al inicio de sesión.
- Solo se muestran en el menú las secciones que permite el rol; si se entra por URL a una sin permiso, aparece "No tienes acceso a esta sección".
- Una cuenta desactivada por el administrador ya no puede entrar.

**Referencias:** RF-32, RF-79, RF-80 · RNF-01
**Pantalla:** `/login`, `/posgrado`

---

### HU-PG-02 · Ver la bandeja de aspirantes con prioridad
**Como** analista de Posgrado, **quiero** ver a todos los aspirantes con su etapa y una prioridad calculada, **para** atender primero lo más urgente.

**Criterios de aceptación**
- Cada aspirante aparece en una bandeja: registro incompleto, por revisar, con observaciones, sin cita, entrevista programada, en evaluación, segunda oportunidad, esperando resolución del Colegio, admitido o no admitido.
- La prioridad se calcula sola: **Alta** si una prórroga vence en 3 días o menos, o lleva 5 días o más esperando a Posgrado; **Media** de 2 a 4 días; **Normal** si la siguiente acción es del aspirante o de otra área.
- Se puede filtrar por bandeja y buscar por nombre o ID.
- El inicio muestra indicadores y las próximas entrevistas.

**Referencias:** RF-49 · CU-DP-02
**Pantalla:** `/posgrado`, `/posgrado/aspirantes`

---

### HU-PG-03 · Revisar y validar cada documento
**Como** analista de Posgrado, **quiero** revisar cada documento del expediente y aprobarlo u observarlo, **para** asegurar que el aspirante cumple los requisitos.

**Criterios de aceptación**
- Puedo abrir cada archivo entregado y marcarlo como **aprobado** u **observado**.
- Al observar, el motivo es obligatorio y al aspirante le llega un aviso con el documento y el motivo (RF-07).
- Mientras haya observaciones, el aspirante solo puede reemplazar los documentos observados; los aprobados quedan bloqueados para él.
- Si el aspirante reemplaza un archivo observado, vuelve a aparecer como **por revisar**.
- Cada acción queda en la bitácora con mi nombre.

**Referencias:** CU-ADM-03 · RF-05, RF-06, RF-07, RF-52
**Pantalla:** `/posgrado/aspirantes/[id]`

---

### HU-PG-04 · Validar la constancia de inglés
**Como** analista de Posgrado, **quiero** validar la constancia de inglés del aspirante, **para** cumplir con el requisito de idioma.

**Criterios de aceptación**
- La constancia de inglés se valida **solo** en Posgrado; no se envía a UTEyCV (RN-09).
- Se muestra la nota sobre constancias distintas a CENLEX (validación ante la DFLE, que puede tardar más de 40 días).
- Puedo validarla, observarla o dar prórroga.

**Referencias:** RF-53 · RN-09
**Pantalla:** `/posgrado/aspirantes/[id]`

---

### HU-PG-05 · Dar prórroga para entregar un documento
**Como** analista de Posgrado, **quiero** dar una fecha límite para entregar el título o la constancia de inglés, **para** que el aspirante siga con su proceso mientras los tramita.

**Criterios de aceptación**
- Al dar prórroga, indico la fecha límite; el documento queda **en prórroga** y no bloquea la aprobación del expediente.
- La prórroga se ve en las bandejas, en el expediente y, si el aspirante es admitido, en la inscripción de UTEyCV.
- La prioridad del aspirante sube a **Alta** cuando faltan 3 días o menos para que venza.
- Si el aspirante lo entrega dentro de la prórroga, vuelve a quedar **por revisar**.

**Referencias:** RF-52
**Pantalla:** `/posgrado/aspirantes/[id]`

---

### HU-PG-06 · Aprobar el expediente completo
**Como** analista de Posgrado, **quiero** aprobar el expediente cuando todos los documentos obligatorios están aprobados (o en prórroga), **para** que el aspirante pase a la entrevista.

**Criterios de aceptación**
- El botón "Aprobar expediente" solo se habilita si no hay documentos observados, faltantes obligatorios o sin revisar.
- Al aprobar, el aspirante pasa a la fase 3 y se le notifica.

**Referencias:** RF-52
**Pantalla:** `/posgrado/aspirantes/[id]`

---

### HU-PG-07 · Publicar los horarios y las entrevistas
**Como** analista de Posgrado, **quiero** capturar, actualizar y publicar los horarios de las entrevistas colegiadas, **para** que los profesores los elijan y después el aspirante reciba su cita.

**Criterios de aceptación**
- Posgrado **solo** captura y actualiza el horario (fecha, hora, modalidad y sala o enlace); **no** asigna profesores.
- **Paso 1 · Publicar horarios:** con un botón (por aspirante o todos a la vez) publico los horarios a los profesores; ellos los ven solo con día y hora y eligen en cuáles participan (HU-PR-08).
- Veo el nombre del aspirante, su horario y **cómo se va llenando el sínodo** (N de 3, con el nombre y nombramiento de cada profesor y los lugares libres).
- Estados: Horario sin publicar → Esperando profesores → Lista para publicar → Publicada al aspirante.
- **Paso 2 · Publicar entrevistas:** cuando el sínodo tiene 3 profesores, publico la entrevista (por aspirante o todas las listas a la vez); el aspirante recibe su cita por correo y en SIGAP, y se programan sus recordatorios (un día antes y una hora antes).
- Pueden integrar el sínodo los profesores **colegiados con nombramiento vigente** y los **profesores de asignatura** (RN-07).

**Referencias:** CU-ADM-04 · RF-10, RF-11, RF-55, RF-56 · RN-07
**Pantalla:** `/posgrado/entrevistas`, `/posgrado/entrevistas/[id]`

---

### HU-PG-08 · Actualizar un horario y avisar al aspirante
**Como** analista de Posgrado, **quiero** actualizar el horario de una entrevista o mandar un aviso puntual, **para** comunicar cambios de fecha, sala o enlace.

**Criterios de aceptación**
- Mientras no exista acta, puedo actualizar el horario; el sistema no deja guardar si algún profesor del sínodo ya tiene otra entrevista a esa fecha y hora.
- Si la entrevista ya estaba publicada al aspirante, se le avisa del cambio automáticamente.
- Puedo enviar un aviso usando plantillas (cambio de fecha, cambio de sala, recordatorio) o un texto libre, por correo, en SIGAP o ambos.
- El aspirante no ve quiénes integran el sínodo.

**Referencias:** RF-11, RF-50
**Pantalla:** `/posgrado/entrevistas/[id]`

---

### HU-PG-09 · Dar seguimiento al acta del sínodo
**Como** analista de Posgrado, **quiero** ver si el sínodo ya llenó y firmó el acta, **para** saber cuándo queda el dictamen de la entrevista.

**Criterios de aceptación**
- Posgrado **no** captura el dictamen; lo registran los profesores en su sesión.
- Veo el estado: "Sínodo N de 3" (mientras los profesores eligen la entrevista), "El sínodo aún no llena el acta" o "Acta llenada · N de 3 firmas", y quién ya firmó.
- Una vez firmada por los 3, veo el dictamen (Aprobado, Con reservas o Rechazado), el acta completa y puedo descargarla en PDF.

**Referencias:** RF-12 · RN-07
**Pantalla:** `/posgrado/entrevistas`, `/posgrado/entrevistas/[id]`

---

### HU-PG-10 · Configurar las fechas de la evaluación
**Como** analista de Posgrado, **quiero** editar las fechas del propedéutico y del examen, **para** que los aspirantes vean siempre las fechas vigentes.

**Criterios de aceptación**
- Puedo editar inicio y fin del propedéutico, su modalidad y duración, y la fecha, hora y lugar del examen.
- En cada grupo del propedéutico capturo su horario, su **lugar** (lo ve el aspirante) y su **docente** (solo lo ve Posgrado; es quien captura las calificaciones del grupo).
- Los cambios se reflejan en la pantalla del aspirante y en los recordatorios.
- El cambio queda en la bitácora.

**Referencias:** RF-15, RF-58
**Pantalla:** `/posgrado/evaluacion`

---

### HU-PG-11 · Cambiar la elección de evaluación a solicitud del aspirante
**Como** analista de Posgrado, **quiero** registrar un cambio de modalidad o de grupo que el aspirante pidió por correo, **para** atender su solicitud sin que él pueda cambiarla solo.

**Criterios de aceptación**
- Puedo cambiar entre propedéutico y examen, o cambiar grupos, con validación de choques de horario.
- El motivo es obligatorio y queda en la bitácora; el aspirante recibe aviso del cambio.
- Si ya hay resultados registrados, la elección ya no se puede cambiar.

**Referencias:** RF-15
**Pantalla:** `/posgrado/evaluacion`

---

### HU-PG-12 · Publicar los resultados de la evaluación
**Como** analista de Posgrado, **quiero** publicar los resultados cuando los profesores terminan de calificar, **para** que el aspirante los conozca y el proceso avance.

**Criterios de aceptación**
- La analista **no** captura calificaciones; ve por área quién la captura (el docente del grupo en el propedéutico o la Jefatura en el examen) y si está pendiente o capturada.
- Cuando todas las áreas están capturadas, el resultado aparece como "Sin publicar" y se habilita **Publicar resultados**.
- Al publicar:
  - si acreditó todas las áreas, pasa a la Comisión de Admisión;
  - si no acreditó áreas del propedéutico, se le pregunta si presenta el examen de esas áreas;
  - si no acreditó el examen, el proceso concluye con un mensaje que lo invita a la siguiente convocatoria (sin mostrar "Rechazado").
- El aspirante recibe aviso por correo y en SIGAP.

**Referencias:** RF-16, RF-17 · RN-08
**Pantalla:** `/posgrado/evaluacion`

---

### HU-PG-13 · Registrar la decisión de segunda oportunidad recibida por correo
**Como** analista de Posgrado, **quiero** registrar si el aspirante presentará o no el examen de áreas no acreditadas cuando lo comunica por correo, **para** no detener su proceso.

**Criterios de aceptación**
- Solo aparece mientras se espera la decisión del aspirante.
- Puedo registrar "Presentará el examen" o "No presentará"; con "No" el proceso concluye.

**Referencias:** RF-18 · RN-08
**Pantalla:** `/posgrado/evaluacion`

---

### HU-PG-14 · Generar el informe de la Comisión de Admisión
**Como** analista de Posgrado, **quiero** generar y descargar el informe de los aspirantes que acreditaron, **para** presentarlo a la Comisión de Admisión.

**Criterios de aceptación**
- El informe incluye ID, nombre, procedencia, promedio, resultado de entrevista, modalidad, calificación y propuesta de resolución.
- Se descarga en CSV para abrirse en Excel.

**Referencias:** RF-57
**Pantalla:** `/posgrado/comision`

---

### HU-PG-15 · Registrar la resolución del Colegio de Profesores
**Como** analista de Posgrado, **quiero** registrar el acta del Colegio y la resolución de cada aspirante, **para** publicar los resultados y cerrar la admisión.

**Criterios de aceptación**
- Capturo número de acta, fecha y **hora** de la sesión y el PDF del acta firmada; se requiere haber generado el informe.
- Para cada aspirante elijo **Aceptado**, **Condicionado** o **No aceptado**.
- Al registrar:
  - se **publica el resultado** de cada aspirante en su fase 6 (Dictamen final);
  - los aceptados y condicionados quedan **admitidos** y pasan automáticamente a Inscripción con UTEyCV, donde llenan su SIP-04 con la fecha y hora de la sesión;
  - los no aceptados concluyen su proceso;
  - cada aspirante recibe su aviso.
- La página muestra los resultados publicados y con qué fecha.

**Referencias:** RF-59, RF-60
**Pantalla:** `/posgrado/comision`

---

### HU-PG-16 · Enviar comunicados a los aspirantes
**Como** analista de Posgrado, **quiero** enviar comunicados a un grupo de aspirantes, **para** dar instrucciones, fechas o instructivos.

**Criterios de aceptación**
- Elijo el grupo de destinatarios (p. ej. todos o los de una etapa) y escribo asunto, cuerpo y adjuntos.
- Los aspirantes lo ven en sus notificaciones; el envío queda en la bitácora.

**Referencias:** RF-50, RF-51
**Pantalla:** `/posgrado/comunicados`

---

### HU-PG-17 · Editar el inicio del aspirante
**Como** personal de Posgrado, **quiero** editar el aviso destacado y las tarjetas de información del inicio del aspirante, **para** comunicar información general sin cambiar el sistema.

**Criterios de aceptación**
- Puedo mostrar u ocultar el aviso, cambiar su texto y editar las tarjetas (título, texto, botón y enlace).
- Los cambios se ven de inmediato en el inicio del aspirante y quedan en la bitácora.

**Referencias:** RF-08, RF-50
**Pantalla:** `/posgrado/inicio-aspirante`

---

### HU-PG-18 · Publicar el calendario de cada convocatoria (Jefatura)
**Como** Jefatura de Posgrado, **quiero** subir la imagen del calendario de cada convocatoria, **para** que los aspirantes lo vean en el inicio público.

**Criterios de aceptación**
- Puedo subir, reemplazar o quitar la imagen (JPG o PNG) de la convocatoria A y de la B.
- La imagen aparece en la tarjeta de la convocatoria en el inicio público.
- Solo la Jefatura tiene este permiso por defecto; queda en la bitácora.

**Referencias:** RF-50
**Pantalla:** `/posgrado/calendario`

---

### HU-PG-19 · Consultar la bitácora
**Como** personal de Posgrado, **quiero** consultar quién hizo qué y cuándo, **para** tener trazabilidad del proceso.

**Criterios de aceptación**
- Cada acción de Posgrado, Profesores y UTEyCV queda registrada con fecha, usuario, aspirante y descripción.
- Desde cada movimiento se puede abrir el expediente del aspirante.

**Referencias:** RNF-11
**Pantalla:** `/posgrado/bitacora`

---

### HU-PG-20 · Descargar el CSV de todos los aspirantes para la Subdirección
**Como** analista de Posgrado, **quiero** descargar un CSV con todos los aspirantes, **para** entregarlo a la Subdirección Académica.

**Criterios de aceptación**
- Desde la bandeja de aspirantes descargo un archivo **CSV** (UTF-8, se abre directo en Excel con acentos) con **todos** los aspirantes, sin importar los filtros.
- Trae las mismas columnas que el CSV de la Subdirección (HU-SD-02): datos de contacto, procedencia separada en **institución** y **unidad académica / escuela**, fase, estado, resultado de entrevista, **calificación de cada curso propedéutico y su promedio**, calificación del examen y **dictamen** (Favorable, Condicionado o No favorable).

**Referencias:** RF-49
**Pantalla:** `/posgrado/aspirantes`

---

### HU-PG-21 · Descargar la lista de inscritos a cada curso propedéutico
**Como** analista de Posgrado, **quiero** descargar quiénes están inscritos en cada curso y grupo del propedéutico, **para** organizar los cursos y avisar a los docentes.

**Criterios de aceptación**
- En cuanto un aspirante elige sus cursos propedéuticos, aparece en la lista de su grupo.
- Descargo un **CSV** con curso, grupo, horario, lugar, docente, ID, nombre del aspirante, **correo** y teléfono.

**Referencias:** RF-15, RF-58
**Pantalla:** `/posgrado/evaluacion`

---

### HU-PG-22 · Capturar las calificaciones del examen de admisión (Jefatura)
**Como** Jefatura de Posgrado, **quiero** registrar la calificación del examen de admisión, **para** que Posgrado pueda publicar los resultados.

**Criterios de aceptación**
- En "Calificaciones" veo a quienes eligieron solo examen y a quienes presentan el examen de las áreas que no acreditaron en el propedéutico.
- Capturo la calificación de 0 a 10 por área; el sistema indica si queda acreditada (mínima 8.0).
- Al completarse las áreas, el resultado queda "sin publicar" para la analista (HU-PG-12).
- Solo la Jefatura tiene este módulo; queda en la bitácora a su nombre.

**Referencias:** RF-16 · RN-08
**Pantalla:** `/posgrado/calificaciones`

---

### HU-PG-23 · Consultar y descargar el concentrado de calificaciones
**Como** Jefatura de Posgrado, **quiero** ver en una sola tabla las calificaciones de todos los aspirantes, **para** dar seguimiento a la evaluación.

**Criterios de aceptación**
- Por aspirante veo la procedencia separada (**institución** y **unidad académica**), la **calificación de cada curso propedéutico** (Matemáticas Discretas y Continuas y Programación, con su grupo), el **promedio de los 2 cursos**, la calificación del examen y el estado de la evaluación.
- Las calificaciones del propedéutico las capturan los docentes de cada grupo (HU-PR-07).
- Descargo el concentrado en **CSV**, que además incluye grupo y docente de cada curso.

**Referencias:** RF-16
**Pantalla:** `/posgrado/calificaciones`

---

### HU-PG-24 · Definir las fechas de registro de las convocatorias
**Como** Jefatura de Posgrado, **quiero** definir las fechas de inicio y cierre del registro de cada convocatoria, **para** que se abran y se cierren solas sin depender del administrador.

**Criterios de aceptación**
- Por convocatoria (A y B) capturo inicio y cierre del registro; la fecha de cierre no puede ser anterior a la de inicio.
- El estado se calcula solo con la fecha de hoy: **Próxima** (antes del inicio), **Abierta** (del inicio al cierre, incluidos) y **Cerrada** (después del cierre).
- El inicio público y el registro reflejan el estado automáticamente; el cambio queda en la bitácora.

**Referencias:** RF-81
**Pantalla:** `/posgrado/calendario`
