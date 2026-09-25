
# Sistema-Integral-de-Gesti-n-Academica-de-Posgrado-SIGAP-
SIGAP tiene como objetivo optimizar la gestión de trámites académicos de posgrado, reduciendo tiempos de atención, mejorando el control de los procesos y brindando una mejor experiencia tanto para los alumnos como para el personal académico. 



# SIGAP · Frontend (cascarón del proceso de admisión)

Next.js 16 (App Router) + TypeScript + Tailwind CSS 4. Solo front, con datos de ejemplo.

## Arrancar

```bash
npm install
npm run dev
```

Abrir http://localhost:3000

## Rutas

| Ruta | Qué es |
| --- | --- |
| `/` | Inicio público: convocatoria, info para aspirantes, acceso a registro y login |
| `/?convocatoria=cerrada` | Misma página simulando que no hay convocatoria activa |
| `/login` | Login único (correo institucional, ID temporal o número de registro) |
| `/registro` | Registro inicial por pasos (9 secciones + revisión), con guardado automático |
| `/registro/exito` | Registro exitoso con el ID temporal generado |
| `/aspirante/*` | Sesión del aspirante: Mi admisión y una pestaña por fase (registro, documentos, entrevista, evaluación, dictamen, matrícula) |
| `/aspirante/formatos/<clave>` | Revisar, completar y firmar un formato (sip-02, sip-05, sip-06, mtc-ec, sip-04, sip-01, sip-08) |
| `/posgrado/*` | Sesión del Departamento de Posgrado |
| `/admin/*` | Sesión del Administrador |

En el login hay botones de **acceso de prueba** por rol. También redirige según lo que escribas:
`ASP-...` o boleta → aspirante, correo con "admin" → administrador, otro correo → posgrado.

## Dónde cambiar cosas

- `src/lib/config.ts` — periodo escolar, datos de la convocatoria y tarjetas informativas (mock).
- `src/lib/registro-form.ts` — preguntas del registro (textos, tipos, obligatorias, condicionales, catálogos).
  Para probar la alerta de duplicado usa la CURP `MALA980412MDFRPN08`.
- `src/lib/admision.ts` — etapas del proceso y datos de ejemplo de "Mi admisión".
  Para ver cada etapa: `/aspirante/admision?etapa=documentos` (registro, documentos, entrevista, evaluacion, dictamen, matricula).
- `src/lib/nav.ts` — pestañas del menú lateral de cada rol.
- `src/components/` — Sidebar, encabezado, logos, placeholder.
- `src/app/<rol>/<pestaña>/page.tsx` — cada pantalla.

## Documentos y formatos por fase

| Fase | El aspirante sube | El sistema llena (el aspirante completa, imprime, firma a mano y sube el escaneo) |
| --- | --- | --- |
| 1. Registro | — | SIP-02 Currículum vitae |
| 2. Documentos | Título, cédula, certificado, constancia de inglés, CURP, acta de nacimiento, identificación, (extranjeros) | SIP-05 Carta protesta, SIP-06 Exposición de motivos |
| 3. Entrevista | — | MTC-EC Acta de entrevista (1ª hoja; el sínodo llena el resto) |
| 4. Evaluación | — | — (elige propedéutico o examen) |
| 5. Dictamen final | — | SIP-04 lo emite Posgrado; el aspirante revisa sus datos, confirma y descarga el dictamen firmado |
| 6. Matrícula | Fotografía | SIP-01 Solicitud de inscripción, SIP-08 (lo prepara el asesor) |

- Firmas: el aspirante descarga el PDF ya lleno, lo imprime, lo firma a mano y sube el escaneo; ese PDF llega al departamento indicado en `destino` de cada formato.
- `src/lib/documentos.ts` — catálogo de documentos que se suben.
- `src/lib/formatos.ts` — catálogo de formatos, sus campos y de dónde sale cada dato.
- `src/lib/pdf/rellenar.ts` — llena las plantillas de `public/formatos/` con pdf-lib.
- Para revisar la calibración de los PDF: `npx tsx scripts/probar-pdfs.ts salida-pdfs [foto.jpg]`

## Extensiones de VS Code

Crea el archivo `.vscode/extensions.json` con este contenido y VS Code te sugerirá instalarlas todas al abrir la carpeta:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "dsznajder.es7-react-js-snippets",
    "yoavbls.pretty-ts-errors",
    "usernamehw.errorlens",
    "formulahendry.auto-rename-tag",
    "ms-azuretools.vscode-containers",
    "ms-vscode-remote.remote-containers",
    "ms-ossdata.vscode-pgsql",
    "ms-mssql.mssql",
    "statelyai.stately-vstools",
    "rangav.vscode-thunder-client",
    "mikestead.dotenv",
    "eamodio.gitlens"
  ]
}
```
