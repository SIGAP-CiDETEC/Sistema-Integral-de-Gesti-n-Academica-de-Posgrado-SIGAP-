/**
 * Aspirante FICTICIO para demostrar la entrevista colegiada en el servidor, junto a los aspirantes reales.
 *
 *   npm run aspirante-demo              crea (o deja como nuevo) el aspirante DEMO2701 con sus 8 documentos
 *   npm run aspirante-demo -- 2         lo mismo con un segundo aspirante ficticio, DEMO2702 (y así 3, 4…)
 *   npm run aspirante-demo -- borrar    elimina DEMO2701 por completo (postulación, entrevista, acta, bitácora y archivos)
 *   npm run aspirante-demo -- 2 borrar  elimina DEMO2702
 *
 * OJO: crear un aspirante que ya existe lo deja como nuevo (borra su entrevista y su acta).
 *
 * Todo en él es inventado: nombre, procedencia y documentos (PDF que dicen "DOCUMENTO DE DEMOSTRACIÓN").
 * No tiene cuenta para iniciar sesión; Posgrado y los profesores lo ven en sus bandejas como a cualquier aspirante.
 */
import 'dotenv/config';
import { rmSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { guardarArchivo, rutaAlmacen } from '../comun/almacen';

export const FOLIO_DEMO = 'DEMO2701';
const folioDemo = (n: number) => `DEMO27${String(n).padStart(2, '0')}`;
const CONVOCATORIA = { clave: 'A27', nombre: 'Convocatoria de admisión A-27' };
const ASPIRANTE_1 = {
  nombres: 'Aspirante',
  apellidoPaterno: 'Demostración',
  apellidoMaterno: 'Ficticio',
  correo: 'aspirante.demo@sigap.local',
  procedencia: 'Universidad de Demostración (ficticia)',
  carrera: 'Ingeniería en Sistemas Computacionales',
};
const DOCUMENTOS: Record<string, { nombre: string; obligatorio: boolean }> = {
  titulo: { nombre: 'Título de licenciatura', obligatorio: true },
  cedula: { nombre: 'Cédula profesional', obligatorio: false },
  certificado: { nombre: 'Certificado de estudios', obligatorio: true },
  ingles: { nombre: 'Constancia de dominio de inglés', obligatorio: true },
  curp: { nombre: 'CURP', obligatorio: false },
  acta: { nombre: 'Acta de nacimiento', obligatorio: true },
  identificacion: { nombre: 'Identificación oficial', obligatorio: true },
  'sip-02': { nombre: 'Currículum vitae (SIP-02)', obligatorio: true },
};

/** PDF mínimo de una página (carta) con unas líneas de texto en Helvetica. */
export function pdfDemo(lineas: string[]): Buffer {
  const esc = (t: string) => t.replace(/[\\()]/g, (c) => `\\${c}`);
  const texto = lineas.map((l, i) => `BT /F1 ${i === 0 ? 20 : 12} Tf 72 ${700 - i * 28} Td (${esc(l)}) Tj ET`).join('\n');
  const marco = '0.8 0.1 0.1 RG 4 w 40 40 532 712 re S';
  const contenido = Buffer.from(`${marco}\n${texto}`, 'latin1');
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];
  const partes: Buffer[] = [Buffer.from('%PDF-1.4\n', 'latin1')];
  const offsets: number[] = [];
  let largo = partes[0].length;
  const agregar = (b: Buffer) => {
    partes.push(b);
    largo += b.length;
  };
  objetos.forEach((o, i) => {
    offsets.push(largo);
    agregar(Buffer.from(`${i + 1} 0 obj\n${o}\nendobj\n`, 'latin1'));
  });
  offsets.push(largo);
  agregar(Buffer.concat([Buffer.from(`5 0 obj\n<< /Length ${contenido.length} >>\nstream\n`, 'latin1'), contenido, Buffer.from('\nendstream\nendobj\n', 'latin1')]));
  const xref = largo;
  agregar(Buffer.from(`xref\n0 6\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`, 'latin1'));
  return Buffer.concat(partes);
}

