import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRef, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Valor } from "../formatos";
import { PROGRAMA_INDIVIDUAL_DEMO } from "../programa-individual";
import { TABLAS_SIP02, idCantidadSip, idCeldaSip, GRADOS_SIP02 } from "../sip02-secciones";

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
  /** Aplanar el formulario: el texto queda impreso en la hoja y el PDF ya no tiene campos editables. */
  aplanar?: boolean;
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

  const anexos: { titulo: string; valor: string }[] = [];
  const seguro = (valor: string) => Array.from(valor.normalize("NFC")).map((caracter) => {
    try { font.encodeText(caracter); return caracter; } catch { return caracter === "\n" ? "\n" : "?"; }
  }).join("");
  const envolver = (valor: string, ancho: number, size: number) => {
    const lineas: string[] = [];
    for (const parrafo of seguro(valor).split("\n")) {
      let linea = "";
      for (const palabra of parrafo.split(/\s+/)) {
        if (linea && font.widthOfTextAtSize(`${linea} ${palabra}`, size) > ancho) { lineas.push(linea); linea = ""; }
        if (font.widthOfTextAtSize(palabra, size) > ancho) {
          for (const letra of palabra) {
            if (font.widthOfTextAtSize(linea + letra, size) > ancho) { lineas.push(linea); linea = ""; }
            linea += letra;
          }
        } else linea = linea ? `${linea} ${palabra}` : palabra;
      }
      lineas.push(linea);
    }
    return lineas;
  };
  // Mantiene una letra legible; si no cabe, conserva el texto completo en el anexo.
  const celda = (ctx: Ctx, valor: string, x: number, top: number, ancho: number, alto: number, titulo: string) => {
    if (!valor) return;
    for (let size = 8; size >= 6; size -= 0.5) {
      const lineas = envolver(valor, ancho - 6, size);
      if (lineas.length * (size + 1) <= alto - 2) {
        lineas.forEach((linea, i) => texto(ctx, linea, x + 3, top + size + 1 + i * (size + 1), ancho - 6, size));
        return;
      }
    }
    anexos.push({ titulo, valor });
    texto(ctx, `Ver anexo ${anexos.length}`, x + 3, top + 8, ancho - 6, 6);
  };

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
  texto(c, v("empleoDomicilio"), 103, 489, 313, 8);
  texto(c, v("empleoTelefono"), 471, 489, 94, 8);
  texto(c, v("jefeNombre"), 172, 535, 245, 8);
  texto(c, v("jefeTelefono"), 471, 535, 94, 8);
  texto(c, v("cargo"), 102, 512, 194, 8);
  texto(c, v("empleoInicio"), 350, 512, 68, 8);
  texto(c, v("empleoFin"), 471, 512, 94, 8);
  // III. Formación académica · Licenciatura
  texto(c, v("licPrograma"), 173, 582, 394, 8);
  texto(c, v("licInstitucion"), 172, 593, 116, 7);
  texto(c, v("licPais"), 484, 593, 83, 7);
  texto(c, v("licIncorporada"), 355, 593, 83, 7);
  texto(c, v("licIngreso"), 264, 605, 106, 7);
  texto(c, v("licEgreso"), 463, 605, 104, 7);
  texto(c, v("formaTitulacion"), 172, 620, 133, 7);
  texto(c, v("fechaExamen"), 172, 639, 80, 7);
  texto(c, v("licFecha"), 335, 639, 75, 7);
  celda(c, v("licTesis"), 410, 607.5, 156, 19, "Título de tesis de licenciatura");
  if (v("licBeca") === "Sí") anexos.push({ titulo: "Beca durante la licenciatura", valor: v("licBecaInstitucion") || "Sí" });

  // Hoja 2 · Maestría y doctorado: no aplica
  const c2 = hoja(1);
  GRADOS_SIP02.forEach((grado, i) => {
    const ctx = i === 0 ? c : c2;
    const base = [669.5, 72, 176][i];
    const dato = (campo: string) => v(idCeldaSip(grado.id, 0, campo));
    if (v(`sip02_${grado.id}_aplica`) !== "Sí") { marca(ctx, i === 0 ? 133.5 : i === 1 ? 131.5 : 129.5, base, 7); return; }
    celda(ctx, dato("programa"), 170, base - 13, 398, i === 2 ? 24 : 18, `${grado.titulo}: programa`);
    const institucionTop = i === 0 ? 675.3 : i === 1 ? 78.2 : 187.6;
    celda(ctx, dato("institucion"), 170, institucionTop, i === 0 ? 120 : 80, 11, `${grado.titulo}: institución`);
    celda(ctx, dato("incorporada"), i === 0 ? 354 : 308, institucionTop, i === 0 ? 94 : 105, 11, `${grado.titulo}: incorporada a`);
    celda(ctx, dato("pais"), i === 0 ? 486 : 446, institucionTop, i === 0 ? 82 : 122, 11, `${grado.titulo}: país`);
    const periodoTop = i === 0 ? 686.8 : i === 1 ? 87.8 : 199.1;
    if (i === 0) {
      texto(ctx, dato("inicio"), 265, periodoTop + 8, 107, 7);
      texto(ctx, dato("fin"), 464, periodoTop + 8, 103, 7);
    } else {
      celda(ctx, [dato("inicio"), dato("fin")].filter(Boolean).join(" - "), 170, periodoTop, 133, 19, `${grado.titulo}: periodo de estudios`);
      celda(ctx, dato("tesis"), 419, periodoTop, 149, 19, `${grado.titulo}: tesis`);
    }
    const tesisTop = i === 0 ? 697.6 : i === 1 ? 106.8 : 217.9;
    celda(ctx, dato("titulacion"), 170, tesisTop, i === 0 ? 133 : 80, 19, `${grado.titulo}: forma de titulación`);
    if (i === 0) celda(ctx, dato("tesis"), 419, tesisTop, 149, 19, `${grado.titulo}: tesis`);
    else {
      texto(ctx, dato("fechaTitulo"), 320, tesisTop + 10, 93, 7);
    }
    const fechaTop = i === 0 ? 716.4 : i === 1 ? 125.6 : 236.9;
    texto(ctx, dato("fechaExamen"), 172, fechaTop + 9, 80, 7);
    texto(ctx, dato("fechaTitulo"), i === 0 ? 335 : 320, fechaTop + 9, i === 0 ? 75 : 93, 7);
    const becaTop = i === 0 ? 742 : i === 1 ? 153 : 265;
    if (dato("beca")) marca(ctx, dato("beca") === "Sí" ? 194 : 238, becaTop, 7);
    celda(i === 0 ? c2 : ctx, dato("becaInstitucion"), 439, i === 0 ? 48.4 : becaTop - 9, 129, 11, `${grado.titulo}: institución de la beca`);
  });

  for (const tabla of TABLAS_SIP02) {
    const cantidad = Math.min(Number(v(idCantidadSip(tabla.id))) || 0, tabla.max);
    for (let fila = 0; fila < cantidad; fila++) {
      const titulo = (columna: number) => `${tabla.titulo}, registro ${fila + 1}: ${tabla.columnas[columna].label}`;
      const dato = (columna: number) => v(idCeldaSip(tabla.id, fila, tabla.columnas[columna].id));
      if (tabla.id === "cursos") {
        const top = 323 + fila * 33.9;
        celda(c2, dato(0), 170, top, 399, 11, titulo(0));
        celda(c2, dato(1), 170, top + 11.2, 120, 11, titulo(1));
        celda(c2, dato(2), 354, top + 11.2, 95, 11, titulo(2));
        celda(c2, dato(3), 486, top + 11.2, 83, 11, titulo(3));
        texto(c2, dato(4), 265, top + 30, 107, 7);
        texto(c2, dato(5), 464, top + 30, 103, 7);
      } else if (tabla.id === "otrosIdiomas") {
        const ctx = hoja(2);
        const top = 506.4 + fila * 13.8;
        celda(ctx, dato(0), 51.5, top, 86, 13.8, titulo(0));
        [[161.5, 199.5], [244.5, 282.5], [336, 374], [419, 452.5], [493.5, 531.5]].forEach(([si, no], i) => { if (dato(i + 1)) marca(ctx, dato(i + 1) === "Sí" ? si : no, top + 7, 7); });
      } else {
        const segmento = tabla.id === "proyectosDesarrollo" && fila >= 2 ? 1 : 0;
        const filaLocal = segmento ? fila - 2 : fila;
        const ctx = hoja(tabla.paginas[segmento]);
        const top = tabla.tops[segmento] + filaLocal * tabla.altos[segmento];
        tabla.columnas.forEach((columna, j) => celda(ctx, dato(j), tabla.xs[j], top, tabla.xs[j + 1] - tabla.xs[j], tabla.altos[segmento], titulo(j)));
      }
    }
  }

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
  celda(c3, v("experiencia"), 318, 596.5, 126, 17.5, "IX. Principales funciones del empleo actual o último");
  const periodo = [v("empleoInicio"), v("empleoFin") || (v("empleoInicio") ? "a la fecha" : "")].filter(Boolean).join(" – ");
  texto(c3, periodo, 446, 608, 121, 7);

  // Hoja 5 · XIV. Información adicional y fecha
  const c5 = hoja(4);
  celda(c5, [v("investigacion"), v("sip02Adicional")].filter(Boolean).join("\n\n"), 65.6, 447, 503.6, 120, "XIV. Información adicional relevante");
  centrado(c5, String(d.hoy.getDate()), 344, 399, 646, 10);
  centrado(c5, MESES[d.hoy.getMonth()], 416, 488, 646, 10);
  centrado(c5, String(d.hoy.getFullYear()), 509, 564, 646, 10);

  // Hoja 6 · Aviso de privacidad: ACEPTO
  marca(hoja(5), 290.5, 311.5, 10);
  if (anexos.length) {
    let ctx: Ctx;
    let top = 0;
    const nuevaHoja = () => {
      const page = doc.addPage([612, 792]);
      ctx = { page, font, alto: 792 };
      texto(ctx, "SIP-02 | Anexo de información complementaria", 48, 45, 516, 13);
      texto(ctx, [v("nombre"), v("apellidoPaterno"), v("apellidoMaterno")].filter(Boolean).join(" "), 48, 65, 516, 10);
      top = 95;
    };
    nuevaHoja();
    anexos.forEach((anexo, i) => {
      for (const linea of envolver(`${i + 1}. ${anexo.titulo}`, 516, 10)) {
        if (top > 730) nuevaHoja();
        texto(ctx, linea, 48, top, 516, 10); top += 14;
      }
      for (const linea of envolver(anexo.valor, 516, 10)) {
        if (top > 730) nuevaHoja();
        texto(ctx, linea, 48, top, 516, 10); top += 14;
      }
      top += 16;
    });
  }
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
  // Programa semestral: materias que anotó el aspirante (6 filas; clave, curso, profesor, unidad académica)
  const todas = (Array.isArray(d.valores.materias) ? d.valores.materias : [])
    .map((f) => f.split("\t"))
    .filter((celdas) => celdas.some((x) => x.trim()));
  const materias = todas.slice(0, 6);
  const FILAS = [579.2, 596.9, 615.2, 632.9, 650.6, 668.2];
  materias.forEach(([clave = "", curso = "", profesor = "", unidad = ""], i) => {
    const top = FILAS[i] + 12;
    // La clave va un carácter por casilla (8 casillas)
    const CASILLAS = [46.1, 54.3, 62.2, 70, 77.9, 86.1, 94.2, 103.4];
    [...clave.toUpperCase().replace(/\s/g, "")].slice(0, 8).forEach((ch, k) => centrado(ch, CASILLAS[k] - 5.5, CASILLAS[k] + 5.5, top, 7));
    texto(c, curso, 112, top, 214, 7.5);
    texto(c, profesor, 332, top, 108, 7);
    centrado(unidad, 443, 563, top, 7);
  });
  // Fecha
  centrado(String(d.hoy.getDate()), 91, 115, 776);
  centrado(String(d.hoy.getMonth() + 1).padStart(2, "0"), 122, 146, 776);
  centrado(String(d.hoy.getFullYear()), 153, 176, 776);
  if (d.foto) {
    const img = d.foto.tipo === "png" ? await doc.embedPng(d.foto.bytes) : await doc.embedJpg(d.foto.bytes);
    c.page.drawImage(img, { x: 506, y: c.alto - 136, width: 52, height: 64 });
  }
  // Más de 6 materias (botón + del formulario): las demás van en una hoja anexa al final
  if (todas.length > 6) await anexoMaterias(doc, c.font, todas.slice(6), v("nombre") ? `${v("nombre")} ${v("apellidoPaterno")} ${v("apellidoMaterno")}` : "");
  // Aviso de privacidad (página 2): lo marca el aspirante (ACEPTO / NO ACEPTO)
  if (doc.getPageCount() > 1) {
    const p2 = doc.getPage(1);
    const c2 = { page: p2, font: c.font, alto: p2.getHeight() };
    if (v("avisoPrivacidad") === "Acepto") marca(c2, 265.5, 316);
    if (v("avisoPrivacidad") === "No acepto") marca(c2, 384.5, 316);
  }
}

