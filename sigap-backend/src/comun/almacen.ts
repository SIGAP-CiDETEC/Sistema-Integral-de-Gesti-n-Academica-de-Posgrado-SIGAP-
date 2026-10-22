import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join, normalize, sep } from 'node:path';

/**
 * Archivos (PDF de aspirantes y actas firmadas) en el disco del servidor, fuera de la carpeta pública.
 * La base de datos guarda solo la ruta relativa; la API los entrega a quien tiene permiso.
 */
export const RAIZ_ALMACEN = process.env.STORAGE_DIR ?? join(process.cwd(), 'storage');

/** Ruta absoluta segura (impide salir de la carpeta del almacén con "..") */
export function rutaAlmacen(relativa: string): string {
  const abs = normalize(join(RAIZ_ALMACEN, relativa));
  if (!abs.startsWith(normalize(RAIZ_ALMACEN) + sep)) throw new Error('Ruta fuera del almacén');
  return abs;
}

export function guardarArchivo(relativa: string, datos: Buffer): string {
  const abs = rutaAlmacen(relativa);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, datos);
  return relativa;
}

export const existeArchivo = (relativa: string) => existsSync(rutaAlmacen(relativa));
