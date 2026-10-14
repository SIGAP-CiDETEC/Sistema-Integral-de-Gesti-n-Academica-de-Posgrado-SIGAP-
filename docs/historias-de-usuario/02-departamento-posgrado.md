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
- Cada aspirante aparece en una bandeja: registro incompleto, por revisar, con observaciones, sin cita, entrevista programada, en evaluación, segunda oportunidad, esperando resolución del Colegio, turnado a UTEyCV, dictamen publicado o no admitido.
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
- La prórroga se ve en las bandejas, en el expediente y en la pantalla de UTEyCV.
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

### HU-PG-07 · Programar la entrevista y el sínodo
**Como** analista de Posgrado, **quiero** programar la entrevista colegiada y elegir a los 3 profesores del sínodo, **para** que el aspirante y los profesores tengan su cita.

**Criterios de aceptación**
- Capturo fecha, hora, modalidad (presencial o en línea) y sala o enlace.
- Debo elegir **exactamente 3** profesores; los que no son colegiados o tienen el nombramiento vencido aparecen como "No disponible" (RN-07).
- El sistema avisa si un profesor ya tiene otra entrevista a la misma fecha y hora, y no deja confirmar.
- Al confirmar, se notifica al aspirante y a los profesores, y se programan los recordatorios al aspirante (un día antes y una hora antes).

**Referencias:** CU-ADM-04 · RF-10, RF-11, RF-55, RF-56 · RN-07
**Pantalla:** `/posgrado/entrevistas`, `/posgrado/entrevistas/[id]`

---

### HU-PG-08 · Reprogramar una entrevista y avisar al aspirante
**Como** analista de Posgrado, **quiero** reprogramar una entrevista o mandar un aviso puntual, **para** comunicar cambios de fecha, sala o enlace.

**Criterios de aceptación**
- Mientras no exista acta, puedo reprogramar la cita con las mismas validaciones.
- Puedo enviar un aviso usando plantillas (cambio de fecha, cambio de sala, recordatorio) o un texto libre, por correo, en SIGAP o ambos.
- El aspirante no ve quiénes integran el sínodo.

**Referencias:** RF-11, RF-50
**Pantalla:** `/posgrado/entrevistas/[id]`

---

### HU-PG-09 · Dar seguimiento al acta del sínodo
**Como** analista de Posgrado, **quiero** ver si el sínodo ya llenó y firmó el acta, **para** saber cuándo queda el dictamen de la entrevista.

**Criterios de aceptación**
- Posgrado **no** captura el dictamen; lo registran los profesores en su sesión.
- Veo el estado: "El sínodo aún no llena el acta" o "Acta llenada · N de 3 firmas", y quién ya firmó.
- Una vez firmada por los 3, veo el dictamen (Aprobado, Con reservas o Rechazado), el acta completa y puedo descargarla en PDF.

**Referencias:** RF-12 · RN-07
**Pantalla:** `/posgrado/entrevistas`, `/posgrado/entrevistas/[id]`

---

### HU-PG-10 · Configurar las fechas de la evaluación
**Como** analista de Posgrado, **quiero** editar las fechas del propedéutico y del examen, **para** que los aspirantes vean siempre las fechas vigentes.

**Criterios de aceptación**
- Puedo editar inicio y fin del propedéutico, su modalidad y duración, y la fecha, hora y lugar del examen.
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
- Posgrado **no** captura calificaciones; ve por área qué profesor la captura y si está pendiente o capturada.
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
**Como** analista de Posgrado, **quiero** registrar el acta del Colegio y la resolución de cada aspirante, **para** cerrar la admisión y que UTEyCV haga los dictámenes.

**Criterios de aceptación**
- Capturo número de acta, fecha de sesión y el PDF del acta firmada; se requiere haber generado el informe.
- Para cada aspirante elijo **Aceptado**, **Condicionado** o **No aceptado**.
- Al registrar:
  - los aceptados y condicionados pasan **automáticamente** a UTEyCV para el dictamen SIP-04 (sin turnado manual);
  - los no aceptados concluyen su proceso;
  - cada aspirante recibe su aviso.
- La página muestra a quién se envió a UTEyCV y con qué fecha.

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
