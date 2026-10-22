/**
 * Carga inicial de datos reales (aspirantes con sus documentos, profesores y cuentas del personal).
 *
 *   SIGAP_DATOS=/ruta/a/datos-reales node dist/carga/cargar-datos.js
 *
 * La carpeta SIGAP_DATOS contiene datos.json y aspirantes/<folio>/<documento>.pdf. NO se sube a GitHub.
 * Es idempotente: se puede volver a correr; solo crea lo que falta y no cambia contraseñas existentes.
 * Las contraseñas temporales de las cuentas nuevas se escriben en SIGAP_DATOS/credenciales-<fecha>.csv
 * (solo lectura para el dueño) y cada persona debe cambiarla al entrar.
 */
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { AreaPersonal, PrismaClient } from '../generated/prisma/client';
import { RAIZ_ALMACEN } from '../comun/almacen';

type DocJson = { archivo: string; nombreOriginal: string };
type AspiranteJson = {
  folio: string; nombres: string; apellidoPaterno: string; apellidoMaterno: string; curp: string; correo: string; telefono: string;
  procedencia: string; carrera: string; documentos: Record<string, DocJson>;
};
type CuentaJson = { nombre: string; correo: string; area: AreaPersonal; rol: string; profesor?: boolean };
type ProfesorJson = { nombre: string; curp: string; correo: string; tipo: 'COLEGIADO' | 'ASIGNATURA'; vigenteHasta?: string; nombramiento?: string };
type Datos = { convocatoria: { clave: string; nombre: string }; aspirantes: AspiranteJson[]; profesores: ProfesorJson[]; personal: CuentaJson[]; equipo: CuentaJson[] };

const CATALOGO: Record<string, { nombre: string; obligatorio: boolean }> = {
  titulo: { nombre: 'Título de licenciatura', obligatorio: true },
  cedula: { nombre: 'Cédula profesional', obligatorio: false },
  certificado: { nombre: 'Certificado de estudios', obligatorio: true },
  ingles: { nombre: 'Constancia de dominio de inglés', obligatorio: true },
  curp: { nombre: 'CURP', obligatorio: false },
  acta: { nombre: 'Acta de nacimiento', obligatorio: true },
  identificacion: { nombre: 'Identificación oficial', obligatorio: true },
  'sip-02': { nombre: 'Currículum vitae (SIP-02)', obligatorio: true },
};

const contrasenaTemporal = () => randomBytes(9).toString('base64url');

