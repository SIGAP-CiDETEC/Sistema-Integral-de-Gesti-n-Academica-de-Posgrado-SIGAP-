import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Valor } from "../formatos";
import { PROGRAMA_INDIVIDUAL_DEMO } from "../programa-individual";

/**
 * Llena las plantillas oficiales con pdf-lib.
 * - MTC-EC es un PDF con campos de formulario: se llenan por nombre.
 * - SIP-01, SIP-05 y SIP-06 son PDF "planos": se escribe el texto en coordenadas
 *   medidas sobre la plantilla (origen abajo-izquierda, en puntos).
 *
 * Las firmas NO se ponen aquí: el aspirante imprime el PDF, firma a mano y sube el escaneo.
 * Funciona igual en el navegador y en Node (solo recibe bytes).
 */

export type DatosPdf = {
  valores: Record<string, Valor | undefined>;
  /** Foto del aspirante (PNG o JPG) */
  foto?: { bytes: Uint8Array; tipo: "png" | "jpg" };
  hoy: Date;
  /** Conservar solo estas páginas (base 0); el resto no se incluye en el archivo. */
  soloPaginas?: number[];
};

const s = (v: Valor | undefined) => (Array.isArray(v) ? v.join(", ") : v ?? "");
const TINTA = rgb(0.05, 0.1, 0.35);

type Ctx = { page: PDFPage; font: PDFFont; alto: number };

/** Escribe texto usando coordenadas "desde arriba" (como se midieron). Reduce la letra si no cabe. */
function texto(c: Ctx, t: string, x: number, top: number, maxAncho: number, tam = 9) {
  if (!t) return;
  let size = tam;
  while (size > 5 && c.font.widthOfTextAtSize(t, size) > maxAncho) size -= 0.5;
  c.page.drawText(t, { x, y: c.alto - top, size, font: c.font, color: TINTA });
}

function marca(c: Ctx, cx: number, cyTop: number, tam = 10) {
  const w = c.font.widthOfTextAtSize("X", tam);
  c.page.drawText("X", { x: cx - w / 2, y: c.alto - cyTop - tam * 0.35, size: tam, font: c.font, color: TINTA });
}

/** Texto centrado en una celda (x0..x1); reduce la letra si no cabe. */
function centrado(c: Ctx, t: string, x0: number, x1: number, top: number, tam = 8) {
  if (!t) return;
  let size = tam;
  while (size > 4.5 && c.font.widthOfTextAtSize(t, size) > x1 - x0 - 2) size -= 0.5;
  const w = c.font.widthOfTextAtSize(t, size);
  c.page.drawText(t, { x: (x0 + x1) / 2 - w / 2, y: c.alto - top, size, font: c.font, color: TINTA });
}

/** Escribe un texto largo sobre renglones ya impresos (una línea por renglón). */
function renglones(c: Ctx, t: string, x: number, ancho: number, bases: number[], tam = 9) {
  const partir = (sz: number) => {
    const out: string[] = [];
    for (const p of t.split(/\n/)) {
      let linea = "";
      for (const palabra of p.split(/\s+/)) {
        const prueba = linea ? `${linea} ${palabra}` : palabra;
        if (c.font.widthOfTextAtSize(prueba, sz) > ancho) {
          out.push(linea);
          linea = palabra;
        } else linea = prueba;
      }
      if (linea) out.push(linea);
    }
    return out;
  };
  let size = tam;
  let lineas = partir(size);
  while (lineas.length > bases.length && size > 6) lineas = partir((size -= 0.5));
  lineas.slice(0, bases.length).forEach((l, i) =>
    c.page.drawText(l, { x, y: c.alto - bases[i], size, font: c.font, color: TINTA }),
  );
}

