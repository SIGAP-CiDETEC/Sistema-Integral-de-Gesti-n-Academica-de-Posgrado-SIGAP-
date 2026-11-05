/**
 * Da acceso a SIGAP a los aspirantes (todos los que aún no tienen cuenta, o los folios indicados).
 *
 *   SIGAP_DATOS=/opt/sigap/datos-reales npm run accesos-aspirantes                 todos los que no tienen cuenta
 *   SIGAP_DATOS=/opt/sigap/datos-reales npm run accesos-aspirantes -- MTCA2701     solo esos (si ya tienen cuenta: temporal nueva)
 *
 * Cada aspirante entra con su ID TEMPORAL (MTC-A2701) y una contraseña temporal que debe cambiar al primer acceso.
 * Las temporales NO se imprimen: se agregan a SIGAP_DATOS/credenciales-aspirantes-<fecha>.csv (solo lectura para el
 * dueño), para que el Departamento de Posgrado se las envíe a cada aspirante. Los de demostración (DEMO…) se omiten
 * salvo que se pidan por folio. Una temporal nueva para un aspirante también se puede generar desde
 * Posgrado → Cuentas (Restablecer contraseña).
 */
import 'dotenv/config';
import { chmodSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { PrismaClient } from '../generated/prisma/client';
import { temporal } from '../auth/usuarios.controller';
import { idTemporal } from '../admision/id-temporal';

async function main() {
  const dir = process.env.SIGAP_DATOS;
  if (!dir || !existsSync(dir)) throw new Error('Define SIGAP_DATOS con la carpeta privada donde se guardarán las contraseñas temporales');
  const pedidos = process.argv.slice(2).map((x) => x.trim().toUpperCase().replace(/^MTC-([AB])(\d{4})$/, 'MTC$1$2')).filter(Boolean);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }) });
  const ps = await prisma.postulacion.findMany({
    where: pedidos.length ? { folio: { in: pedidos } } : { folio: { not: { startsWith: 'DEMO' } } },
    include: { aspirante: true },
    orderBy: { folio: 'asc' },
  });
  const faltan = pedidos.filter((f) => !ps.some((p) => p.folio === f));
  if (faltan.length) console.log(`No existen: ${faltan.join(', ')}`);
  const filas: string[] = [];
  let ya = 0;
  for (const p of ps) {
    const a = p.aspirante;
    const nombre = [a.nombres, a.apellidoPaterno, a.apellidoMaterno].filter(Boolean).join(' ');
    const acceso = idTemporal(p.folio);
    const existe = await prisma.usuario.findFirst({ where: { OR: [{ aspiranteId: a.id }, { identificadorAcceso: acceso }] } });
    if (existe && !pedidos.length) {
      ya++;
      continue; // ya tiene acceso: no se le cambia la contraseña
    }
    const t = temporal();
    const h = await hash(t, 12);
    if (existe) {
      await prisma.usuario.update({ where: { id: existe.id }, data: { hashContrasena: h, debeCambiarContrasena: true, activo: true, sesionesDesde: new Date(), identificadorAcceso: acceso, aspiranteId: a.id } });
    } else {
      // El correo de la cuenta debe ser único; si falta o ya lo usa otra cuenta, se usa uno interno (entra con su ID temporal)
      const correoReal = a.correo && !/sigap\.local$/.test(a.correo) ? a.correo.toLowerCase() : '';
      const libre = correoReal && !(await prisma.usuario.findUnique({ where: { correo: correoReal } }));
      await prisma.usuario.create({
        data: { nombre, correo: libre ? correoReal : `${p.folio.toLowerCase()}@aspirante.sigap.local`, identificadorAcceso: acceso, hashContrasena: h, debeCambiarContrasena: true, area: 'ASPIRANTES', aspiranteId: a.id },
      });
    }
    await prisma.eventoBitacora.create({ data: { entidad: 'Postulacion', entidadId: p.folio, actor: 'Administración del sistema', accion: existe ? 'Generó una contraseña temporal nueva para el aspirante' : 'Dio acceso a SIGAP al aspirante' } });
    filas.push([acceso, nombre, /sigap\.local$/.test(a.correo) ? '' : a.correo, t].map((x) => `"${x}"`).join(','));
    console.log(`${acceso} · ${nombre}: ${existe ? 'contraseña temporal nueva' : 'acceso creado'}`);
  }
  if (filas.length) {
    const archivo = join(dir, `credenciales-aspirantes-${new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Mexico_City' })}.csv`);
    const nuevo = !existsSync(archivo);
    // BOM para que Excel abra bien los acentos
    writeFileSync(archivo, `${nuevo ? '﻿"Usuario (ID temporal)","Nombre","Correo","Contraseña temporal"\n' : ''}${filas.join('\n')}\n`, { flag: 'a', mode: 0o600 });
    chmodSync(archivo, 0o600);
    console.log(`\n${filas.length} acceso(s). Contraseñas temporales en: ${archivo}`);
  }
  if (ya) console.log(`${ya} aspirante(s) ya tenían acceso y no se les cambió nada (para darles una temporal nueva, indica su ID).`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
