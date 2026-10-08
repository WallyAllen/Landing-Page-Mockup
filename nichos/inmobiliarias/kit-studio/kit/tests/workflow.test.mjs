import assert from 'node:assert/strict';
import test from 'node:test';
import { confirmSaved, documentContent, errorsForStage, miembroEnEtapa, resumenRevision, sameContent, slugDePropiedad, slugPendiente, stageForField, stages } from '../studio/property-workflow.mjs';
import config from '../../../inmobiliaria.config.mjs';

const location = { calle_y_numero: 'Dirección de prueba', ciudad: 'Partido de prueba', localidad: 'Barrio de prueba', provincia: 'Buenos Aires', zona: 'Zona Norte' };

test('Continuar exige sólo los datos de la etapa, sin exigir fotos ni precio al inicio', () => {
  const value = { operacion: 'venta', tipo: 'departamento', ubicacion: location };
  const markers = [{ level: 'error', path: ['fotos'], message: 'Faltan fotos' }, { level: 'error', path: [], message: 'Ingresá un precio' }];
  assert.deepEqual(errorsForStage(0, value, markers), []);
  assert.equal(errorsForStage(0, {}).length, 7);
  assert.equal(errorsForStage(0, { ...value, ubicacion: { ...location, calle_y_numero: '  ' } }).length, 1);
  const completo = { ...value, superficies: { total_m2: 80, cubierta_m2: 70 }, antiguedad: { anios: 10 }, ambientes: { ambientes: 3, dormitorios: 2, banos: 1 } };
  assert.equal(errorsForStage(1, completo, [{ level: 'error', path: ['ambientes', 'banos'], message: 'Debe ser positivo' }]).length, 1);
  assert.equal(errorsForStage(1, completo, [{ level: 'warning', path: ['ambientes'], message: 'Revisar' }]).length, 0);
});

test('Los campos nuevos siguen accesibles en revisión y cada campo actual pertenece a una etapa', () => {
  const fields = stages.flatMap((stage) => stage.fields);
  assert.equal(fields.length, new Set(fields).size);
  assert.equal(stageForField('campo_futuro'), 2);
});

test('La comparación conserva identidad de imágenes, booleanos y campos antiguos desconocidos', () => {
  const local = { _id: 'drafts.prueba', _rev: 'local', _type: 'propiedad', operacion: 'venta', privado_legacy: { codigo: 'heredado' }, fotos: [{ _key: 'foto-1', asset: { _ref: 'image-prueba' } }], casillas: { patio: false } };
  const remote = { ...local, _rev: 'remota', _updatedAt: 'otra', _id: 'prueba' };
  assert.ok(sameContent(local, remote));
  assert.ok(!sameContent(local, { ...remote, privado_legacy: undefined }));
  assert.ok(!sameContent(local, { ...remote, fotos: [{ ...local.fotos[0], _key: 'otra' }] }));
  assert.deepEqual(documentContent(local).privado_legacy, { codigo: 'heredado' });
});

test('Guardar un borrador incompleto espera datos y revisión remotos, sin exigir validación de publicación', async () => {
  const expected = { _type: 'propiedad', operacion: 'alquiler', campo_antiguo: 'conservar' };
  let reads = 0;
  const remote = await confirmSaved({ expected, id: 'drafts.prueba', intervalMs: 1, timeoutMs: 100,
    isSyncing: () => false, read: async () => ++reads === 1 ? null : { ...expected, _id: 'drafts.prueba', _rev: 'confirmada' } });
  assert.equal(remote._rev, 'confirmada');
  assert.equal(reads, 2);
});

test('Ni una lectura vieja ni la versión publicada confirman un borrador pendiente', async () => {
  const expected = { _type: 'propiedad', operacion: 'venta' };
  for (const remote of [
    { ...expected, _id: 'publicada', _rev: 'vieja' },
    { ...expected, _id: 'drafts.prueba' },
    { ...expected, operacion: 'alquiler', _id: 'drafts.prueba', _rev: 'vieja' },
  ]) await assert.rejects(confirmSaved({ expected, id: 'drafts.prueba', timeoutMs: 8, intervalMs: 1, isSyncing: () => false, read: async () => remote }), /No pudimos confirmar/);
});

