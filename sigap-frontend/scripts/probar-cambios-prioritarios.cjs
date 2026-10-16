const fs = require("node:fs");
const assert = require("node:assert/strict");
const ts = require("typescript");
require.extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, f);
const { documentoValidado, cambiarArchivoProtegido } = require("../src/lib/bloqueo-documentos.ts");
const { ID_TEMPORAL_DEMO } = require("../src/lib/cuenta-alumno.ts");
const { ASPIRANTES_BASE } = require("../src/lib/posgrado/datos.ts");
const csv = require("../src/lib/csv.ts");
let columnasReporte;
csv.descargarCsv = (_nombre, encabezados, filas) => {
  columnasReporte = encabezados;
  for (const fila of filas) assert.equal(fila.length, encabezados.length, "El reporte debe mantener alineadas sus columnas");
  assert.equal(new Set(encabezados).size, encabezados.length, "El reporte no debe tener columnas duplicadas");
};
const { descargarReporteAspirantes } = require("../src/lib/reporte-aspirantes.ts");
const { rellenarPdf } = require("../src/lib/pdf/rellenar.ts");
const { PDFDocument } = require("pdf-lib");
async function main() {
  const original = { certificado: { nombre: "aprobado.pdf", fecha: "2026-10-10" } };
  const estado = { docs: { [ID_TEMPORAL_DEMO]: { certificado: { estado: "aprobado" } } } };
  const validado = documentoValidado(estado, "certificado");
  assert.equal(validado, true);
  assert.equal(cambiarArchivoProtegido(original, "certificado", { nombre: "nuevo.pdf", fecha: "2099-12-31" }, validado), original, "No se puede reemplazar ni invalidar la aprobación con la fecha del archivo");
  assert.equal(cambiarArchivoProtegido(original, "certificado", null, validado), original, "No se puede eliminar un aprobado");
  assert.equal(documentoValidado({ docs: { [ID_TEMPORAL_DEMO]: { certificado: { estado: "observado" } } } }, "certificado"), false);
  assert.equal(cambiarArchivoProtegido(original, "certificado", null, false).certificado, undefined);
  assert.equal(documentoValidado({ cambios: { [ID_TEMPORAL_DEMO]: { uteycv: { firmadosFinales: { "sip-01": { nombre: "final.pdf" } } } } } }, "sip-01"), true);
  assert.equal(documentoValidado({ cambios: { [ID_TEMPORAL_DEMO]: { uteycv: { formalizadoEl: "2026-10-16" } } } }, "foto"), true);
  assert.equal(documentoValidado(estado, "titulo"), false);
  descargarReporteAspirantes(ASPIRANTES_BASE);
  assert(columnasReporte.length > 40, "Conservar el reporte completo del proceso de admisión");
  assert.equal(documentoValidado(estado, "certificado", "ASP-2026-050"), false, "No mezclar aprobaciones entre perfiles");
  const memoria = new Map([
    ["sigap-posgrado", JSON.stringify({ docs: { "ASP-2026-050": { "sip-02": { estado: "aprobado" } } } })],
    ["sigap-aspirante-activo", "ASP-2026-050"],
  ]);
  global.localStorage = { getItem: (clave) => memoria.get(clave) ?? null };
  const { estaDocumentoValidado } = require("../src/lib/bloqueo-documentos.ts");
  assert.equal(estaDocumentoValidado("sip-02"), true, "Leer la aprobación del perfil activo");
  memoria.delete("sigap-aspirante-activo");
  assert.equal(estaDocumentoValidado("sip-02"), false, "Separar aprobaciones del perfil en vivo");
  const materias = Array.from({ length: 18 }, (_, i) => [`M${i + 1}`, `Materia adicional ${i + 1}`, "Docente de prueba", "CIDETEC"].join("\t"));
  const bytes = await rellenarPdf("sip-01", fs.readFileSync("public/formatos/sip-01.pdf"), { valores: { nombre: "María", apellidoPaterno: "González", materias }, hoy: new Date() });
  const pdf = await PDFDocument.load(bytes);
  const plantilla = await PDFDocument.load(fs.readFileSync("public/formatos/sip-01.pdf"));
  assert(pdf.getPageCount() > plantilla.getPageCount(), "Las materias adicionales deben generar anexos");
  console.log("OK: bloqueo de reemplazo/borrado, aprobación de Posgrado y Control Escolar, reapertura observada, columnas CSV y SIP-01 con 18 materias.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
