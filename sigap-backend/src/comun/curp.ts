/**
 * Validación de la CURP (Instructivo normativo para la asignación de la CURP, RENAPO).
 * Comprueba sin conexión que la CURP sea válida y que corresponda a la persona:
 * - Formato oficial, fecha de nacimiento que existe, entidad de nacimiento válida y dígito verificador.
 * - Que las letras coincidan con el nombre y los apellidos que escribió, y el sexo con su género.
 * Confirmar que esté dada de alta en el RENAPO requiere su servicio de consulta (convenio institucional).
 * El mismo archivo está en sigap-frontend/src/lib/curp.ts: si se cambia uno, cambiar el otro.
 */

const ENTIDADES = ['AS', 'BC', 'BS', 'CC', 'CL', 'CM', 'CS', 'CH', 'DF', 'DG', 'GT', 'GR', 'HG', 'JC', 'MC', 'MN', 'MS', 'NT', 'NL', 'OC', 'PL', 'QT', 'QR', 'SP', 'SL', 'SR', 'TC', 'TS', 'TL', 'VZ', 'YN', 'ZS', 'NE'];
const FORMATO = /^([A-Z][AEIOUX][A-Z]{2})(\d{2})(\d{2})(\d{2})([HMX])([A-Z]{2})([B-DF-HJ-NP-TV-Z]{3})([A-Z\d])(\d)$/;
const DICCIONARIO = '0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
/** Partículas que no se toman en cuenta en nombres y apellidos */
const PARTICULAS = new Set(['DA', 'DAS', 'DE', 'DEL', 'DER', 'DI', 'DIE', 'DD', 'EL', 'LA', 'LOS', 'LAS', 'LE', 'LES', 'MAC', 'MC', 'VAN', 'VON', 'Y']);
/** En nombres compuestos se usa el segundo nombre si el primero es María o José */
const NOMBRES_COMUNES = new Set(['MARIA', 'MA', 'MA.', 'M', 'M.', 'JOSE', 'J', 'J.']);

/** Dígito verificador de los primeros 17 caracteres. */
export function digitoCurp(c17: string) {
  let suma = 0;
  for (let i = 0; i < 17; i++) suma += DICCIONARIO.indexOf(c17[i]) * (18 - i);
  return String((10 - (suma % 10)) % 10);
}

/** Mayúsculas, sin acentos; la Ñ se considera X (como en la CURP). */
const normalizar = (s: string) =>
  s
    .toUpperCase()
    .replace(/Ñ/g, '\u0001')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\u0001/g, 'X')
    .replace(/[^A-Z .]/g, ' ')
    .trim();

const palabras = (s: string) => normalizar(s).split(/\s+/).filter((p) => p && !PARTICULAS.has(p));
const nombreUsado = (s: string) => {
  const p = palabras(s);
  return p.length > 1 && NOMBRES_COMUNES.has(p[0]) ? p[1] : (p[0] ?? '');
};
const sinPunto = (s: string) => s.replace(/\./g, '');
const primeraVocalInterna = (s: string) => /^.[^AEIOU]*([AEIOU])/.exec(s)?.[1] ?? 'X';
const primeraConsonanteInterna = (s: string) => /[B-DF-HJ-NP-TV-Z]/.exec(s.slice(1))?.[0] ?? 'X';

export type DatosCurp = { nombre?: string; apellidoPaterno?: string; apellidoMaterno?: string; genero?: string };

/** Devuelve el problema de la CURP o null si es válida (y coincide con los datos, si se dan). */
export function validarCurpCompleta(valor: string, d: DatosCurp = {}): string | null {
  const curp = valor.trim().toUpperCase();
  const m = FORMATO.exec(curp);
  if (!m) return 'La CURP debe tener 18 caracteres con el formato oficial.';
  const [, , aa, mm, dd, sexo, entidad, , dif, dv] = m;
  // El carácter 17 es dígito para nacidos antes de 2000 y letra desde 2000
  const anio = (/\d/.test(dif) ? 1900 : 2000) + Number(aa);
  const fecha = new Date(Date.UTC(anio, Number(mm) - 1, Number(dd)));
  if (fecha.getUTCFullYear() !== anio || fecha.getUTCMonth() !== Number(mm) - 1 || fecha.getUTCDate() !== Number(dd))
    return 'La fecha de nacimiento de la CURP no existe. Revisa que la hayas escrito bien.';
  if (!ENTIDADES.includes(entidad)) return 'La entidad de nacimiento de la CURP no es válida. Revisa que la hayas escrito bien.';
  if (digitoCurp(curp.slice(0, 17)) !== dv) return 'La CURP no es válida (el dígito verificador no coincide). Revisa que la hayas copiado bien.';

  // Coincidencia con el nombre: solo si ya escribió nombre y apellido paterno
  const pat = sinPunto(palabras(d.apellidoPaterno ?? '')[0] ?? '');
  const mat = sinPunto(palabras(d.apellidoMaterno ?? '')[0] ?? '');
  const nom = sinPunto(nombreUsado(d.nombre ?? ''));
  if (pat && nom) {
    const esperado = [pat[0], primeraVocalInterna(pat), mat ? mat[0] : 'X', nom[0]];
    const internas = [primeraConsonanteInterna(pat), mat ? primeraConsonanteInterna(mat) : 'X', primeraConsonanteInterna(nom)];
    // Si las 4 letras forman una palabra altisonante, la segunda se cambia por X
    const ok4 = curp[0] === esperado[0] && (curp[1] === esperado[1] || curp[1] === 'X') && curp[2] === esperado[2] && curp[3] === esperado[3];
    const ok3 = internas.every((c, i) => curp[13 + i] === c || curp[13 + i] === 'X');
    if (!ok4 || !ok3) return 'La CURP no coincide con el nombre y los apellidos que escribiste. Revisa ambos (deben ser como aparecen en tu acta de nacimiento).';
  }
  const g = (d.genero ?? '').toLowerCase();
  if ((g.startsWith('masc') && sexo === 'M') || (g.startsWith('fem') && sexo === 'H')) return 'El sexo de la CURP no coincide con el género que elegiste.';
  return null;
}
