/**
 * Captura calificaciones del curso propedéutico a un aspirante FICTICIO (DEMO27xx), como si las hubiera capturado su
 * docente, para seguir el proceso en pruebas (Posgrado luego registra y publica el resultado en Evaluación).
 *
 *   npm run calificar-demo -- DEMO2703                              8.5 en Matemáticas y 9.0 en Programación
 *   npm run calificar-demo -- DEMO2703 matematicas=6.5 programacion=9   otras calificaciones (6.5 no acredita)
 *   npm run calificar-demo -- DEMO2703 programacion=8               solo cambia esa área (la otra se queda igual)
 *   npm run calificar-demo -- DEMO2703 programacion=borrar          quita esa calificación (queda por capturar)
 *
 * Solo funciona con folios DEMO: nunca toca a aspirantes reales. No cambia un resultado que Posgrado ya publicó.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const AREAS = ['matematicas', 'programacion'] as const;
type Ev = { modalidad?: string; grupos?: Record<string, string>; capturas?: Record<string, Record<string, unknown>>; propedeutico?: { publicadoEl?: string } };

async function main() {
  const args = process.argv.slice(2);
  const folio = (args.find((a) => !a.includes('=')) ?? '').toUpperCase().replace(/^MTC-?/, '');
  if (!/^DEMO\d{4}$/.test(folio)) throw new Error('Uso: npm run calificar-demo -- DEMO2703 [matematicas=8.5] [programacion=9]  (solo aspirantes DEMO)');
  // Sin áreas: las dos con calificaciones por omisión; con áreas: solo esas (número o "borrar")
  const pares = args.filter((x) => x.includes('='));
  const calif: Record<string, number | 'borrar'> = pares.length ? {} : { matematicas: 8.5, programacion: 9 };
  for (const a of pares) {
    const [k, v] = a.split('=');
    if (!AREAS.includes(k as (typeof AREAS)[number])) throw new Error(`Área desconocida "${k}". Usa: ${AREAS.join(', ')}`);
    if (v.toLowerCase() === 'borrar') {
      calif[k] = 'borrar';
      continue;
    }
    const n = Number(v);
    if (!(n >= 0 && n <= 10)) throw new Error(`La calificación de ${k} debe estar entre 0 y 10 (o "borrar")`);
    calif[k] = Math.round(n * 10) / 10;
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }) });
  const p = await prisma.postulacion.findUnique({ where: { folio } });
  if (!p) throw new Error(`No existe ${folio}`);
  const proc = { ...((p.estadoProceso ?? {}) as Record<string, unknown>) };
  const ev = { ...((proc.evaluacion ?? {}) as Ev) };
  if (ev.modalidad !== 'propedeutico') throw new Error(`${folio} no ha elegido cursos propedéuticos (entra con su cuenta y elígelos primero)`);
  if (ev.propedeutico?.publicadoEl) throw new Error(`Posgrado ya publicó el resultado del propedéutico de ${folio}; no se cambia`);
  const ahora = new Date().toISOString();
  const previas = { ...(ev.capturas?.propedeutico ?? {}) } as Record<string, unknown>;
  for (const [a, c] of Object.entries(calif)) {
    if (c === 'borrar') delete previas[a];
    else previas[a] = { calificacion: c, por: 'calificar-demo', el: ahora, primeraEl: ahora };
  }
  ev.capturas = { ...(ev.capturas ?? {}), propedeutico: previas };
  // Si ya había un resultado registrado (sin publicar), Posgrado lo vuelve a registrar con las nuevas
  delete ev.propedeutico;
  proc.evaluacion = ev;
  const NOMBRE: Record<string, string> = { matematicas: 'Matemáticas', programacion: 'Programación' };
  const texto = Object.entries(calif).map(([a, c]) => `${NOMBRE[a]} ${c === 'borrar' ? 'borrada (por capturar)' : c}`).join(', ');
  await prisma.$transaction([
    prisma.postulacion.update({ where: { id: p.id }, data: { estadoProceso: proc as object } }),
    prisma.eventoBitacora.create({
      data: { entidad: 'Postulacion', entidadId: folio, actor: 'Administración del sistema', accion: `Calificaciones de prueba del propedéutico: ${texto}` },
    }),
  ]);
  console.log(`${folio}: ${texto}`);
  console.log(AREAS.every((a) => previas[a]) ? 'Listo. En Posgrado → Evaluación aparece su resultado del propedéutico para registrarlo y publicarlo.' : 'Listo. Falta alguna calificación, así que su resultado del propedéutico aún no se puede registrar.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
