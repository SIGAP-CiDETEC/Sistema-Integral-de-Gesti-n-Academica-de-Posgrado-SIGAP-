/**
 * Regresa la entrevista de un aspirante a "Horarios por publicar" (para pruebas o para corregir un error).
 *
 *   npm run reiniciar-entrevista -- MTCA2705
 *       Quita a los profesores entrevistadores, el acta MTC-EC y el dictamen; el horario queda sin publicar.
 *
 *   npm run reiniciar-entrevista -- DEMO2701 --conservar-profesores
 *       Igual, pero conserva a los profesores que ya la eligieron y el horario publicado a los profesores
 *       (solo deja de estar publicada al aspirante).
 *
 *   npm run reiniciar-entrevista -- DEMO2701 --conservar-profesores --reemplazar profesor1.prueba@sigap.local maldape@ipn.mx
 *       Además cambia a un profesor entrevistador por otro (por correo institucional).
 *
 * Siempre conserva el horario capturado (fecha, hora, duración, modalidad y sala), regresa la postulación a la
 * etapa de entrevista, borra lo que dependía del dictamen y deja constancia en la bitácora.
 * No borra documentos del expediente.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

async function main() {
  const args = process.argv.slice(2);
  const folio = args.find((a) => !a.startsWith('--'))?.trim().toUpperCase();
  if (!folio) throw new Error('Indica el folio: npm run reiniciar-entrevista -- MTCA2705');
  const conservar = args.includes('--conservar-profesores');
  const iR = args.indexOf('--reemplazar');
  const reemplazo = iR >= 0 ? { de: args[iR + 1]?.toLowerCase(), a: args[iR + 2]?.toLowerCase() } : null;
  if (reemplazo && (!reemplazo.de || !reemplazo.a)) throw new Error('Uso: --reemplazar <correo del que sale> <correo del que entra>');
  if (reemplazo && !conservar) throw new Error('--reemplazar solo tiene sentido con --conservar-profesores');

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }) });
  const p = await prisma.postulacion.findUnique({
    where: { folio },
    include: { aspirante: true, entrevista: { include: { acta: true, sinodo: { include: { profesor: true } } } }, resolucionColegio: true },
  });
  if (!p) throw new Error(`No existe el aspirante ${folio}`);
  if (!p.entrevista) throw new Error(`${folio} aún no tiene horario de entrevista: no hay nada que reiniciar`);
  const e = p.entrevista;
  const nombre = [p.aspirante.nombres, p.aspirante.apellidoPaterno, p.aspirante.apellidoMaterno].filter(Boolean).join(' ');

  // Validar el reemplazo antes de cambiar nada
  let cambio: { sale: (typeof e.sinodo)[number]; entra: { id: string; nombre: string } } | null = null;
  if (reemplazo) {
    const sale = e.sinodo.find((s) => s.profesor.correo.toLowerCase() === reemplazo.de);
    if (!sale) throw new Error(`${reemplazo.de} no es profesor entrevistador de ${folio}. Están: ${e.sinodo.map((s) => s.profesor.correo).join(', ') || 'nadie'}`);
    const entra = await prisma.profesor.findFirst({ where: { correo: { equals: reemplazo.a, mode: 'insensitive' } } });
    if (!entra) throw new Error(`No hay ningún profesor con el correo ${reemplazo.a}`);
    if (e.sinodo.some((s) => s.profesorId === entra.id)) throw new Error(`${entra.nombre} ya es profesor entrevistador de ${folio}`);
    cambio = { sale, entra };
  }

  await prisma.$transaction(async (tx) => {
    if (e.acta) await tx.actaEntrevista.delete({ where: { id: e.acta.id } });
    if (conservar) {
      await tx.integranteSinodo.updateMany({ where: { entrevistaId: e.id }, data: { firmadoEn: null } });
      if (cambio) await tx.integranteSinodo.update({ where: { id: cambio.sale.id }, data: { profesorId: cambio.entra.id, elegidoEn: new Date() } });
      await tx.entrevista.update({ where: { id: e.id }, data: { publicadaAspiranteEn: null } });
    } else {
      await tx.integranteSinodo.deleteMany({ where: { entrevistaId: e.id } });
      await tx.entrevista.update({ where: { id: e.id }, data: { horarioPublicadoEn: null, publicadaAspiranteEn: null } });
    }
    if (p.resolucionColegio) await tx.registroResolucionColegio.delete({ where: { id: p.resolucionColegio.id } });
    // Lo que se decidió después de la entrevista ya no aplica
    const proc = { ...((p.estadoProceso ?? {}) as Record<string, unknown>) };
    for (const k of ['etapa', 'concluido', 'evaluacion', 'resolucion', 'motivoReservas', 'turnadoUteycv', 'dedicacion', 'uteycv']) delete proc[k];
    await tx.postulacion.update({ where: { id: p.id }, data: { estado: 'ENTREVISTA_PROGRAMADA', estadoProceso: proc as object } });
    const extra = cambio ? `; ${cambio.entra.nombre} sustituye a ${cambio.sale.profesor.nombre} como profesor entrevistador` : '';
    await tx.eventoBitacora.create({
      data: { entidad: 'Postulacion', entidadId: folio, actor: 'Administración del sistema', accion: `Reinició la entrevista de ${nombre}: vuelve a "Horarios por publicar"${extra}` },
    });
  });

  const final = await prisma.integranteSinodo.findMany({ where: { entrevistaId: e.id }, include: { profesor: true } });
  console.log(`${folio} · ${nombre}`);
  console.log(`  Horario conservado: ${e.fechaHora.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })} · ${e.duracionMin} min · ${e.sala}`);
  if (e.acta) console.log('  Se quitaron el acta MTC-EC y el dictamen.');
  if (p.resolucionColegio) console.log('  Se quitó la resolución del Colegio.');
  if (cambio) console.log(`  ${cambio.entra.nombre} sustituye a ${cambio.sale.profesor.nombre}.`);
  console.log(`  Profesores entrevistadores: ${final.map((s) => s.profesor.nombre).join(', ') || 'ninguno (los profesores la elegirán al publicar el horario)'}`);
  console.log('  Ahora está en Entrevistas → "Horarios por publicar".');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
