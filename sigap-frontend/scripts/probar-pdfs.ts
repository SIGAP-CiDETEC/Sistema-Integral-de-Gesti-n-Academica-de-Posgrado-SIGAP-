/**
 * Genera los formatos con datos de ejemplo para revisar la calibración.
 * Uso: npx tsx scripts/probar-pdfs.ts <carpeta-salida> [foto.jpg]
 */
import fs from "node:fs";
import path from "node:path";
import { REGISTRO_DEMO } from "../src/lib/aspirante-datos";
import { FORMATOS, resolver, type Capturas } from "../src/lib/formatos";
import { puedeGenerar, rellenarPdf } from "../src/lib/pdf/rellenar";

const salida = process.argv[2] ?? "salida-pdfs";
const foto = process.argv[3];
fs.mkdirSync(salida, { recursive: true });

const capturas: Capturas = {
  estatus: "Tiempo completo",
  calle: "Av. Instituto Politécnico Nacional",
  numExt: "2580",
  colonia: "La Laguna Ticomán",
  alcaldia: "Gustavo A. Madero",
  cp: "07340",
  estadoDom: "Ciudad de México",
  licFecha: "15/07/2024",
  rfc: "GOLM980412AB3",
  numInt: "4B",
  telCasa: "5557296000",
  empresa: "Fintech Soluciones S.A. de C.V.",
  empleoInicio: "01/08/2022",
  licIngreso: "15/08/2016",
  licEgreso: "30/06/2021",
  fechaExamen: "10/07/2024",
  cedula: "13579246",
  inglesHabilidades: ["Comprensión de lectura", "Expresión oral"],
  inglesAval: "Sí",
  becaSecihti: "Sí",
  sinBeca: "No",
  profesorInteres: "Sí",
  profesorNombre: "Dr. Juan Pérez",
  horario: "Matutino",
  ingles2: "Sí",
  inglesSituacion: "Constancia CENLEX B1",
  argumentacion: "Tengo experiencia profesional en desarrollo de software y un proyecto previo de investigación. Puedo dedicarme de tiempo completo y aportar al laboratorio con mi experiencia en cómputo en la nube.",
};

async function main() {
const hoy = new Date(2026, 1, 20);
for (const f of FORMATOS.filter((f) => f.plantilla && puedeGenerar(f.clave))) {
  const ctx = { r: REGISTRO_DEMO, c: capturas, hoy };
  const valores = Object.fromEntries(f.campos.map((c) => [c.id, resolver(c, ctx)]));
  const bytes = await rellenarPdf(f.clave, fs.readFileSync(path.join("public/formatos", f.plantilla!)), {
    valores,
    hoy,
    soloPaginas: f.paginasAspirante,
    foto: foto ? { bytes: fs.readFileSync(foto), tipo: "jpg" } : undefined,
  });
  fs.writeFileSync(path.join(salida, `${f.clave}.pdf`), bytes);
  console.log("ok", f.clave);
}
}

main();
