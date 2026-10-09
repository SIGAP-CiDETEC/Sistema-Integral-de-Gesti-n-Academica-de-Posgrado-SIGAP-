const fs = require("node:fs");
const assert = require("node:assert/strict");
const ts = require("typescript");
require.extensions[".ts"] = (modulo, archivo) => modulo._compile(ts.transpileModule(fs.readFileSync(archivo, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, archivo);
const { TABLAS_SIP02, GRADOS_SIP02, CAMPOS_GRADO_SIP02, idCantidadSip, idCeldaSip } = require("../src/lib/sip02-secciones.ts");
const { SECCIONES, validarSeccion, esVisible } = require("../src/lib/registro-form.ts");
const { REGISTRO_DEMO, CAPTURAS_DEMO } = require("../src/lib/aspirante-datos.ts");
const { formatoPorClave, camposVisibles, resolver, faltantes } = require("../src/lib/formatos.ts");
const { rellenarPdf } = require("../src/lib/pdf/rellenar.ts");
const { generarPdfRegistro } = require("../src/lib/pdf/registro.ts");
async function main() {
  const r = { ...CAPTURAS_DEMO, ...REGISTRO_DEMO, nacionalidad: "Mexicana", lugarNacimiento: "Ciudad de México, México", estadoCivil: "Soltero(a)", pais: "México", licPais: "México", experiencia: "Desarrollo de software.", empleoVigente: "Sí", genero: "Femenino", tieneExperienciaProfesional: "Sí", empleoDomicilio: "Av. Universidad 10", empleoTelefono: "5512345678", jefeNombre: "Laura Pérez", jefeTelefono: "5512345678", licIncorporada: "IPN", licTesis: "Sistemas de cómputo paralelo" };
  const ejemplo = (columna, fila) => columna.opciones ? "Sí" : columna.label.includes("dd/mm/aaaa") || columna.id.includes("fecha") || ["inicio", "fin"].includes(columna.id) ? "15/08/2024" : columna.id === "anio" ? "2024" : columna.id === "numero" ? "2" : columna.id === "clave" ? "IPN-2024-01" : columna.id === "pais" ? "México" : `${columna.label.split(" (")[0]} ${fila + 1}`;
  for (const tabla of TABLAS_SIP02) {
    r[idCantidadSip(tabla.id)] = String(tabla.max);
    for (let fila = 0; fila < tabla.max; fila++) for (const columna of tabla.columnas) r[idCeldaSip(tabla.id, fila, columna.id)] = ejemplo(columna, fila);
  }
  for (const grado of GRADOS_SIP02) {
    r[`sip02_${grado.id}_aplica`] = "Sí";
    for (const columna of CAMPOS_GRADO_SIP02) r[idCeldaSip(grado.id, 0, columna.id)] = ejemplo(columna, 0);
  }
  r.sip02Adicional = "Información adicional de ejemplo para revisar el formato.";
  r[idCeldaSip("productosConcluidos", 0, "referencia")] = "Referencia bibliográfica completa con acentos: investigación en cómputo. ".repeat(8);
  for (const seccion of SECCIONES) assert.deepEqual(validarSeccion(seccion, r), {}, seccion.titulo);
  const f = formatoPorClave("sip-02");
  const ctx = { r, c: {}, hoy: new Date(2026, 9, 9) };
  assert.deepEqual(faltantes(f, ctx), []);
  const valores = Object.fromEntries(camposVisibles(f, ctx).map((campo) => [campo.id, resolver(campo, ctx)]));
  for (const tabla of TABLAS_SIP02) for (let fila = 0; fila < tabla.max; fila++) for (const columna of tabla.columnas) {
    const id = idCeldaSip(tabla.id, fila, columna.id);
    assert.equal(valores[id], r[id], id);
  }
  const sinTrayectoria = { ...r };
  for (const tabla of TABLAS_SIP02) sinTrayectoria[idCantidadSip(tabla.id)] = "0";
  for (const grado of GRADOS_SIP02) sinTrayectoria[`sip02_${grado.id}_aplica`] = "No";
  const visibles = new Set(SECCIONES.flatMap((s) => s.preguntas).filter((p) => esVisible(p, sinTrayectoria)).map((p) => p.id));
  assert(!visibles.has(idCeldaSip("docencia", 0, "institucion")));
  assert(!camposVisibles(f, { ...ctx, r: sinTrayectoria }).some((c) => c.id === idCeldaSip("docencia", 0, "institucion")));
  assert.equal(resolver(f.campos.find((c) => c.id === idCeldaSip("docencia", 0, "institucion")), { ...ctx, c: { [idCeldaSip("docencia", 0, "institucion")]: "Corrección del aspirante" } }), "Corrección del aspirante");
  fs.mkdirSync("output/pdf", { recursive: true });
  fs.writeFileSync("output/pdf/sip-02-completo-demo.pdf", await rellenarPdf("sip-02", fs.readFileSync("public/formatos/sip-02.pdf"), { valores, hoy: ctx.hoy }));
  const registro = await generarPdfRegistro(r, "MTC-A27984");
  fs.writeFileSync("output/pdf/registro-completo-demo.pdf", Buffer.from(registro.split(",")[1], "base64"));
  console.log("Todas las tablas: mapeo, capacidad máxima, secciones opcionales y correcciones verificados. Ambos PDF generados.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
