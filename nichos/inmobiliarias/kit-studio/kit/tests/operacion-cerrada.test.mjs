import assert from 'node:assert/strict';
import test from 'node:test';
import { consultaOperacionesCerradas, epigrafe, fotoCartel, MAXIMO_EN_PORTADA } from '../studio/operacion-cerrada.mjs';

// Barrio ficticio: la lógica no depende de ningún cliente.
test('El epígrafe dice la operación y, si se cargó, el barrio y el año', () => {
  assert.equal(epigrafe({ operacion: 'vendida', barrio: 'Barrio Ejemplo' }), 'Vendida en Barrio Ejemplo');
  assert.equal(epigrafe({ operacion: 'alquilada' }), 'Alquilada');
  assert.equal(epigrafe({ operacion: 'alquilada', barrio: '  ' }), 'Alquilada');
  assert.equal(epigrafe({ operacion: 'vendida', anio: 2008 }), 'Vendida · 2008');
  assert.equal(epigrafe({ operacion: 'reservada' }), '');
  assert.equal(epigrafe(), '');
});

test('La foto se recorta alrededor del hotspot; sin hotspot, al centro', () => {
  const url = 'https://cdn.sanity.io/images/demo/production/abc-800x600.jpg';
  const conHotspot = new URL(fotoCartel(url, { x: 0.3, y: 0.7 }, 480, 360));
  assert.deepEqual(Object.fromEntries(conHotspot.searchParams), { w: '480', h: '360', fit: 'crop', auto: 'format', crop: 'focalpoint', 'fp-x': '0.3', 'fp-y': '0.7' });
  const sinHotspot = new URL(fotoCartel(url, undefined, 480, 360));
  assert.equal(sinHotspot.searchParams.get('crop'), null);
  assert.equal(sinHotspot.searchParams.get('fit'), 'crop');
});

test('La consulta trae sólo operaciones con foto, en orden, hasta el máximo de la portada', () => {
  assert.equal(MAXIMO_EN_PORTADA, 8);
  assert.match(consultaOperacionesCerradas, /_type == "operacionCerrada" && defined\(foto\.asset\)/);
  assert.match(consultaOperacionesCerradas, /order\(coalesce\(orden, 9999\) asc, _createdAt desc\)\[0\.\.\.8\]/);
  // Nunca pide precio ni dirección.
  assert.doesNotMatch(consultaOperacionesCerradas, /precio|direccion|calle/);
});