async function borrar(prisma: PrismaClient, FOLIO_DEMO: string) {
  const p = await prisma.postulacion.findUnique({ where: { folio: FOLIO_DEMO } });
  if (p) await prisma.postulacion.delete({ where: { id: p.id } }); // entrevista, sínodo, acta y documentos se borran en cascada
  await prisma.aspirante.deleteMany({ where: { idTemporal: FOLIO_DEMO } });
  await prisma.eventoBitacora.deleteMany({ where: { entidad: 'Postulacion', entidadId: FOLIO_DEMO } });
  for (const carpeta of [`aspirantes/${FOLIO_DEMO}`, `actas/${FOLIO_DEMO}`]) rmSync(rutaAlmacen(carpeta), { recursive: true, force: true });
}

async function main() {
  const args = process.argv.slice(2);
  const n = Number(args.find((a) => /^\d+$/.test(a)) ?? 1);
  if (!(n >= 1 && n <= 99)) throw new Error('El número de aspirante de demostración va de 1 a 99');
  const FOLIO_DEMO = folioDemo(n);
  const ASPIRANTE = n === 1 ? ASPIRANTE_1 : { ...ASPIRANTE_1, apellidoMaterno: `Ficticio ${n}`, correo: `aspirante.demo${n}@sigap.local` };
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }) });
  // Siempre se parte de cero: así el aspirante demo queda "como nuevo" para repetir la demostración
  await borrar(prisma, FOLIO_DEMO);
  if (args.includes('borrar')) {
    console.log(`Aspirante de demostración ${FOLIO_DEMO} eliminado.`);
    return prisma.$disconnect();
  }

  const programa =
    (await prisma.programa.findFirst({ where: { codigo: 'MTC' } })) ??
    (await prisma.programa.create({ data: { nombre: 'Maestría en Tecnología de Cómputo', codigo: 'MTC' } }));
  const convocatoria = await prisma.convocatoria.findFirst({ where: CONVOCATORIA });
  if (!convocatoria) throw new Error('No existe la convocatoria A-27; corre primero la carga de datos (npm run cargar-datos).');

  const { procedencia, carrera, ...datos } = ASPIRANTE;
  const aspirante = await prisma.aspirante.create({ data: { idTemporal: FOLIO_DEMO, ...datos } });
  const postulacion = await prisma.postulacion.create({
    data: { folio: FOLIO_DEMO, aspiranteId: aspirante.id, convocatoriaId: convocatoria.id, programaId: programa.id, estado: 'VALIDADA', enviadaEn: new Date(), respuestasRegistro: { procedencia, carrera } },
  });
  const nombre = `${ASPIRANTE.nombres} ${ASPIRANTE.apellidoPaterno} ${ASPIRANTE.apellidoMaterno}`;
  for (const [clave, d] of Object.entries(DOCUMENTOS)) {
    const catalogo = await prisma.catalogoDocumento.upsert({ where: { clave }, create: { clave, ...d }, update: {} });
    const pdf = pdfDemo([
      'DOCUMENTO DE DEMOSTRACIÓN',
      'Datos ficticios para probar SIGAP. No es un documento real.',
      '',
      `Documento: ${d.nombre}`,
      `Aspirante: ${nombre}`,
      `Folio: ${FOLIO_DEMO}`,
      `Procedencia: ${procedencia}`,
    ]);
    const ruta = guardarArchivo(`aspirantes/${FOLIO_DEMO}/${clave}.pdf`, pdf);
    await prisma.documentoPostulacion.create({
      data: { postulacionId: postulacion.id, catalogoId: catalogo.id, nombreArchivo: `DEMO_${clave}.pdf`, urlArchivo: ruta, tipoMime: 'application/pdf', tamanoBytes: pdf.length, estado: 'APROBADO' },
    });
  }
  console.log(`Aspirante de demostración ${FOLIO_DEMO} (${nombre}) listo con ${Object.keys(DOCUMENTOS).length} documentos.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
