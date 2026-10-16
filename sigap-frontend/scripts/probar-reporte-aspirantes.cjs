const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, f);
const csv = require('../src/lib/csv.ts');
let reporte;
csv.descargarCsv = (nombre, encabezados, filas) => { reporte = { nombre, encabezados, filas }; };
const { promedioFinal, descargarReporteAspirantes, fechaHoraReporte } = require('../src/lib/reporte-aspirantes.ts');
const { ASPIRANTES_BASE } = require('../src/lib/posgrado/datos.ts');
const base = ASPIRANTES_BASE[0];
const capturas = (notas) => Object.fromEntries(['matematicas', 'programacion'].flatMap((id, i) => notas[i] === undefined ? [] : [[id, { calificacion: notas[i], por: 'prueba', el: '2026-10-16' }]]));
const aspirante = (modalidad, propedeutico = [], examen = []) => ({ ...base, evaluacion: { modalidad, grupos: {}, capturas: { propedeutico: capturas(propedeutico), examen: capturas(examen) } } });
for (const [nombre, a, esperado] of [
  ['Aprobó ambos propedéuticos; no sustituirlos por exámenes ajenos', aspirante('propedeutico', [9, 8], [2, 3]), 8.5],
  ['Solo exámenes', aspirante('examen', [9, 9], [8, 10]), 9],
  ['Conservar Matemáticas y sustituir Programación', aspirante('propedeutico', [9, 6], [undefined, 8]), 8.5],
  ['Conservar Programación y sustituir Matemáticas', aspirante('propedeutico', [6, 9], [8]), 8.5],
  ['Reprobó ambos propedéuticos: promedio de exámenes', aspirante('propedeutico', [5, 6], [8, 9]), 8.5],
  ['Reprobó también ambos exámenes: mostrar promedio reprobatorio', aspirante('propedeutico', [5, 6], [6, 7]), 6.5],
  ['Una segunda oportunidad reprobada', aspirante('propedeutico', [9, 5], [undefined, 6]), 7.5],
  ['Examen faltante', aspirante('propedeutico', [5, 6], [8]), undefined],
  ['Propedéutico incompleto', aspirante('propedeutico', [9]), undefined],
  ['Solo examen incompleto', aspirante('examen', [], [8]), undefined],
  ['Sin elección de modalidad', aspirante(undefined), undefined],
  ['Cero en ambos exámenes no debe sustituirse por notas anteriores', aspirante('propedeutico', [6, 6], [0, 0]), 0],
  ['Límite aprobatorio', aspirante('propedeutico', [8, 8]), 8],
  ['Redondeo a dos decimales', aspirante('propedeutico', [8.1, 8.2]), 8.15],
]) assert.equal(promedioFinal(a), esperado, nombre);
assert.deepEqual(fechaHoraReporte('2026-10-16'), { fecha: '2026-10-16', hora: '' });
assert.deepEqual(fechaHoraReporte('2026-10-16T01:30:00Z'), { fecha: '2026-10-15', hora: '19:30' });
assert.deepEqual(fechaHoraReporte('2026-10-16T09:15:00-06:00'), { fecha: '2026-10-16', hora: '09:15' });
assert.deepEqual(fechaHoraReporte('2026-10-16T09:15'), { fecha: '2026-10-16', hora: '09:15' });
const registro = { nombre: 'María Fernanda', apellidoMaterno: 'de la Cruz', apellidoPaterno: 'García López', ultimosEstudios: 'Ingeniería en Sistemas', areasInteres: ['Redes de Computadoras', 'Seguridad Informática', 'Mecatrónica'] };
descargarReporteAspirantes([{ ...base, registradoEl: '2026-10-16T01:30:00Z', turnadoUteycv: '2026-10-16T15:15:00Z', entrevista: { fecha: '2026-10-20', hora: '11:30', modalidad: 'Presencial', sala: 'Sala A', sinodo: [] } }], () => registro);
const valor = (encabezado) => { const indice = reporte.encabezados.indexOf(encabezado); assert(indice >= 0, encabezado); return reporte.filas[0][indice]; };
assert.equal(valor('Nombre(s)'), 'María Fernanda');
assert.equal(valor('Apellido materno'), 'de la Cruz');
assert.equal(valor('Apellido paterno'), 'García López');
assert.equal(valor('Carrera de procedencia'), registro.ultimosEstudios);
assert.equal(valor('Línea de investigación 1 (mayor interés)'), registro.areasInteres[0]);
assert.equal(valor('Línea de investigación 2'), registro.areasInteres[1]);
assert.equal(valor('Línea de investigación 3 (menor interés)'), registro.areasInteres[2]);
assert.equal(valor('3. Día de entrevista'), '2026-10-20');
assert.equal(valor('3. Hora de entrevista'), '11:30');
assert.equal(valor('Fecha de registro'), '2026-10-15');
assert.equal(valor('Hora de registro'), '19:30');
assert.equal(valor('6. Hora de publicación del resultado'), '09:15');
descargarReporteAspirantes(ASPIRANTES_BASE, () => registro);
assert.equal(new Set(reporte.encabezados).size, reporte.encabezados.length);
for (const fila of reporte.filas) assert.equal(fila.length, reporte.encabezados.length);
console.log(`OK: 14 casos de promedio, fechas y horas, nombres compuestos, carrera, orden de las tres líneas y ${reporte.encabezados.length} columnas alineadas.`);
