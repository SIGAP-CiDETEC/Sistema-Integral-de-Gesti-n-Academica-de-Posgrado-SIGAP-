/**
 * Borra la elección de cursos propedéuticos o examen de un aspirante, para que vuelva a elegir en su portal
 * (pruebas, o un cambio que autorice Posgrado). Libera su lugar en los grupos. Conserva su cuenta y contraseña.
 *
 *   npm run borrar-eleccion -- DEMO2703
 *   npm run borrar-eleccion -- MTC-A2705
 *
 * Si ya tiene calificaciones del propedéutico o del examen, no la borra.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

async function main() {
  const arg = process.argv[2]?.trim().toUpperCase();
  if (!arg) throw new Error('Indica el aspirante: npm run borrar-eleccion -- DEMO2703');
  const folio = arg.replace(/^MTC-([AB]\d{4})$/, 'MTC$1');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }) });
  const p = await prisma.postulacion.findUnique({ where: { folio }, include: { aspirante: true } });
  if (!p) throw new Error(`No existe el aspirante ${arg}`);
  const nombre = [p.aspirante.nombres, p.aspirante.apellidoPaterno, p.aspirante.apellidoMaterno].filter(Boolean).join(' ');
  const proc = { ...((p.estadoProceso ?? {}) as Record<string, unknown>) };
  const ev = { ...((proc.evaluacion ?? {}) as Record<string, unknown>) };
  if (!ev.modalidad) {
    console.log(`${folio} · ${nombre}: no tiene elección registrada; no hay nada que borrar.`);
    return prisma.$disconnect();
  }
  if (ev.propedeutico || ev.examen || ev.segundaOportunidad) throw new Error(`${folio} ya tiene calificaciones registradas; no se borra su elección`);
  const antes = ev.modalidad === 'propedeutico' ? `cursos propedéuticos (${Object.entries((ev.grupos ?? {}) as Record<string, string>).map(([m, g]) => `${m} ${g}`).join(', ')})` : 'solo examen';
  for (const k of ['modalidad', 'grupos', 'confirmadaEl']) delete ev[k];
  proc.evaluacion = ev;
  await prisma.$transaction([
    prisma.postulacion.update({ where: { id: p.id }, data: { estadoProceso: proc as object } }),
    prisma.eventoBitacora.create({ data: { entidad: 'Postulacion', entidadId: folio, actor: 'Administración del sistema', accion: `Borró la elección de evaluación de ${nombre} (${antes}): puede volver a elegir en su portal` } }),
  ]);
  console.log(`${folio} · ${nombre}`);
  console.log(`  Se borró su elección: ${antes}.`);
  console.log('  Ya puede volver a elegir en su portal (su cuenta y contraseña no cambiaron).');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
