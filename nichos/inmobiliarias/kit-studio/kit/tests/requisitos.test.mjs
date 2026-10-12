import assert from 'node:assert/strict';
import test from 'node:test';
import { faltantes, validarCampo } from '../studio/requisitos.mjs';

// Con la configuración del cliente: tiposVivienda y tiposSinCubierta en inmobiliaria.config.mjs.
const rutas = (doc) => faltantes(doc).map((falta) => falta.path.join('.'));

test('Una vivienda pide superficie cubierta, antigüedad, ambientes, dormitorios y baños; la total es un aviso', () => {
  assert.deepEqual(rutas({ tipo: 'departamento' }), ['superficies.total_m2', 'superficies.cubierta_m2', 'antiguedad',
    'ambientes.ambientes', 'ambientes.dormitorios', 'ambientes.banos']);
  const [total, ...resto] = faltantes({ tipo: 'departamento' });
  assert.deepEqual(total, { path: ['superficies', 'total_m2'], message: 'Conviene cargar la superficie total: los portales la muestran', level: 'warning' });
  assert.ok(resto.every((falta) => falta.level === 'error'));
  const completo = { tipo: 'departamento', superficies: { total_m2: 327, cubierta_m2: 100 }, antiguedad: { anios: 50 },
    ambientes: { ambientes: 4, dormitorios: 3, banos: 3 } };
  assert.deepEqual(faltantes(completo), []);
  // Monoambiente: 0 dormitorios es un dato, no un faltante.
  assert.deepEqual(rutas({ ...completo, ambientes: { ambientes: 1, dormitorios: 0, banos: 1 } }), []);
});

test('La antigüedad se cumple con en construcción, a estrenar o años', () => {
  const base = { tipo: 'local-oficina', superficies: { total_m2: 50, cubierta_m2: 50 } };
  assert.deepEqual(rutas(base), ['antiguedad']);
  for (const antiguedad of [{ en_construccion: true }, { a_estrenar: true }, { anios: 0 }]) assert.deepEqual(rutas({ ...base, antiguedad }), []);
  assert.deepEqual(rutas({ ...base, antiguedad: { en_construccion: false, a_estrenar: false } }), ['antiguedad']);
});

test('Un terreno sólo avisa la superficie total (no frena); un local no pide ambientes', () => {
  assert.deepEqual(rutas({ tipo: 'terreno' }), ['superficies.total_m2']);
  assert.deepEqual(faltantes({ tipo: 'terreno' }).filter((falta) => falta.level === 'error'), []);
  assert.ok(!rutas({ tipo: 'local-oficina' }).some((ruta) => ruta.startsWith('ambientes')));
});

test('La validación de Sanity junta los faltantes de cada campo, por nivel', () => {
  const context = { document: { tipo: 'departamento', superficies: { cubierta_m2: 90 } } };
  // Sin superficie total: no hay error (se puede publicar), pero sí un aviso.
  assert.equal(validarCampo('superficies')(undefined, context), true);
  assert.equal(validarCampo('superficies', 'warning')(undefined, context), 'Conviene cargar la superficie total: los portales la muestran');
  assert.equal(validarCampo('superficies')(undefined, { document: { tipo: 'departamento', superficies: { total_m2: 90 } } }), 'Ingresá la superficie cubierta');
  assert.match(validarCampo('ambientes')(undefined, context), /ambientes · .*dormitorios.* · .*baños/);
  assert.equal(validarCampo('superficies')(undefined, { document: { tipo: 'terreno', superficies: { total_m2: 500 } } }), true);
});
