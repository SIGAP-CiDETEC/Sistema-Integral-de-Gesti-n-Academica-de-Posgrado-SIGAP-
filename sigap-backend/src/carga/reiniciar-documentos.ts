/**
 * Reinicia la revisión de los documentos del expediente de TODOS los aspirantes y quita la Cédula profesional.
 *
 *   npm run reiniciar-documentos                 solo muestra qué cambiaría (no toca nada)
 *   npm run reiniciar-documentos -- --confirmar  aplica los cambios
 *
 * 1. Los documentos aprobados (título, constancia de titulación, certificado, inglés, CURP, acta, identificación,
 *    documentos extranjeros) vuelven a quedar "Por revisar" para que Posgrado los valide de nuevo. Los archivos se
 *    conservan. Los que tienen observaciones o prórroga no cambian.
 * 2. La Cédula profesional deja de existir en SIGAP: se borran sus registros, su historial de revisión, sus archivos
 *    y su lugar en el catálogo de documentos.
 * Todo queda anotado en la bitácora de cada aspirante. No toca SIP-02 ni el cuestionario de la entrevista.
 */
import 'dotenv/config';
import { existsSync, rmSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { rutaAlmacen } from '../comun/almacen';

const REVISAR = ['titulo', 'constancia-titulacion', 'certificado', 'ingles', 'curp', 'acta', 'identificacion', 'extranjero'];
const ACTOR = 'Administración del sistema';

async function main() {
  const confirmar = process.argv.includes('--confirmar');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }) });

  // 1. Aprobados → por revisar
  const aprobados = await prisma.documentoPostulacion.findMany({
    where: { estado: 'APROBADO', catalogo: { clave: { in: REVISAR } } },
    include: { catalogo: true, postulacion: { select: { folio: true } } },
  });
  const porFolio = new Map<string, string[]>();
  for (const d of aprobados) porFolio.set(d.postulacion.folio, [...(porFolio.get(d.postulacion.folio) ?? []), d.catalogo.nombre]);
  console.log(`1. Documentos aprobados que vuelven a "Por revisar": ${aprobados.length} de ${porFolio.size} aspirante(s)`);
  for (const [folio, docs] of [...porFolio].sort()) console.log(`   ${folio}: ${docs.join(', ')}`);

  // 2. Cédula profesional
  const cedulas = await prisma.documentoPostulacion.findMany({ where: { catalogo: { clave: 'cedula' } }, include: { postulacion: { select: { folio: true } } } });
  const conArchivo = cedulas.filter((d) => d.urlArchivo);
  console.log(`\n2. Cédula profesional: ${cedulas.length} registro(s), ${conArchivo.length} con archivo, se borran por completo`);
  for (const d of cedulas) console.log(`   ${d.postulacion.folio}${d.urlArchivo ? ` · ${d.urlArchivo}` : ' · sin archivo'}`);

  if (!confirmar) {
    console.log('\nNo se cambió nada. Para aplicarlo, repite el comando con --confirmar');
    await prisma.$disconnect();
    return;
  }

  await prisma.$transaction(async (tx) => {
    if (aprobados.length) await tx.documentoPostulacion.updateMany({ where: { id: { in: aprobados.map((d) => d.id) } }, data: { estado: 'PENDIENTE', observacion: null, prorrogaHasta: null } });
    for (const [folio, docs] of porFolio)
      await tx.eventoBitacora.create({ data: { entidad: 'Postulacion', entidadId: folio, actor: ACTOR, accion: `Se reinició la revisión de: ${docs.join(', ')}. Quedan por revisar.` } });
    if (cedulas.length) await tx.documentoPostulacion.deleteMany({ where: { id: { in: cedulas.map((d) => d.id) } } });
    for (const folio of new Set(cedulas.map((d) => d.postulacion.folio)))
      await tx.eventoBitacora.create({ data: { entidad: 'Postulacion', entidadId: folio, actor: ACTOR, accion: 'Se quitó la Cédula profesional del expediente (ya no se solicita).' } });
    await tx.catalogoDocumento.deleteMany({ where: { clave: 'cedula' } });
  });
  // Los archivos se borran después de confirmar los cambios en la base
  let borrados = 0;
  for (const d of conArchivo) {
    const ruta = rutaAlmacen(d.urlArchivo!);
    if (existsSync(ruta)) {
      rmSync(ruta);
      borrados++;
    }
  }
  console.log(`\nListo: ${aprobados.length} documento(s) por revisar; ${cedulas.length} cédula(s) quitadas y ${borrados} archivo(s) borrados.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