async function main() {
  const dir = process.env.SIGAP_DATOS;
  if (!dir || !existsSync(join(dir, 'datos.json'))) throw new Error('Define SIGAP_DATOS con la carpeta que contiene datos.json');
  const d = JSON.parse(readFileSync(join(dir, 'datos.json'), 'utf8')) as Datos;
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }) });
  const credenciales: string[] = [];

  const programa =
    (await prisma.programa.findFirst({ where: { codigo: 'MTC' } })) ??
    (await prisma.programa.create({ data: { nombre: 'Maestría en Tecnología de Cómputo', codigo: 'MTC' } }));
  const convocatoria = await prisma.convocatoria.upsert({
    where: { clave_nombre: { clave: d.convocatoria.clave, nombre: d.convocatoria.nombre } },
    create: { ...d.convocatoria, fechaInicio: new Date('2026-08-01T00:00:00-06:00'), fechaFin: new Date('2026-12-31T23:59:59-06:00'), activa: true },
    update: {},
  });
  for (const [clave, c] of Object.entries(CATALOGO)) await prisma.catalogoDocumento.upsert({ where: { clave }, create: { clave, ...c }, update: c });
  const catalogo = new Map((await prisma.catalogoDocumento.findMany()).map((c) => [c.clave, c.id]));

  // Aspirantes y sus documentos
  for (const a of d.aspirantes) {
    const correo = a.correo || `${a.folio.toLowerCase()}@sin-correo.sigap.local`;
    const aspirante = await prisma.aspirante.upsert({
      where: { idTemporal: a.folio },
      create: { idTemporal: a.folio, nombres: a.nombres, apellidoPaterno: a.apellidoPaterno, apellidoMaterno: a.apellidoMaterno || null, curp: a.curp || null, correo, telefono: a.telefono || null },
      update: { nombres: a.nombres, apellidoPaterno: a.apellidoPaterno, apellidoMaterno: a.apellidoMaterno || null, curp: a.curp || null, correo, telefono: a.telefono || null },
    });
    const postulacion = await prisma.postulacion.upsert({
      where: { folio: a.folio },
      create: { folio: a.folio, aspiranteId: aspirante.id, convocatoriaId: convocatoria.id, programaId: programa.id, estado: 'VALIDADA', enviadaEn: new Date(), respuestasRegistro: { procedencia: a.procedencia, carrera: a.carrera } },
      update: { respuestasRegistro: { procedencia: a.procedencia, carrera: a.carrera } },
    });
    for (const [clave, doc] of Object.entries(a.documentos)) {
      const origen = join(dir, doc.archivo);
      if (!existsSync(origen)) throw new Error(`Falta el archivo ${origen}`);
      const destino = join(RAIZ_ALMACEN, doc.archivo);
      mkdirSync(dirname(destino), { recursive: true });
      copyFileSync(origen, destino);
      const datosDoc = { nombreArchivo: doc.nombreOriginal, urlArchivo: doc.archivo, tipoMime: 'application/pdf', tamanoBytes: statSync(origen).size, estado: 'APROBADO' as const };
      await prisma.documentoPostulacion.upsert({
        where: { postulacionId_catalogoId: { postulacionId: postulacion.id, catalogoId: catalogo.get(clave)! } },
        create: { postulacionId: postulacion.id, catalogoId: catalogo.get(clave)!, ...datosDoc },
        update: datosDoc,
      });
    }
    console.log(`Aspirante ${a.folio}: ${Object.keys(a.documentos).length} documentos`);
  }

  // Cuentas (personal, profesores y equipo)
  const crearCuenta = async (c: { nombre: string; correo: string; identificador?: string; area: AreaPersonal; rol: string; profesorId?: string }) => {
    const existe = await prisma.usuario.findUnique({ where: { correo: c.correo } });
    if (existe) return existe;
    const temporal = contrasenaTemporal();
    const rol = await prisma.rol.upsert({ where: { nombre: c.rol }, create: { nombre: c.rol, esBase: true }, update: {} });
    const u = await prisma.usuario.create({
      data: { nombre: c.nombre, correo: c.correo, identificadorAcceso: c.identificador, hashContrasena: await hash(temporal, 12), debeCambiarContrasena: true, area: c.area, profesorId: c.profesorId, roles: { create: { rolId: rol.id } } },
    });
    credenciales.push([c.nombre, c.identificador ?? c.correo, temporal, c.area].map((x) => `"${x}"`).join(','));
    return u;
  };

  for (const p of d.profesores) {
    const correo = p.correo || `${p.curp.toLowerCase()}@pendiente.sigap.local`;
    const prof = await prisma.profesor.upsert({
      where: { correo },
      create: { nombre: p.nombre, correo, tipoNombramiento: p.tipo, vigenteHasta: p.vigenteHasta ? new Date(`${p.vigenteHasta}T23:59:59-06:00`) : null, lineaInvestigacion: p.nombramiento },
      update: { nombre: p.nombre, tipoNombramiento: p.tipo, vigenteHasta: p.vigenteHasta ? new Date(`${p.vigenteHasta}T23:59:59-06:00`) : null },
    });
    // Sin correo institucional, entran con su CURP
    await crearCuenta({ nombre: p.nombre, correo, identificador: p.correo ? undefined : p.curp, area: 'PROFESORES', rol: 'Profesor del Colegio', profesorId: prof.id });
  }
  for (const c of [...d.personal, ...d.equipo]) {
    let profesorId: string | undefined;
    if (c.profesor) {
      const prof = await prisma.profesor.upsert({ where: { correo: c.correo }, create: { nombre: c.nombre, correo: c.correo, tipoNombramiento: 'ASIGNATURA', lineaInvestigacion: 'Cuenta de prueba' }, update: {} });
      profesorId = prof.id;
    }
    await crearCuenta({ nombre: c.nombre, correo: c.correo, area: c.area, rol: c.rol, profesorId });
  }

  if (credenciales.length) {
    const archivo = join(dir, `credenciales-${new Date().toISOString().slice(0, 10)}.csv`);
    writeFileSync(archivo, ['"Nombre","Usuario","Contraseña temporal","Área"', ...credenciales].join('\n') + '\n', { flag: 'a' });
    chmodSync(archivo, 0o600);
    console.log(`\n${credenciales.length} cuenta(s) nueva(s). Contraseñas temporales en: ${archivo}`);
  } else console.log('\nNo hubo cuentas nuevas.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
