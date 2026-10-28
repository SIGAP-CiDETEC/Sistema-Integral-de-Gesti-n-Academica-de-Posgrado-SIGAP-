/**
 * Regresa la entrevista de un aspirante a "Horarios por publicar" (para pruebas o para corregir un error).
 *
 *   npm run reiniciar-entrevista -- MTCA2705
 *
 * - Conserva el horario capturado (fecha, hora, duración, modalidad y sala).
 * - Quita a los profesores entrevistadores que la eligieron, el acta MTC-EC (llenada, descargada o firmada) y el
 *   dictamen, y deja el horario sin publicar a los profesores ni al aspirante.
 * - Regresa la postulación a la etapa de entrevista y borra lo que dependía del dictamen (evaluación, resolución…).
 * - Deja constancia en la bitácora. No borra documentos del expediente.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

async function main() {
  const folio = process.argv[2]?.trim().toUpperCase();
  if (!folio) throw new Error('Indica el folio: npm run reiniciar-entrevista -- MTCA2705');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }) });

  const p = await prisma.postulacion.findUnique({
    where: { folio },
    include: { aspirante: true, entrevista: { include: { acta: true, sinodo: true } }, resolucionColegio: true },
  });
  if (!p) throw new Error(`No existe el aspirante ${folio}`);
  if (!p.entrevista) throw new Error(`${folio} aún no tiene horario de entrevista: no hay nada que reiniciar`);
  const nombre = [p.aspirante.nombres, p.aspirante.apellidoPaterno, p.aspirante.apellidoMaterno].filter(Boolean).join(' ');

  await prisma.$transaction(async (tx) => {
    if (p.entrevista!.acta) await tx.actaEntrevista.delete({ where: { id: p.entrevista!.acta.id } });
    await tx.integranteSinodo.deleteMany({ where: { entrevistaId: p.entrevista!.id } });
    await tx.entrevista.update({ where: { id: p.entrevista!.id }, data: { horarioPublicadoEn: null, publicadaAspiranteEn: null } });
    if (p.resolucionColegio) await tx.registroResolucionColegio.delete({ where: { id: p.resolucionColegio.id } });
    // Lo que se decidió después de la entrevista ya no aplica
    const proc = { ...((p.estadoProceso ?? {}) as Record<string, unknown>) };
    for (const k of ['etapa', 'concluido', 'evaluacion', 'resolucion', 'motivoReservas', 'turnadoUteycv', 'dedicacion', 'uteycv']) delete proc[k];
    await tx.postulacion.update({ where: { id: p.id }, data: { estado: 'ENTREVISTA_PROGRAMADA', estadoProceso: proc as object } });
    await tx.eventoBitacora.create({
      data: { entidad: 'Postulacion', entidadId: folio, actor: 'Administración del sistema', accion: `Reinició la entrevista de ${nombre}: vuelve a "Horarios por publicar"` },
    });
  });

  const e = p.entrevista;
  console.log(`${folio} · ${nombre}`);
  console.log(`  Horario conservado: ${e.fechaHora.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })} · ${e.duracionMin} min · ${e.sala}`);
  console.log(`  Se quitaron: ${e.sinodo.length} profesor(es) entrevistador(es)${e.acta ? ', el acta MTC-EC y el dictamen' : ''}${p.resolucionColegio ? ', la resolución del Colegio' : ''}.`);
  console.log('  Ahora está en Entrevistas → "Horarios por publicar".');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
