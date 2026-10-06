import assert from 'node:assert/strict';
import test from 'node:test';
import { ciudadDireccion, detalleDireccion, direccionConTildes, regionDireccion } from '../direccion/detalle.mjs';
import { sugerenciasDireccion } from '../direccion/georef.mjs';
import { ZONAS_PRUEBA } from './zonas-de-prueba.mjs';

test('La zona sale de los partidos configurados; el resto queda manual', () => {
  for (const partido of ['San Isidro', 'Vicente López', 'VICENTE LOPEZ', 'San Fernando', 'Tigre', 'Partido de Tigre']) {
    assert.equal(regionDireccion(partido, 'Provincia de Buenos Aires', ZONAS_PRUEBA), 'Zona Norte', partido);
  }
  for (const partido of ['La Matanza', 'Escobar', 'Pilar', 'General San Martín', 'San Miguel', '']) {
    assert.equal(regionDireccion(partido, 'Provincia de Buenos Aires', ZONAS_PRUEBA), '', partido);
  }
});

test('Capital se reconoce con «CABA» y con «Ciudad Autónoma de Buenos Aires» y va a la zona marcada `capital`', () => {
  for (const ciudad of ['CABA', 'Ciudad Autónoma de Buenos Aires', 'Capital Federal']) {
    assert.equal(regionDireccion(ciudad, 'Capital Federal', ZONAS_PRUEBA), 'Ciudad', ciudad);
    assert.equal(regionDireccion(ciudad, '', ZONAS_PRUEBA), 'Ciudad', ciudad);
    assert.equal(ciudadDireccion(ciudad), 'CABA', ciudad);
  }
  assert.equal(ciudadDireccion('San Isidro'), 'San Isidro');
  const [opcion] = sugerenciasDireccion({ direcciones: [{ nomenclatura: 'PARANA 1200, Comuna 2, Ciudad Autónoma de Buenos Aires',
    provincia: { id: '02' }, calle: { nombre: 'PARANA' }, altura: { valor: 1200 }, departamento: { nombre: 'Comuna 2' } }] }, ZONAS_PRUEBA);
  assert.equal(opcion.ciudad, 'CABA');
  assert.equal(opcion.region, 'Ciudad');
  // Sin zona `capital` configurada, queda manual.
  assert.equal(regionDireccion('CABA', 'Capital Federal', [{ nombre: 'Zona Norte', partidos: ['Tigre'] }]), '');
});

test('Tildes de OSM sólo cuando es la misma calle sin tildes ni mayúsculas (nombres reales de Photon)', () => {
  assert.equal(direccionConTildes('Parana 2335', ['', 'Paraná']), 'Paraná 2335');
  assert.equal(direccionConTildes('Maipu 1200', ['Maipú', '']), 'Maipú 1200');
  assert.equal(direccionConTildes('Victor Martinez 300', ['Víctor Martínez']), 'Víctor Martínez 300');
  assert.equal(direccionConTildes('Martinez 300', ['MARTÍNEZ']), 'Martínez 300');
  assert.equal(direccionConTildes('Guemes 500', ['Güemes']), 'Güemes 500');
  assert.equal(direccionConTildes('Lisandro de la Torre 300', ['Lisandro De La Torre']), null); // sin tildes nuevas: queda la caja propia
  // Otra calle u otro nombre: queda el de Georef normalizado.
  assert.equal(direccionConTildes('Guemes 500', ['General Güemes']), null);
  assert.equal(direccionConTildes('Parana 2335', ['Pasaje Newton']), null);
  assert.equal(direccionConTildes('Gral. Paz 1200', ['General Paz']), null);
  assert.equal(direccionConTildes('Maipu 1200', ['Arenales']), null);
  assert.equal(direccionConTildes('Maipu 1200', [undefined, null]), null);
});

test('El detalle de Photon devuelve la calle acentuada junto a la localidad', () => {
  const opcion = { zona: 'Provincia de Buenos Aires', ciudad: 'San Fernando', direccion: 'Parana 2335', lat: -34.45, lon: -58.56 };
  const calle = { features: [{ geometry: { coordinates: [-58.56, -34.45] }, properties: { countrycode: 'AR', county: 'Partido de San Fernando', city: 'Virreyes', type: 'street', name: 'Paraná' } }] };
  assert.deepEqual(detalleDireccion(calle, opcion), { barrio: 'Virreyes', direccion: 'Paraná 2335' });
  const casa = structuredClone(calle); Object.assign(casa.features[0].properties, { type: 'house', name: 'Kiosco', street: 'Paraná', housenumber: '2315' });
  assert.equal(detalleDireccion(casa, opcion).direccion, 'Paraná 2335');
  const otraCalle = structuredClone(calle); otraCalle.features[0].properties.name = 'Pasaje Newton';
  assert.equal('direccion' in detalleDireccion(otraCalle, opcion), false);
  const otroPartido = structuredClone(calle); otroPartido.features[0].properties.county = 'Partido de Tigre';
  assert.deepEqual(detalleDireccion(otroPartido, opcion), {});
});

test('En Capital, Photon trae `state` y no `city`: igual completa el barrio (respuesta real de Av. Cabildo 2000)', () => {
  const opcion = { zona: 'Capital Federal', ciudad: 'CABA', direccion: 'Av. Cabildo 2000', lat: -34.5629890743624, lon: -58.455872345197 };
  const respuesta = { features: [{ geometry: { coordinates: [-58.455887, -34.5629868] }, properties: { countrycode: 'AR', type: 'street', name: 'Echeverría',
    district: 'Belgrano', county: 'Comuna 13', state: 'Ciudad Autónoma de Buenos Aires', postcode: 'C1428AAC' } }] };
  assert.deepEqual(detalleDireccion(respuesta, opcion), { barrio: 'Belgrano', codigo_postal: 'C1428AAC' });
  const otraProvincia = structuredClone(respuesta); otraProvincia.features[0].properties.state = 'Córdoba';
  assert.deepEqual(detalleDireccion(otraProvincia, opcion), {});
});
