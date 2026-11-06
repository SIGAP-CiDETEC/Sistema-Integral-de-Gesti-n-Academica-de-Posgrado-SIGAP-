/**
 * Registra o corrige el correo y el teléfono de un aspirante (por ejemplo, si no venían en su registro).
 *
 *   npm run actualizar-contacto -- MTC-A2702 correo@ejemplo.com 5512345678
 *   npm run actualizar-contacto -- MTC-A2702 correo@ejemplo.com          (solo el correo)
 *   npm run actualizar-contacto -- MTC-A2702 - 5512345678                (solo el teléfono)
 *
 * Los ven Posgrado y los docentes de sus grupos del propedéutico (listas de inscritos).
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

async function main() {
  const [arg, correoArg, telArg] = process.argv.slice(2);
  if (!arg || (!correoArg && !telArg)) throw new Error('Uso: npm run actualizar-contacto -- MTC-A2702 correo@ejemplo.com 5512345678');
  const folio = arg.trim().toUpperCase().replace(/^MTC-([AB]\d{4})$/, 'MTC$1');
  const correo = correoArg && correoArg !== '-' ? correoArg.trim().toLowerCase() : undefined;
  const telefono = telArg && telArg !== '-' ? telArg.replace(/[\s()-]/g, '') : undefined;
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new Error(`"${correo}" no parece un correo válido`);
  if (telefono && !/^\+?\d{10,13}$/.test(telefono)) throw new Error(`"${telArg}" no parece un teléfono válido (10 dígitos)`);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }) });
  const p = await prisma.postulacion.findUnique({ where: { folio }, include: { aspirante: true } });
  if (!p) throw new Error(`No existe el aspirante ${arg}`);
  if (correo) {
    const otro = await prisma.aspirante.findFirst({ where: { correo, id: { not: p.aspiranteId } } });
    if (otro) throw new Error(`Ese correo ya lo tiene otro aspirante (${otro.idTemporal})`);
  }
  const nombre = [p.aspirante.nombres, p.aspirante.apellidoPaterno, p.aspirante.apellidoMaterno].filter(Boolean).join(' ');
  await prisma.$transaction([
    prisma.aspirante.update({ where: { id: p.aspiranteId }, data: { ...(correo ? { correo } : {}), ...(telefono ? { telefono } : {}) } }),
    prisma.eventoBitacora.create({
      data: { entidad: 'Postulacion', entidadId: folio, actor: 'Administración del sistema', accion: `Actualizó ${[correo && 'el correo', telefono && 'el teléfono'].filter(Boolean).join(' y ')} de ${nombre}` },
    }),
  ]);
  console.log(`${folio} · ${nombre}: se actualizó ${[correo && 'el correo', telefono && 'el teléfono'].filter(Boolean).join(' y ')}.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
