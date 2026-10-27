/**
 * Carga (o actualiza) los profesores del Colegio y da de baja a los que ya no deben estar en el sistema.
 *
 *   SIGAP_DATOS=/opt/sigap/datos-reales npm run cargar-profesores
 *
 * Lee SIGAP_DATOS/profesores.json (NO se sube a GitHub: trae CURP de los profesores):
 *   { "profesores": [{ "nombre", "curp", "acceso", "tipo": "COLEGIADO" | "ASIGNATURA", "vigenteHasta": "AAAA-MM-DD" }],
 *     "bajas":      [{ "nombre", "curp" }] }
 * - Cada profesor entra con `acceso` (su CURP; si no tiene, su RFC). Las cuentas nuevas reciben una contraseña
 *   temporal que se escribe en SIGAP_DATOS/credenciales-profesores-<fecha>.csv (solo lectura para el dueño).
 * - A los que ya tienen cuenta no se les cambia la contraseña; solo se actualizan nombre, nombramiento y vigencia.
 * - Las bajas se eliminan; si ya participaron en alguna entrevista o acta, solo se desactiva su cuenta para
 *   conservar el historial.
 * Es idempotente: se puede volver a correr con el Excel actualizado.
 */
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { PrismaClient } from '../generated/prisma/client';

type ProfesorJson = { nombre: string; curp?: string; acceso: string; tipo: 'COLEGIADO' | 'ASIGNATURA'; vigenteHasta?: string | null };
type Datos = { profesores: ProfesorJson[]; bajas?: { nombre: string; curp: string }[] };

const ROL = 'Profesor del Colegio';
/** Los profesores sin correo institucional se guardan con un correo interno basado en su clave de acceso. */
const correoInterno = (acceso: string) => `${acceso.toLowerCase()}@pendiente.sigap.local`;

async function main() {
  const dir = process.env.SIGAP_DATOS;
  if (!dir || !existsSync(join(dir, 'profesores.json'))) throw new Error('Define SIGAP_DATOS con la carpeta que contiene profesores.json');
  const d = JSON.parse(readFileSync(join(dir, 'profesores.json'), 'utf8')) as Datos;
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }) });

  // 1. Bajas (p. ej. profesores visitantes)
  for (const b of d.bajas ?? []) {
    const curp = b.curp.trim().toUpperCase();
    const usuario = await prisma.usuario.findFirst({ where: { OR: [{ identificadorAcceso: curp }, { correo: correoInterno(curp) }] } });
    const profesor = await prisma.profesor.findFirst({
      where: { OR: [{ correo: correoInterno(curp) }, ...(usuario?.profesorId ? [{ id: usuario.profesorId }] : [])] },
      include: { _count: { select: { integracionesSinodo: true, firmasActa: true, calificaciones: true, grupos: true } } },
    });
    if (!usuario && !profesor) {
      console.log(`Baja ${b.nombre}: no estaba en el sistema`);
      continue;
    }
    const conHistorial = profesor && Object.values(profesor._count).some((n) => n > 0);
    if (conHistorial) {
      if (usuario) await prisma.usuario.update({ where: { id: usuario.id }, data: { activo: false } });
      console.log(`Baja ${b.nombre}: participó en entrevistas o actas; su cuenta queda desactivada (se conserva el historial)`);
    } else {
      if (usuario) await prisma.usuario.delete({ where: { id: usuario.id } });
      if (profesor) await prisma.profesor.delete({ where: { id: profesor.id } });
      console.log(`Baja ${b.nombre}: eliminado`);
    }
  }

  // 2. Altas y actualizaciones
  const rol = await prisma.rol.upsert({ where: { nombre: ROL }, create: { nombre: ROL, esBase: true }, update: {} });
  const credenciales: string[] = [];
  let nuevos = 0;
  let actualizados = 0;
  for (const p of d.profesores) {
    const acceso = p.acceso.trim().toUpperCase();
    if (!acceso) throw new Error(`${p.nombre}: falta CURP o RFC para iniciar sesión`);
    const correo = correoInterno(acceso);
    const datos = { nombre: p.nombre.trim(), tipoNombramiento: p.tipo, vigenteHasta: p.vigenteHasta ? new Date(`${p.vigenteHasta}T23:59:59-06:00`) : null };
    const existia = await prisma.profesor.findUnique({ where: { correo } });
    const prof = await prisma.profesor.upsert({ where: { correo }, create: { correo, ...datos }, update: datos });
    if (existia) actualizados++;
    else nuevos++;

    const cuenta = await prisma.usuario.findFirst({ where: { OR: [{ identificadorAcceso: acceso }, { correo }] } });
    if (cuenta) {
      await prisma.usuario.update({ where: { id: cuenta.id }, data: { nombre: datos.nombre, profesorId: prof.id, activo: true } });
      continue;
    }
    const temporal = randomBytes(9).toString('base64url');
    await prisma.usuario.create({
      data: { nombre: datos.nombre, correo, identificadorAcceso: acceso, hashContrasena: await hash(temporal, 12), debeCambiarContrasena: true, area: 'PROFESORES', profesorId: prof.id, roles: { create: { rolId: rol.id } } },
    });
    credenciales.push([datos.nombre, acceso, temporal].map((x) => `"${x}"`).join(','));
  }
  console.log(`\nProfesores: ${nuevos} nuevo(s), ${actualizados} actualizado(s).`);

  if (credenciales.length) {
    const archivo = join(dir, `credenciales-profesores-${new Date().toISOString().slice(0, 10)}.csv`);
    writeFileSync(archivo, ['"Nombre","Usuario (CURP o RFC)","Contraseña temporal"', ...credenciales].join('\n') + '\n', { flag: 'a', mode: 0o600 });
    chmodSync(archivo, 0o600);
    console.log(`${credenciales.length} cuenta(s) nueva(s). Contraseñas temporales en: ${archivo}`);
  } else console.log('No hubo cuentas nuevas.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
