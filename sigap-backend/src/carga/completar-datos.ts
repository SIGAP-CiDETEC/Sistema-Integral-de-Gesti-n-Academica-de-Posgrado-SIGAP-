/**
 * Completa en SIGAP los datos de los aspirantes que estén vacíos, tomándolos de SIGAP_DATOS/datos.json:
 * correo, teléfono, procedencia, carrera y promedio. Nunca cambia un dato que ya tenga valor.
 *
 *   SIGAP_DATOS=/opt/sigap/datos-reales npm run completar-datos               solo muestra qué se completaría
 *   SIGAP_DATOS=/opt/sigap/datos-reales npm run completar-datos -- --confirmar
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

type AspiranteJson = { folio: string; correo?: string; telefono?: string; procedencia?: string; carrera?: string; promedio?: string };

async function main() {
  const dir = process.env.SIGAP_DATOS;
  if (!dir) throw new Error('Indica la carpeta: SIGAP_DATOS=/opt/sigap/datos-reales npm run completar-datos');
  const confirmar = process.argv.includes('--confirmar');
  const datos = JSON.parse(readFileSync(join(dir, 'datos.json'), 'utf8')) as { aspirantes: AspiranteJson[] };
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }) });
  const vacio = (s?: string | null) => !s || /@(sin-correo|pendiente)\.sigap\.local$/.test(s);
  let total = 0;
  for (const a of datos.aspirantes) {
    const p = await prisma.postulacion.findUnique({ where: { folio: a.folio }, include: { aspirante: true } });
    if (!p) continue;
    const reg = { ...((p.respuestasRegistro ?? {}) as Record<string, string>) };
    const cambios: string[] = [];
    const asp: { correo?: string; telefono?: string } = {};
    if (a.correo && vacio(p.aspirante.correo)) {
      const otro = await prisma.aspirante.findFirst({ where: { correo: a.correo.toLowerCase(), id: { not: p.aspiranteId } } });
      if (otro) console.log(`  ${a.folio}: el correo ya lo tiene ${otro.idTemporal}; no se completa`);
      else (asp.correo = a.correo.toLowerCase()), cambios.push('correo');
    }
    if (a.telefono && !p.aspirante.telefono) (asp.telefono = a.telefono), cambios.push('teléfono');
    for (const [k, etq] of [['procedencia', 'procedencia'], ['carrera', 'carrera'], ['promedio', 'promedio']] as const)
      if (a[k] && !reg[k]) (reg[k] = a[k]!), cambios.push(`${etq}: ${a[k]}`);
    if (!cambios.length) continue;
    total++;
    console.log(`${a.folio}: ${cambios.join(' · ')}`);
    if (!confirmar) continue;
    await prisma.$transaction([
      ...(Object.keys(asp).length ? [prisma.aspirante.update({ where: { id: p.aspiranteId }, data: asp })] : []),
      prisma.postulacion.update({ where: { id: p.id }, data: { respuestasRegistro: reg } }),
      prisma.eventoBitacora.create({
        data: { entidad: 'Postulacion', entidadId: a.folio, actor: 'Administración del sistema', accion: `Completó datos del registro que faltaban: ${cambios.map((c) => c.split(':')[0]).join(', ')}` },
      }),
    ]);
  }
  console.log(total ? (confirmar ? `\nSe completaron los datos de ${total} aspirante(s).` : `\n${total} aspirante(s) por completar. No se cambió nada; repite con --confirmar`) : 'No hay datos por completar.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
