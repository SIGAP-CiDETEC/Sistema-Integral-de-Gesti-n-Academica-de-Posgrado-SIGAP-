import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { SECCIONES, esVisible, type Respuestas } from "../registro-form";

/** Informe completo del registro; no se recortan las respuestas largas. */
export async function generarPdfRegistro(respuestas: Respuestas, folio: string) {
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  const azul = rgb(0.08, 0.15, 0.35);
  const margen = 48;
  const ancho = 499;
  let pagina = pdf.addPage([595, 842]);
  let y = 0;
  // Las fuentes estándar admiten español; otros caracteres se representan con ?.
  const limpiar = (texto: string) => Array.from(texto.normalize("NFC").replace(/\t/g, "    ")).map((c) => {
    if (c === "\n" || c === "\r") return c;
    try { normal.encodeText(c); return c; } catch { return "?"; }
  }).join("");
  function nuevaPagina(primera = false) {
    if (!primera) pagina = pdf.addPage([595, 842]);
    pagina.drawRectangle({ x: 0, y: 768, width: 595, height: 74, color: azul });
    pagina.drawText("SIGAP | CIDETEC - IPN", { x: margen, y: 811, font: negrita, size: 13, color: rgb(1, 1, 1) });
    pagina.drawText(`Registro de admisión | ${limpiar(folio)}`, { x: margen, y: 787, font: normal, size: 11, color: rgb(1, 1, 1) });
    y = 742;
  }
  nuevaPagina(true);
  function lineas(texto: string, fuerte: boolean, size: number, color = rgb(0.15, 0.18, 0.23)) {
    const fuente = fuerte ? negrita : normal;
    for (const parrafo of limpiar(texto).replace(/\r/g, "").split("\n")) {
      let linea = "";
      const escribir = () => {
        if (y < 65) nuevaPagina();
        pagina.drawText(linea, { x: margen, y, size, font: fuente, color });
        y -= size + 5;
        linea = "";
      };
      for (const palabra of parrafo.split(/\s+/)) {
        const prueba = linea ? `${linea} ${palabra}` : palabra;
        if (linea && fuente.widthOfTextAtSize(prueba, size) > ancho) escribir();
        if (fuente.widthOfTextAtSize(palabra, size) > ancho) {
          for (const caracter of palabra) {
            if (fuente.widthOfTextAtSize(linea + caracter, size) > ancho) escribir();
            linea += caracter;
          }
        } else linea = linea ? `${linea} ${palabra}` : palabra;
      }
      escribir();
    }
  }
  lineas("Información del aspirante para revisión académica", true, 15, azul);
  y -= 10;
  for (const [indice, seccion] of SECCIONES.entries()) {
    if (y < 150) nuevaPagina();
    lineas(`${indice + 1}. ${seccion.titulo}`, true, 13, azul);
    y -= 8;
    for (const pregunta of seccion.preguntas.filter((p) => esVisible(p, respuestas))) {
      if (y < 115) nuevaPagina();
      lineas(pregunta.label, true, 10);
      const valor = respuestas[pregunta.id] ?? pregunta.valorFijo;
      const texto = Array.isArray(valor)
        ? valor.map((v, i) => pregunta.ordenable ? `${i + 1}. ${v}` : v).join("\n")
        : valor || "Sin respuesta";
      lineas(texto, false, 11);
      y -= 12;
    }
    y -= 10;
  }
  const paginas = pdf.getPages();
  paginas.forEach((p, i) => {
    p.drawLine({ start: { x: margen, y: 44 }, end: { x: 547, y: 44 }, thickness: 0.5, color: rgb(0.8, 0.82, 0.86) });
    p.drawText(`Uso académico | ${folio} | Página ${i + 1} de ${paginas.length}`, { x: margen, y: 29, size: 9, font: normal, color: azul });
  });
  pdf.setTitle(`Registro de admisión ${folio}`);
  pdf.setAuthor("SIGAP - CIDETEC IPN");
  return pdf.saveAsBase64({ dataUri: true });
}
