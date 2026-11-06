/**
 * Quita las calificaciones del curso propedéutico de un grupo (por ejemplo, las que se capturaron como prueba).
 * Los aspirantes del grupo vuelven a quedar "por capturar" en esa materia. No toca otras materias ni el examen.
 *
 *   npm run borrar-calificaciones -- matematicas A               solo muestra qué se quitaría
 *   npm run borrar-calificaciones -- matematicas A --confirmar   las quita
 *
 * La materia va por su clave: matematicas, programacion o seminario. No quita calificaciones de un resultado que
 * Posgrado ya publicó.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

type Ev = { modalidad?: string; grupos?: Record<string, string>; capturas?: Record<string, Record<string, { calificacion?: number }>>; propedeutico?: { publicadoEl?: string } };

async function main() {
  const [materia, grupo] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const confirmar = process.argv.includes('--confirmar');
  if (!materia || !grupo) throw new Error('Uso: npm run borrar-calificaciones -- matematicas A [--confirmar]');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }) });
  const cfg = (await prisma.almacen.findUnique({ where: { clave: 'evaluacion' } }))?.valor as { materias?: { id: string; nombre?: string; grupos: { id: string }[] }[] } | undefined;
  const m = cfg?.materias?.find((x) => x.id === materia.toLowerCase());
  if (!m) throw new Error(`No existe la materia "${materia}". Claves: ${(cfg?.materias ?? []).map((x) => x.id).join(', ')}`);
  const g = m.grupos.find((x) => x.id.toUpperCase() === grupo.toUpperCase());
  if (!g) throw new Error(`${m.nombre ?? m.id} no tiene grupo "${grupo}". Grupos: ${m.grupos.map((x) => x.id).join(', ')}`);
  const unico = m.grupos.length === 1;

  const todas = await prisma.postulacion.findMany({ include: { aspirante: true } });
  const afectadas = todas.filter((p) => {
    const ev = ((p.estadoProceso ?? {}) as { evaluacion?: Ev }).evaluacion;
    const suGrupo = ev?.grupos?.[m.id] ?? (unico ? g.id : undefined);
    return ev?.modalidad === 'propedeutico' && suGrupo === g.id && ev.capturas?.propedeutico?.[m.id];
  });
  console.log(`${m.nombre ?? m.id} · grupo ${g.id}: ${afectadas.length} aspirante(s) con calificación capturada`);
  let quitadas = 0;
  for (const p of afectadas) {
    const nombre = [p.aspirante.nombres, p.aspirante.apellidoPaterno, p.aspirante.apellidoMaterno].filter(Boolean).join(' ');
    const proc = { ...((p.estadoProceso ?? {}) as Record<string, unknown>) };
    const ev = { ...(proc.evaluacion as Ev) };
    const calif = ev.capturas!.propedeutico[m.id].calificacion;
    if (ev.propedeutico?.publicadoEl) {
      console.log(`  ${p.folio} · ${nombre}: ${calif} — NO se quita, Posgrado ya publicó su resultado`);
      continue;
    }
    console.log(`  ${p.folio} · ${nombre}: ${calif}${confirmar ? ' → quitada' : ''}`);
    if (!confirmar) continue;
    const delTipo = { ...ev.capturas!.propedeutico };
    delete delTipo[m.id];
    ev.capturas = { ...ev.capturas, propedeutico: delTipo };
    // El resultado integrado del propedéutico ya no aplica: falta esa materia
    delete ev.propedeutico;
    proc.evaluacion = ev;
    await prisma.$transaction([
      prisma.postulacion.update({ where: { id: p.id }, data: { estadoProceso: proc as object } }),
      prisma.eventoBitacora.create({
        data: { entidad: 'Postulacion', entidadId: p.folio, actor: 'Administración del sistema', accion: `Quitó la calificación de ${m.nombre ?? m.id} (grupo ${g.id}) de ${nombre} (era ${calif}); queda por capturar` },
      }),
    ]);
    quitadas++;
  }
  if (!confirmar && afectadas.length) console.log('\nNo se quitó nada. Para quitarlas, repite el comando con --confirmar');
  if (confirmar) console.log(`\nSe quitaron ${quitadas} calificación(es). Ya se pueden volver a capturar.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
