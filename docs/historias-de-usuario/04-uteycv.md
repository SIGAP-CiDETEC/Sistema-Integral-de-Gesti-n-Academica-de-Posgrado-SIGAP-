# Historias de usuario — Control Escolar (UTEyCV)

[← Índice](README.md)

En la admisión, UTEyCV se encarga **solo del dictamen SIP-04**. Con su publicación concluye el proceso de admisión.

---

### HU-UT-01 · Recibir a los admitidos por el Colegio
**Como** personal de UTEyCV, **quiero** recibir automáticamente a los aspirantes admitidos, **para** elaborar sus dictámenes sin esperar un turnado manual.

**Criterios de aceptación**
- En cuanto Posgrado registra la resolución del Colegio, los aspirantes **Aceptados** y **Condicionados** aparecen en mi lista con la fecha de envío.
- Los no aceptados no llegan a UTEyCV.
- Veo los documentos en prórroga de cada aspirante con su fecha límite.
- El inicio muestra indicadores (dictámenes por elaborar, publicados de N, etc.).

**Referencias:** RF-22, RF-59
**Pantalla:** `/uteycv`, `/uteycv/dictamen`

---

### HU-UT-02 · Elaborar el dictamen SIP-04
**Como** personal de UTEyCV, **quiero** elaborar el SIP-04 con los datos del aspirante y de la sesión del Colegio, **para** iniciar el dictamen.

**Criterios de aceptación**
- Capturo la fecha y hora de la sesión del Colegio que dictaminó.
- El SIP-04 se genera con los datos del aspirante sobre la plantilla oficial (PDF).
- Al registrarlo como elaborado, el aspirante puede revisarlo en su sesión.

**Referencias:** CU-ADM-07 · RF-22
**Pantalla:** `/uteycv/dictamen`

---

### HU-UT-03 · Esperar la confirmación del aspirante
**Como** personal de UTEyCV, **quiero** saber si el aspirante ya confirmó sus datos y eligió su dedicación, **para** no recabar firmas sobre datos incorrectos.

**Criterios de aceptación**
- El estado muestra "Esperando confirmación" hasta que el aspirante confirma.
- La dedicación (tiempo completo o parcial) aparece como elegida por el aspirante y no la modifica UTEyCV (RN-10).

**Referencias:** RF-22 · RN-10
**Pantalla:** `/uteycv/dictamen`

---

### HU-UT-04 · Registrar las firmas del dictamen
**Como** personal de UTEyCV, **quiero** registrar que el SIP-04 ya tiene las firmas, **para** poder publicarlo.

**Criterios de aceptación**
- Solo se habilita después de la confirmación del aspirante.
- Al registrar las firmas, el estado cambia a "Por publicar SIP-04".

**Referencias:** RF-22
**Pantalla:** `/uteycv/dictamen`

---

### HU-UT-05 · Publicar el dictamen firmado
**Como** personal de UTEyCV, **quiero** publicar el SIP-04 firmado, **para** que el aspirante lo descargue y concluya su admisión.

**Criterios de aceptación**
- Subo el PDF firmado y lo publico; el aspirante recibe un aviso y lo puede descargar desde su sesión.
- El estado cambia a "Dictamen publicado" y con eso concluye el proceso de admisión del aspirante.
- Cada paso (elaborado, firmas, publicado) queda en la bitácora a mi nombre.

**Referencias:** CU-ADM-07 · RF-22
**Pantalla:** `/uteycv/dictamen`, `/uteycv/bitacora`