function parrafo(c: Ctx, t: string, x: number, top: number, ancho: number, altoMax: number, tam = 10, minTam = 6) {
  let size = tam;
  let lineas: string[] = [];
  const envolver = (sz: number) => {
    const out: string[] = [];
    for (const p of t.split(/\n/)) {
      let linea = "";
      for (const palabra of p.split(/\s+/)) {
        const prueba = linea ? `${linea} ${palabra}` : palabra;
        if (c.font.widthOfTextAtSize(prueba, sz) > ancho) {
          out.push(linea);
          linea = palabra;
        } else linea = prueba;
      }
      out.push(linea);
    }
    return out;
  };
  do {
    lineas = envolver(size);
    if (lineas.length * size * 1.35 <= altoMax) break;
    size -= 0.5;
  } while (size > minTam);
  lineas.forEach((l, i) => {
    c.page.drawText(l, { x, y: c.alto - top - size - i * size * 1.35, size, font: c.font, color: TINTA });
  });
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// ---------------- SIP-05 · Carta protesta ----------------
async function sip05(doc: PDFDocument, d: DatosPdf) {
  const page = doc.getPage(0);
  const c: Ctx = { page, font: await doc.embedFont(StandardFonts.Helvetica), alto: page.getHeight() };
  texto(c, String(d.hoy.getDate()), 416, 194, 18, 10);
  texto(c, MESES[d.hoy.getMonth()], 456, 194, 48, 10);
  texto(c, String(d.hoy.getFullYear()), 532, 195, 30, 10);
  const est = s(d.valores.estatus);
  if (est === "Tiempo completo") marca(c, 464.5, 384);
  if (est === "Tiempo parcial") marca(c, 528, 384);
  texto(c, s(d.valores.programa), 60, 427, 510, 10);
  texto(c, s(d.valores.nombreCompleto), 315 - c.font.widthOfTextAtSize(s(d.valores.nombreCompleto), 10) / 2, 645, 290, 10);
}

// ---------------- SIP-06 · Exposición de motivos ----------------
async function sip06(doc: PDFDocument, d: DatosPdf) {
  const page = doc.getPage(0);
  const c: Ctx = { page, font: await doc.embedFont(StandardFonts.Helvetica), alto: page.getHeight() };
  texto(c, String(d.hoy.getDate()), 422, 182, 18, 10);
  texto(c, MESES[d.hoy.getMonth()], 465, 182, 44, 10);
  texto(c, String(d.hoy.getFullYear()), 540, 182, 22, 9);
  texto(c, s(d.valores.programa), 58, 319, 500, 10);
  parrafo(c, s(d.valores.motivos), 60, 373, 496, 246, 10);
  const n = s(d.valores.nombreCompleto);
  texto(c, n, 308 - c.font.widthOfTextAtSize(n, 10) / 2, 713, 300, 10);
}

// ---------------- SIP-02 · Currículum vitae (6 hojas) ----------------
// Plantilla: PDF exportado de Word (sin campos). Coordenadas medidas sobre la plantilla.
async function sip02(doc: PDFDocument, d: DatosPdf) {
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const hoja = (i: number): Ctx => ({ page: doc.getPage(i), font, alto: doc.getPage(i).getHeight() });
  const v = (k: string) => s(d.valores[k]);

  // Hoja 1 · Datos generales
  const c = hoja(0);
  texto(c, v("programa"), 64, 165, 495, 10);
  texto(c, "Centro de Innovación y Desarrollo Tecnológico en Cómputo (CIDETEC)", 183, 186, 375, 10);
  texto(c, v("apellidoPaterno"), 103, 258, 118, 9);
  texto(c, v("apellidoMaterno"), 273, 258, 118, 9);
  texto(c, v("nombre"), 450, 258, 113, 9);
  texto(c, v("calle"), 88, 299, 100, 8);
  texto(c, v("numExt"), 271, 299, 28, 8);
  texto(c, v("numInt"), 377, 299, 46, 8);
  texto(c, v("colonia"), 470, 299, 95, 8);
  texto(c, v("alcaldia"), 158, 317, 102, 8);
  texto(c, v("cp"), 343, 317, 80, 8);
  texto(c, v("estadoDom"), 470, 317, 95, 8);
  texto(c, v("pais"), 158, 334, 102, 8);
  texto(c, v("telCasa"), 345, 334, 78, 8);
  texto(c, v("telMovil"), 498, 334, 67, 8);
  if (v("sexo") === "F") marca(c, 125, 349, 8);
  if (v("sexo") === "M") marca(c, 167.5, 349, 8);
  texto(c, v("correo1"), 264, 357, 113, 7);
  texto(c, v("correo2"), 470, 357, 95, 7);
  const [dn, mn, an] = v("fechaNacimiento").split("/");
  centrado(c, dn ?? "", 106, 118, 379, 6);
  centrado(c, mn ?? "", 118, 130, 379, 6);
  centrado(c, an ?? "", 130, 142, 379, 6);
  texto(c, v("lugarNacimiento"), 194, 390, 100, 8);
  texto(c, v("nacionalidad"), 382, 390, 83, 8);
  const civil: Record<string, number> = { "Soltero(a)": 371, "Casado(a)": 379.5, "Divorciado(a)": 387.5, "Unión libre": 395.5, "Viudo(a)": 403.5 };
  if (civil[v("estadoCivil")]) marca(c, 560, civil[v("estadoCivil")], 6);
  texto(c, v("rfc"), 109, 420, 80, 8);
  texto(c, v("curp"), 265, 420, 112, 8);
  // II. Empleo actual o último
  texto(c, v("empresa"), 152, 472, 413, 8);
  texto(c, v("cargo"), 102, 512, 194, 8);
  texto(c, v("empleoInicio"), 350, 512, 68, 8);
  texto(c, v("empleoFin"), 471, 512, 94, 8);
  // III. Formación académica · Licenciatura
  texto(c, v("licPrograma"), 173, 582, 394, 8);
  texto(c, v("licInstitucion"), 172, 593, 116, 7);
  texto(c, v("licPais"), 484, 593, 83, 7);
  texto(c, v("licIngreso"), 264, 605, 106, 7);
  texto(c, v("licEgreso"), 463, 605, 104, 7);
  texto(c, v("formaTitulacion"), 172, 620, 133, 7);
  texto(c, v("fechaExamen"), 172, 639, 80, 7);
  texto(c, v("licFecha"), 335, 639, 75, 7);
  texto(c, v("cedula"), 492, 639, 75, 7);
  marca(c, 133.5, 669.5, 7); // Especialidad: no aplica

  // Hoja 2 · Maestría y doctorado: no aplica
  const c2 = hoja(1);
  marca(c2, 131.5, 72, 7);
  marca(c2, 129.5, 176, 7);

  // Hoja 3 · VIII. Idiomas y IX. Experiencia profesional
  const c3 = hoja(2);
  const habilidades = Array.isArray(d.valores.inglesHabilidades) ? d.valores.inglesHabilidades : [];
  if (habilidades.length || v("inglesAval")) {
    texto(c3, "Inglés", 55, 502, 80, 8);
    const columnas: [string, number, number][] = [
      ["Comprensión de lectura", 161.5, 199.5],
      ["Comprensión auditiva", 244.5, 282.5],
      ["Expresión escrita", 336, 374],
      ["Expresión oral", 419, 452.5],
    ];
    for (const [h, si, no] of columnas) marca(c3, habilidades.includes(h) ? si : no, 497, 7);
    if (v("inglesAval")) marca(c3, v("inglesAval") === "Sí" ? 493.5 : 531.5, 497, 7);
  }
  texto(c3, v("cargo"), 68, 608, 122, 7);
  texto(c3, v("empresa"), 194, 608, 122, 7);
  parrafo(c3, v("experiencia"), 320, 598, 122, 15, 6, 4);
  const periodo = [v("empleoInicio"), v("empleoFin") || (v("empleoInicio") ? "a la fecha" : "")].filter(Boolean).join(" – ");
  texto(c3, periodo, 446, 608, 121, 7);

  // Hoja 5 · XIV. Información adicional y fecha
  const c5 = hoja(4);
  renglones(c5, v("investigacion"), 70, 495, [460, 477, 495, 512, 529, 546, 564], 9);
  centrado(c5, String(d.hoy.getDate()), 344, 399, 646, 10);
  centrado(c5, MESES[d.hoy.getMonth()], 416, 488, 646, 10);
  centrado(c5, String(d.hoy.getFullYear()), 509, 564, 646, 10);

  // Hoja 6 · Aviso de privacidad: ACEPTO
  marca(hoja(5), 290.5, 311.5, 10);
}

// ---------------- SIP-01 · Solicitud de inscripción ----------------
async function sip01(doc: PDFDocument, d: DatosPdf) {
  const page = doc.getPage(0);
  const c: Ctx = { page, font: await doc.embedFont(StandardFonts.Helvetica), alto: page.getHeight() };
  const v = (k: string) => s(d.valores[k]);
  texto(c, v("apellidoPaterno"), 90, 178, 120);
  texto(c, v("apellidoMaterno"), 260, 178, 122);
  texto(c, v("nombre"), 444, 178, 106);
  texto(c, v("calle"), 75, 222, 96);
  texto(c, v("numExt"), 233, 222, 55);
  texto(c, v("numInt"), 353, 222, 58);
  texto(c, v("colonia"), 458, 222, 92);
  texto(c, v("alcaldia"), 104, 249, 122);
  texto(c, v("cp"), 295, 249, 116);
  texto(c, v("estadoDom"), 458, 249, 92);
  texto(c, v("pais"), 104, 271, 122);
  texto(c, v("telCasa"), 309, 271, 104);
  texto(c, v("telMovil"), 486, 271, 64, 8);
  if (v("sexo") === "F") marca(c, 110, 287.5);
  if (v("sexo") === "M") marca(c, 153, 287.5);
  texto(c, v("correo1"), 272, 289, 94, 7);
  texto(c, v("correo2"), 464, 289, 86, 7);
  const centrado = (t: string, x0: number, x1: number, top: number, tam = 8) => {
    let size = tam;
    while (size > 5 && c.font.widthOfTextAtSize(t, size) > x1 - x0 - 4) size -= 0.5;
    const w = c.font.widthOfTextAtSize(t, size);
    c.page.drawText(t, { x: (x0 + x1) / 2 - w / 2, y: c.alto - top, size, font: c.font, color: TINTA });
  };
  centrado(v("unidadAcademica"), 45, 205, 334);
  centrado(v("programa"), 212, 552, 334, 9);
  // Antecedentes: licenciatura
  parrafo(c, v("licPrograma"), 141, 391, 112, 28, 7);
  parrafo(c, v("licInstitucion"), 261, 391, 140, 28, 7);
  parrafo(c, v("licEstado"), 408, 391, 84, 28, 7);
  const [dd, mm, aa] = v("licFecha").split("/");
  if (dd) centrado(dd, 496, 516, 403, 7);
  if (mm) centrado(mm, 516, 536, 403, 7);
  if (aa) centrado(aa, 536, 556, 403, 7);
  // Especialidad y maestría: "No aplica"
  marca(c, 118, 445);
  marca(c, 118, 478);
  // Estatus
  if (v("estatus") === "Tiempo completo") marca(c, 159, 533);
  if (v("estatus") === "Tiempo parcial") marca(c, 241, 531);
  // Fecha
  centrado(String(d.hoy.getDate()), 91, 115, 776);
  centrado(String(d.hoy.getMonth() + 1).padStart(2, "0"), 122, 146, 776);
  centrado(String(d.hoy.getFullYear()), 153, 176, 776);
  if (d.foto) {
    const img = d.foto.tipo === "png" ? await doc.embedPng(d.foto.bytes) : await doc.embedJpg(d.foto.bytes);
    c.page.drawImage(img, { x: 506, y: c.alto - 136, width: 52, height: 64 });
  }
  // Aviso de privacidad (página 2): lo marca el aspirante (ACEPTO / NO ACEPTO)
  if (doc.getPageCount() > 1) {
    const p2 = doc.getPage(1);
    const c2 = { page: p2, font: c.font, alto: p2.getHeight() };
    if (v("avisoPrivacidad") === "Acepto") marca(c2, 265.5, 316);
    if (v("avisoPrivacidad") === "No acepto") marca(c2, 384.5, 316);
  }
}

// ---------------- SIP-04 · Dictamen del proceso de admisión ----------------
// Plantilla: SIP-04 en blanco (Word) convertido a PDF. Fecha y hora de la sesión las pone UTEyCV.
async function sip04(doc: PDFDocument, d: DatosPdf) {
  const page = doc.getPage(0);
  const c: Ctx = { page, font: await doc.embedFont(StandardFonts.Helvetica), alto: page.getHeight() };
  const v = (k: string) => s(d.valores[k]);
  const centrado = (t: string, x0: number, x1: number, top: number, tam = 10) => {
    if (!t) return;
    let size = tam;
    while (size > 6 && c.font.widthOfTextAtSize(t, size) > x1 - x0 - 4) size -= 0.5;
    const w = c.font.widthOfTextAtSize(t, size);
    c.page.drawText(t, { x: (x0 + x1) / 2 - w / 2, y: c.alto - top, size, font: c.font, color: TINTA });
  };
  centrado("México", 155, 220, 153);
  centrado(v("horaSesion"), 291, 336, 153);
  centrado(v("diaSesion"), 432, 477, 153);
  centrado(v("mesSesion"), 51, 135, 173);
  centrado(v("anioSesion"), 170, 220, 173);
  centrado(v("apellidoPaterno").toUpperCase(), 99, 200, 276);
  centrado(v("apellidoMaterno").toUpperCase(), 247, 335, 276);
  centrado(v("nombre").toUpperCase(), 397, 569, 276);
  if (v("estatus") === "Tiempo completo") marca(c, 496.5, 379);
  if (v("estatus") === "Tiempo parcial") marca(c, 555, 379);
}

// ---------------- MTC-EC · Acta de entrevista colegiada ----------------
async function mtcEc(doc: PDFDocument, d: DatosPdf) {
  const form = doc.getForm();
  const v = (k: string) => s(d.valores[k]);
  const txt = (campo: string, valor: string) => {
    try {
      form.getTextField(campo).setText(valor);
    } catch {
      /* campo inexistente en otra versión de la plantilla */
    }
  };
  const radio = (campo: string, opcion: string | undefined) => {
    try {
      const g = form.getRadioGroup(campo);
      if (opcion) g.select(opcion);
      else g.clear();
    } catch {
      /* ignorar */
    }
  };
  const siNo = (x: string) => (x === "Sí" ? "Si" : x === "No" ? "No" : undefined);

  txt("semestre", v("semestreIngreso"));
  const [dia, , mes, , anio] = v("fechaEntrevista").split(" ");
  txt("día", dia ?? "");
  txt("mes", mes ?? "");
  txt("año", (anio ?? "").slice(-2));
  txt("aspirante", v("nombreCompleto"));
  const areas = Array.isArray(d.valores.areasRanking) ? d.valores.areasRanking : [];
  const CAMPO_AREA: Record<string, string> = {
    "Procesamiento Paralelo": "Procesamiento paralelo",
    Mecatrónica: "Mecatrónica",
    "Seguridad Informática": "Seguridad informática",
    "Computación Inteligente": "Computación inteligente",
    "Realidad Virtual": "Realidad virtual",
    "Redes de Computadoras": "Redes de computadoras",
  };
  Object.values(CAMPO_AREA).forEach((campo) => txt(campo, ""));
  areas.forEach((a, i) => CAMPO_AREA[a] && txt(CAMPO_AREA[a], String(i + 1)));
  radio("SECIHTI", siNo(v("becaSecihti")));
  radio("sin beca", siNo(v("sinBeca")));
  radio("Profesor", siNo(v("profesorInteres")));
  txt("Nombre profesor", v("profesorInteres") === "Sí" ? v("profesorNombre") : "");
  radio("Horario", v("horario") || undefined);
  radio("Inglés", siNo(v("ingles2")));
  txt("Situación inglés", v("inglesSituacion"));
  txt("Promedio de Licenciatura", v("promedio"));
  radio("Certificado", siNo(v("certificadoTiene")));
  txt("Situación del Certificado", v("certificadoSituacion"));
  radio("Escuela de origen", v("escuelaOrigen") === "IPN" ? "Si" : v("escuelaOrigen") === "Externo" ? "No" : undefined);
  txt("Escuela IPN", v("escuelaOrigen") === "IPN" ? v("escuelaNombre") : "");
  txt("Institución externa", v("escuelaOrigen") === "Externo" ? v("escuelaNombre") : "");
  const arg = form.getTextField("Argumentación final");
  arg.enableMultiline();
  arg.setText(v("argumentacion"));
  arg.setFontSize(8);
  // Sección del sínodo (hoja 2): se deja en blanco; la llena el sínodo el día de la entrevista
  ["Proyección a futuro", "Observaciones generales", "Motivo", "ProfesoraRow1", "ProfesoraRow2", "ProfesoraRow3"].forEach((f) => txt(f, ""));
  ["formación académica", "conocimiento programa", "condiciones personales", "entorno familiar", "continuar estudios", "experiencias profesionales", "Continuar"].forEach((g) => radio(g, undefined));
  form.updateFieldAppearances();
}

// ---------------- SIP-08 · Programa individual de actividades ----------------
// Solo cascarón: materias, créditos y asesor salen de PROGRAMA_INDIVIDUAL_DEMO (con backend los captura el asesor).
async function sip08(doc: PDFDocument, d: DatosPdf) {
  const page = doc.getPage(0);
  const c: Ctx = { page, font: await doc.embedFont(StandardFonts.Helvetica), alto: page.getHeight() };
  const v = (k: string) => s(d.valores[k]);
  const P = PROGRAMA_INDIVIDUAL_DEMO;
  const fechaEnCeldas = (dd: string, mm: string, aa: string, xs: [number, number, number, number], top: number) => {
    centrado(c, dd, xs[0], xs[1], top, 9);
    centrado(c, mm, xs[1], xs[2], top, 9);
    centrado(c, aa, xs[2], xs[3], top, 9);
  };
  fechaEnCeldas(
    String(d.hoy.getDate()).padStart(2, "0"),
    String(d.hoy.getMonth() + 1).padStart(2, "0"),
    String(d.hoy.getFullYear()),
    [451, 486, 522, 564],
    157,
  );
  // No. de registro: un carácter por casilla (7 casillas)
  const celdas = [467, 481, 495, 509.5, 523.5, 538, 552, 566];
  v("noRegistro").slice(0, 7).split("").forEach((ch, i) => centrado(c, ch, celdas[i], celdas[i + 1], 189, 9));
  // Nombre del alumno
  centrado(c, v("apellidoPaterno").toUpperCase(), 201, 284, 217, 9);
  centrado(c, v("apellidoMaterno").toUpperCase(), 329, 438, 217, 9);
  centrado(c, v("nombre").toUpperCase(), 502, 566, 217, 9);
  if (v("estatus") === "Tiempo completo") marca(c, 456, 236.8);
  if (v("estatus") === "Tiempo parcial") marca(c, 551, 237.6);
  texto(c, v("programa"), 268, 255.5, 300, 9);
  texto(c, v("unidadAcademica"), 160, 274.5, 410, 9);
  // Asesor académico
  centrado(c, P.asesor.paterno.toUpperCase(), 182, 284, 334.5, 9);
  centrado(c, P.asesor.materno.toUpperCase(), 329, 423, 334.5, 9);
  centrado(c, P.asesor.nombre.toUpperCase(), 480, 566, 334.5, 9);
  // Tabla de unidades de aprendizaje (9 renglones; la clave va una letra por casilla)
  const filas = [387, 408, 429, 450, 471.4, 492.2, 513.1, 534.5, 555.4, 576.2];
  const xsClave = [42.2, 58.6, 75.1, 91.4, 108, 124.3, 140.6, 157.2, 173.5];
  P.materias.slice(0, 9).forEach((m, i) => {
    const top = filas[i] + (filas[i + 1] - filas[i]) / 2 + 3;
    m.clave.slice(0, 8).split("").forEach((ch, j) => centrado(c, ch, xsClave[j], xsClave[j + 1], top, 8));
    texto(c, m.nombre, 178, top, 206, 8);
    centrado(c, String(m.creditos), 388, 432, top, 8);
    centrado(c, m.periodo, 432, 475, top, 8);
    centrado(c, m.lugar, 475, 567, top, 8);
  });
  centrado(c, P.creditosMinimos, 388, 432, 589.5, 9);
  const [ld, lm, la] = P.fechaLimite.split("/");
  fechaEnCeldas(ld, lm, la, [465, 500.5, 536, 574], 618);
  // Nombres sobre las líneas de firma (la firma la pone cada quien a mano)
  centrado(c, v("nombreCompleto"), 56, 191, 690, 7);
  centrado(c, `${P.asesor.titulo} ${P.asesor.nombre} ${P.asesor.paterno} ${P.asesor.materno}`, 219, 354, 690, 7);
}

const RELLENADORES: Record<string, (doc: PDFDocument, d: DatosPdf) => Promise<void>> = {
  "sip-01": sip01,
  "sip-02": sip02,
  "sip-04": sip04,
  "sip-05": sip05,
  "sip-06": sip06,
  "sip-08": sip08,
  "mtc-ec": mtcEc,
};

export const puedeGenerar = (clave: string) => clave in RELLENADORES;

export async function rellenarPdf(clave: string, plantilla: ArrayBuffer | Uint8Array, datos: DatosPdf) {
  const fn = RELLENADORES[clave];
  if (!fn) throw new Error(`No hay rellenador para ${clave}`);
  const doc = await PDFDocument.load(plantilla);
  await fn(doc, datos);
  let salida = doc;
  if (datos.soloPaginas) {
    // Se copian solo esas hojas (ya llenas) a un PDF nuevo: las demás no quedan ni ocultas dentro del archivo.
    // (No se usa form.flatten(): con esta plantilla genera referencias inválidas.)
    salida = await PDFDocument.create();
    const hojas = await salida.copyPages(doc, datos.soloPaginas);
    hojas.forEach((h) => salida.addPage(h));
  }
  salida.setTitle(`${clave.toUpperCase()} — ${s(datos.valores.nombreCompleto) || "Aspirante"}`);
  salida.setProducer("SIGAP · CIDETEC IPN");
  return salida.save();
}