/** Hoja anexa del SIP-01 con las materias que no caben en las 6 filas de la plantilla. */
async function anexoMaterias(doc: PDFDocument, font: PDFFont, filas: string[][], nombre: string) {
  const [ancho, alto] = [doc.getPage(0).getWidth(), doc.getPage(0).getHeight()];
  const page = doc.addPage([ancho, alto]);
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);
  const col = [45, 120, 330, 450];
  let y = alto - 60;
  page.drawText("SIP-01 · Solicitud de inscripción — Anexo: programa semestral (continuación)", { x: 45, y, size: 11, font: negrita, color: TINTA });
  y -= 16;
  if (nombre.trim()) page.drawText(`Aspirante: ${nombre.trim()}`, { x: 45, y, size: 9, font, color: TINTA });
  y -= 26;
  ["Clave", "Actividad académica (curso)", "Profesor", "Unidad académica"].forEach((t, i) => page.drawText(t, { x: col[i], y, size: 8.5, font: negrita, color: TINTA }));
  y -= 6;
  page.drawLine({ start: { x: 45, y }, end: { x: ancho - 45, y }, thickness: 0.6, color: TINTA });
  const recorta = (t: string, max: number, tam: number) => {
    let r = t;
    while (r && font.widthOfTextAtSize(r, tam) > max) r = r.slice(0, -1);
    return r;
  };
  filas.forEach(([clave = "", curso = "", profesor = "", unidad = ""], i) => {
    y -= 18;
    page.drawText(`${i + 7}.`, { x: 30, y, size: 7.5, font, color: TINTA });
    [clave.toUpperCase(), curso, profesor, unidad].forEach((t, k) =>
      page.drawText(recorta(t, (col[k + 1] ?? ancho - 45) - col[k] - 8, 8), { x: col[k], y, size: 8, font, color: TINTA }),
    );
    page.drawLine({ start: { x: 45, y: y - 5 }, end: { x: ancho - 45, y: y - 5 }, thickness: 0.3, color: rgb(0.7, 0.72, 0.8) });
  });
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
  // Fecha de la sesión del Colegio: viene como dd/mm/aaaa (la captura el admitido) o ya separada
  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const [dd, mm, aa] = v("fechaSesion").split("/");
  centrado("México", 155, 220, 153);
  centrado(v("horaSesion"), 291, 336, 153);
  centrado(v("diaSesion") || (dd ?? "").replace(/^0/, ""), 432, 477, 153);
  centrado(v("mesSesion") || (mm ? MESES[Number(mm) - 1] ?? "" : ""), 51, 135, 173);
  centrado(v("anioSesion") || (aa ?? ""), 170, 220, 173);
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
  // Hoja 2 (Conclusiones): la llenan los profesores entrevistadores en su sesión de Profesor; si no viene, queda en blanco
  const SINODO_TXT: Record<string, string> = { proyeccion: "Proyección a futuro", observaciones: "Observaciones generales", motivo: "Motivo", prof1: "ProfesoraRow1", prof2: "ProfesoraRow2", prof3: "ProfesoraRow3" };
  Object.entries(SINODO_TXT).forEach(([k, campo]) => {
    txt(campo, v(k));
    try {
      const f = form.getTextField(campo);
      if (campo === "Observaciones generales") f.enableMultiline();
      const largo = v(k).length;
      f.setFontSize(campo.startsWith("ProfesoraRow") ? 9 : campo === "Motivo" ? (largo > 120 ? 6 : largo > 90 ? 7 : largo > 65 ? 8 : 10) : 10);
    } catch {
      /* ignorar */
    }
  });
  const CRITERIOS: Record<string, string> = {
    c_formacion: "formación académica",
    c_programa: "conocimiento programa",
    c_personales: "condiciones personales",
    c_familiar: "entorno familiar",
    c_laborales: "continuar estudios",
    c_experiencia: "experiencias profesionales",
  };
  Object.entries(CRITERIOS).forEach(([k, g]) => radio(g, v(k) || undefined));
  // En la plantilla, las opciones de "Continuar" quedaron con otros nombres: Sí = Matutino, No = Vespertino, Con reservas = Indistinto
  const CONTINUAR: Record<string, string> = { Aprobado: "Matutino", Rechazado: "Vespertino", "Con reservas": "Indistinto" };
  radio("Continuar", CONTINUAR[v("continuar")]);
  form.updateFieldAppearances();
}

// ---------------- SIP-08 · Programa individual de actividades ----------------
// Solo cascarón: materias, créditos y asesor salen de PROGRAMA_INDIVIDUAL_DEMO (con backend los captura Control Escolar).
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
  if (datos.aplanar) {
    // El rellenador ya generó la apariencia de cada campo; al aplanar, esa apariencia queda como contenido de la hoja
    doc.getForm().flatten();
    // Con esta plantilla, flatten() deja en las hojas referencias a los campos que eliminó: se limpian y se quita
    // el formulario por completo, para que el PDF quede válido y sin nada editable.
    for (const pagina of doc.getPages()) {
      const anotaciones = pagina.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
      if (!anotaciones) continue;
      const validas = anotaciones.asArray().filter((r) => {
        const obj = r instanceof PDFRef ? doc.context.lookup(r) : r;
        return obj instanceof PDFDict && obj.get(PDFName.of("Subtype")) !== PDFName.of("Widget");
      });
      if (validas.length) pagina.node.set(PDFName.of("Annots"), doc.context.obj(validas));
      else pagina.node.delete(PDFName.of("Annots"));
    }
    doc.catalog.delete(PDFName.of("AcroForm"));
  }
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