test('Los cambios pendientes y los errores de red impiden confirmar éxito', async () => {
  const expected = { _type: 'propiedad' };
  await assert.rejects(confirmSaved({ expected, id: 'drafts.prueba', timeoutMs: 8, intervalMs: 1, isSyncing: () => true,
    read: async () => ({ ...expected, _id: 'drafts.prueba', _rev: 'remota' }) }), /No pudimos confirmar/);
  await assert.rejects(confirmSaved({ expected, id: 'drafts.prueba', isSyncing: () => false,
    read: async () => { throw new Error('Error de red'); } }), /Error de red/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(confirmSaved({ expected, id: 'drafts.prueba', signal: controller.signal, isSyncing: () => false,
    read: async () => assert.fail('No debe consultar después de abortar') }), { name: 'AbortError' });
});

test('Continuar en Características pide lo que exigen los portales, con la ruta de cada campo', () => {
  const value = { operacion: 'venta', tipo: 'departamento', ubicacion: location };
  const rutas = errorsForStage(1, value).map((error) => error.path.join('.'));
  assert.deepEqual(rutas, ['superficies.total_m2', 'superficies.cubierta_m2', 'antiguedad', 'ambientes.ambientes', 'ambientes.dormitorios', 'ambientes.banos']);
  // El aviso de Sanity del campo entero se reemplaza por los detallados; uno anidado se conserva.
  const markers = [{ level: 'error', path: ['superficies'], message: 'Ingresá la superficie total · Ingresá la superficie cubierta' }];
  assert.equal(errorsForStage(1, value, markers).filter((error) => error.path.length === 1 && error.path[0] === 'superficies').length, 0);
});

test('Un grupo de campos (fieldset) aparece sólo en la etapa de sus campos', () => {
  const grupo = (...nombres) => ({ kind: 'fieldSet', fieldSet: { members: nombres.map((name) => ({ kind: 'field', name })) } });
  const precio = stageForField('precio');
  assert.ok(miembroEnEtapa(grupo('precio', 'moneda'), precio));
  assert.ok(!miembroEnEtapa(grupo('precio', 'moneda'), 0));
  assert.ok(miembroEnEtapa({ kind: 'field', name: 'operacion' }, 0));
  assert.ok(!miembroEnEtapa({ kind: 'field', name: 'operacion' }, precio));
  assert.ok(miembroEnEtapa({ kind: 'error' }, 0)); // los avisos de Sanity se ven siempre
});

test('El slug sale de calle y número + barrio, sin tildes, y nunca pisa uno existente', () => {
  assert.equal(slugDePropiedad({ calle_y_numero: 'Av. Fondo de la Legua 2400, 8.º B', localidad: 'Martínez' }), 'av-fondo-de-la-legua-2400-8-b-martinez');
  assert.ok(slugDePropiedad({ calle_y_numero: 'Calle '.repeat(30), localidad: 'X' }).length <= 96);
  const doc = { ubicacion: { calle_y_numero: 'Calle Ficticia 123', localidad: 'Barrio Ñandú' } };
  assert.equal(slugPendiente(doc), 'calle-ficticia-123-barrio-nandu');
  assert.equal(slugPendiente({ ...doc, slug: { current: 'el-de-siempre' } }), '');
  assert.equal(slugPendiente({ ubicacion: { calle_y_numero: 'Calle Ficticia 123', localidad: ' ' } }), '');
});

test('El resumen de revisión muestra lo cargado con títulos legibles y lleva a cada campo', () => {
  const [operacion, titulo] = config.operaciones[0];
  const resumen = resumenRevision({ operacion, ubicacion: { calle_y_numero: 'Calle Ficticia 123', localidad: 'Barrio', ciudad: 'Partido' },
    precio: 150000, moneda: 'USD', superficies: { total_m2: 327, cubierta_m2: 100 }, ambientes: { ambientes: 4 }, fotos: [{}, {}] });
  const por = Object.fromEntries(resumen.map((item) => [item.etiqueta, item]));
  assert.deepEqual(Object.keys(por), ['Operación', 'Tipo', 'Dirección', 'Precio', 'Superficie', 'Ambientes', 'Fotos']);
  assert.equal(por['Operación'].valor, titulo);
  assert.equal(por.Tipo.valor, ''); // falta: la revisión lo marca
  assert.equal(por['Dirección'].valor, 'Calle Ficticia 123, Barrio, Partido');
  assert.equal(por.Precio.valor, 'USD 150.000');
  assert.equal(por.Superficie.valor, '327 m² totales · 100 m² cubiertos');
  assert.equal(por.Fotos.valor, '2 fotos');
  assert.deepEqual(por.Superficie.path, ['superficies', 'total_m2']);
  const consultar = resumenRevision({ precio: 150000, precio_consultar: true }).find((item) => item.etiqueta === 'Precio');
  assert.deepEqual([consultar.valor, consultar.path], ['Consultar precio', ['precio_consultar']]);
});
