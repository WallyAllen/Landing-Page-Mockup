import assert from 'node:assert/strict';
import test from 'node:test';
import { faltantes, validarCampo } from '../studio/requisitos.mjs';

// Con la configuración del cliente: tiposVivienda y tiposSinCubierta en inmobiliaria.config.mjs.
const rutas = (doc) => faltantes(doc).map((falta) => falta.path.join('.'));

test('Una vivienda avisa superficie total y cubierta, antigüedad, ambientes, dormitorios y baños; ninguno frena', () => {
  assert.deepEqual(rutas({ tipo: 'departamento' }), ['superficies.total_m2', 'superficies.cubierta_m2', 'antiguedad',
    'ambientes.ambientes', 'ambientes.dormitorios', 'ambientes.banos']);
  const [total] = faltantes({ tipo: 'departamento' });
  assert.deepEqual(total, { path: ['superficies', 'total_m2'], message: 'Conviene cargar la superficie total: los portales la muestran', level: 'warning' });
  // Solo el SRS (§6) bloquea: fotos, operación, tipo, ubicación, precio y estado, reglas del esquema.
  assert.ok(faltantes({ tipo: 'departamento' }).every((falta) => falta.level === 'warning' && /^Conviene/.test(falta.message)));
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

test('La validación de Sanity junta los avisos de cada campo; como error, no queda nada', () => {
  const context = { document: { tipo: 'departamento', superficies: { cubierta_m2: 90 } } };
  for (const campo of ['superficies', 'antiguedad', 'ambientes']) assert.equal(validarCampo(campo)(undefined, context), true, campo);
  assert.equal(validarCampo('superficies', 'warning')(undefined, context), 'Conviene cargar la superficie total: los portales la muestran');
  assert.equal(validarCampo('superficies', 'warning')(undefined, { document: { tipo: 'departamento', superficies: { total_m2: 90 } } }), 'Conviene cargar la superficie cubierta: los portales la muestran');
  assert.match(validarCampo('antiguedad', 'warning')(undefined, context), /^Conviene indicar la antigüedad/);
  assert.match(validarCampo('ambientes', 'warning')(undefined, context), /ambientes · .*dormitorios.* · .*baños/);
  assert.equal(validarCampo('superficies')(undefined, { document: { tipo: 'terreno', superficies: { total_m2: 500 } } }), true);
});
