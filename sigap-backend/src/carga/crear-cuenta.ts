/**
 * Crea una cuenta del personal (p. ej. la del Administrador) o le da una contraseña temporal nueva.
 *
 *   SIGAP_DATOS=/opt/sigap/datos-reales npm run crear-cuenta -- --correo nombre@ipn.mx --nombre "Nombre Apellido" --area ADMINISTRADOR --puesto "Administrador del sistema"
 *
 * Áreas: ADMINISTRADOR, POSGRADO, SUBDIRECCION, UTEYCV (los profesores se dan de alta con cargar-profesores).
 * La contraseña temporal NO se imprime: se agrega a SIGAP_DATOS/credenciales-cuentas-<fecha>.csv (solo lectura para
 * el dueño) y se debe cambiar al primer acceso. Si la cuenta ya existe, solo le da una temporal nueva y cierra sus sesiones.
 */
import 'dotenv/config';
import { chmodSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { PrismaClient, type AreaPersonal } from '../generated/prisma/client';
import { temporal as nuevaTemporal } from '../auth/usuarios.controller';

const AREAS = ['ADMINISTRADOR', 'POSGRADO', 'SUBDIRECCION', 'UTEYCV'];

async function main() {
  const args = process.argv.slice(2);
  const opcion = (n: string) => {
    const i = args.indexOf(`--${n}`);
    return i >= 0 ? args[i + 1]?.trim() : undefined;
  };
  const correo = opcion('correo')?.toLowerCase();
  const nombre = opcion('nombre');
  const area = (opcion('area') ?? 'ADMINISTRADOR').toUpperCase();
  const puesto = opcion('puesto') ?? (area === 'ADMINISTRADOR' ? 'Administrador del sistema' : area);
  const dir = process.env.SIGAP_DATOS;
  if (!dir || !existsSync(dir)) throw new Error('Define SIGAP_DATOS con la carpeta privada donde se guardará la contraseña temporal');
  if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new Error('Indica --correo con un correo válido');
  if (!AREAS.includes(area)) throw new Error(`--area debe ser una de: ${AREAS.join(', ')}`);

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }) });
  const temporal = nuevaTemporal();
  const h = await hash(temporal, 12);
  const existe = await prisma.usuario.findUnique({ where: { correo } });
  if (existe) {
    await prisma.usuario.update({ where: { id: existe.id }, data: { hashContrasena: h, debeCambiarContrasena: true, activo: true, sesionesDesde: new Date() } });
    console.log(`La cuenta ${correo} ya existía: se le dio una contraseña temporal nueva y se cerraron sus sesiones.`);
  } else {
    if (!nombre) throw new Error('Indica --nombre para la cuenta nueva');
    const rol = await prisma.rol.upsert({ where: { nombre: puesto }, create: { nombre: puesto, esBase: true }, update: {} });
    await prisma.usuario.create({ data: { nombre, correo, area: area as AreaPersonal, hashContrasena: h, debeCambiarContrasena: true, roles: { create: { rolId: rol.id } } } });
    console.log(`Cuenta creada: ${nombre} <${correo}> · ${puesto}`);
  }
  await prisma.eventoBitacora.create({ data: { entidad: 'Usuario', entidadId: correo, actor: 'Administración del sistema', accion: `${existe ? 'Dio una contraseña temporal nueva a' : 'Creó la cuenta de'} ${correo} desde el servidor` } });

  const archivo = join(dir, `credenciales-cuentas-${new Date().toISOString().slice(0, 10)}.csv`);
  const nuevo = !existsSync(archivo);
  writeFileSync(archivo, `${nuevo ? '"Usuario (correo)","Contraseña temporal"\n' : ''}"${correo}","${temporal}"\n`, { flag: 'a', mode: 0o600 });
  chmodSync(archivo, 0o600);
  console.log(`Contraseña temporal en: ${archivo} (cámbiala al primer acceso).`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
