const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const resolver = Module._resolveFilename;
Module._resolveFilename = function(id, ...args) { return resolver.call(this, id.startsWith('@/') ? path.join(__dirname, '../src', id.slice(2)) : id, ...args); };
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText, f);
let estado = { evaluacion: {} };
let eleccion = { modalidad: 'propedeutico' };
const mocks = {
  '/lib/posgrado/revision.ts': { useEstadoAdmision: () => estado, useSesionColegio: () => undefined },
  '/lib/aspirante-activo.ts': { useAspiranteActivo: () => 'MTC-A27001' },
  '/lib/contenido.ts': { useContenido: () => ({ calendarioDe: () => undefined }) },
  '/lib/convocatoria.ts': { useConvocatorias: () => ({ config: {} }), fechaResultados: () => '' },
  '/components/expediente/ExpedienteProvider.tsx': { useExpediente: () => ({ registro: {}, cargado: true, evaluacion: eleccion, guardarEvaluacion: () => {} }) },
  '/lib/evaluacion-config.ts': { useConfigEvaluacion: () => ({ modalidades: { propedeutico: { fechas: 'noviembre' } }, config: { examen: { fecha: '2026-12-15', hora: '10:00', lugar: 'CIDETEC' } } }), fechaLargaIso: (f) => f },
  '/components/expediente/Recordatorios.tsx': { RecordatoriosExamen: () => null },
};
const cargar = Module._load;
Module._load = function(id, parent, ...args) {
  const filename = Module._resolveFilename(id, parent).replaceAll('\\', '/');
  const key = Object.keys(mocks).find((k) => filename.endsWith(k));
  return key ? mocks[key] : cargar.call(this, id, parent, ...args);
};
const { PublicacionResultados } = require('../src/components/expediente/PublicacionResultados.tsx');
const { ResultadosAspirante } = require('../src/components/expediente/ResultadosAspirante.tsx');
const render = (c) => renderToStaticMarkup(React.createElement(c));
for (const [resolucion, texto] of [['Aceptado', 'Aceptado.'], ['Con reservas', 'Condicionado al cumplimiento documental para proceder a su inscripción.'], ['No aceptado', 'Invitado a participar en los siguientes procesos de Admisión.']]) {
  estado = { resolucion, evaluacion: {} };
  const html = render(PublicacionResultados);
  assert(html.includes(texto), resolucion);
  assert(html.includes('MTC-A27001'));
  assert.equal(html.includes('href="/aspirante/inscripcion"'), resolucion === 'Aceptado');
  if (resolucion === 'Con reservas') assert(html.includes('mailto:cgomeza@ipn.mx'));
}
estado = { evaluacion: {} };
assert(!render(PublicacionResultados).includes('<table'));
assert(!render(PublicacionResultados).includes('Tu resultado</h2>'));
estado.etapa = 'dictamen';
const pendiente = render(PublicacionResultados);
assert(!pendiente.includes('Tu resultado</h2>'));
assert(pendiente.includes('href="https://www.cidetec.ipn.mx/"'));
assert(pendiente.indexOf('Los resultados se publicarán') < pendiente.indexOf('Aquí, en SIGAP'));
const resultado = (nota) => ({ calificacion: nota, acreditado: nota >= 8, publicadoEl: '2026-12-16T12:00:00Z', areas: { programacion: { calificacion: nota, acreditado: nota >= 8 } } });
estado = { evaluacion: { propedeutico: resultado(6), examen: resultado(9) } };
eleccion = { modalidad: 'propedeutico', segundaOportunidad: { decision: 'examen', areas: ['programacion'] } };
let html = render(ResultadosAspirante);
assert.equal((html.match(/<section/g) || []).length, 1, 'Sin recuadro duplicado');
assert(html.includes('Resultado del examen de admisión'));
assert(!html.includes('Resultados del examen de áreas no acreditadas'));
delete estado.evaluacion.examen.publicadoEl;
assert(!render(ResultadosAspirante).includes('Resultado del examen de admisión</h3>'));
eleccion = { modalidad: 'examen' };
estado = { evaluacion: { examen: resultado(9) } };
assert(render(ResultadosAspirante).includes('Resultados del examen de admisión'));
console.log('OK: tres dictámenes, contactos, aviso CIDETEC, resultado oculto sin dictamen y exámenes directo y de segunda oportunidad.');
