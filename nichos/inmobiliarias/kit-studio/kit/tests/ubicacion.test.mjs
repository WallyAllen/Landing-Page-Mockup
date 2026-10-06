import assert from 'node:assert/strict';
import test from 'node:test';
import { sugerenciasDireccion } from '../direccion/georef.mjs';
import { camposDeDetalle, camposDeSugerencia as campos_ } from '../studio/ubicacion-sugerida.mjs';
import { ZONAS_PRUEBA } from './zonas-de-prueba.mjs';

const camposDeSugerencia = (opcion) => campos_(opcion, ZONAS_PRUEBA.map((zona) => zona.nombre));

const georef = (provincia, departamento, localidad) => ({ direcciones: [{
  nomenclatura: `CALLE FICTICIA 123, ${departamento}`, provincia: { id: provincia },
  calle: { nombre: 'CALLE FICTICIA' }, altura: { valor: 123 },
  departamento: { nombre: departamento }, localidad_censal: { nombre: localidad },
  ubicacion: { lat: -34.5, lon: -58.5 },
}] });

test('Una sugerencia de provincia completa calle, partido, localidad, provincia oficial y zona comercial', () => {
  const [opcion] = sugerenciasDireccion(georef('06', 'San Isidro', 'Martínez'), ZONAS_PRUEBA);
  assert.deepEqual(camposDeSugerencia(opcion), {
    calle_y_numero: 'Calle Ficticia 123', ciudad: 'San Isidro', localidad: 'Martínez', provincia: 'Buenos Aires', zona: 'Zona Norte',
  });
});

test('En Capital la localidad queda para Photon; provincia CABA y la zona marcada `capital`', () => {
  const [opcion] = sugerenciasDireccion(georef('02', 'Comuna 1', 'Ciudad Autónoma de Buenos Aires'), ZONAS_PRUEBA);
  assert.deepEqual(camposDeSugerencia(opcion), {
    calle_y_numero: 'Calle Ficticia 123', ciudad: 'CABA', localidad: undefined, provincia: 'Ciudad Autónoma de Buenos Aires', zona: 'Ciudad',
  });
});

test('Sin zona comercial conocida no se pisa la zona que eligió el editor; la provincia sí se completa', () => {
  const [opcion] = sugerenciasDireccion(georef('06', 'Partido Ficticio', 'Localidad Ficticia'), ZONAS_PRUEBA);
  const campos = camposDeSugerencia(opcion);
  assert.equal('zona' in campos, false);
  assert.equal(campos.provincia, 'Buenos Aires');
  assert.equal(campos.ciudad, 'Partido Ficticio');
  // Fuera de Buenos Aires: la provincia oficial que diga Georef.
  assert.equal(camposDeSugerencia(sugerenciasDireccion(georef('14', 'Capital', 'Córdoba'))[0]).provincia, 'Córdoba');
});

test('Photon completa localidad y tildes sólo sobre lo que el editor no tocó', () => {
  const campos = { calle_y_numero: 'Parana 2335', ciudad: 'CABA', localidad: undefined };
  const actual = { ...campos, provincia: 'Ciudad Autónoma de Buenos Aires', zona: 'Ciudad' };
  const datos = { barrio: 'Barrio Ficticio', direccion: 'Paraná 2335' };
  assert.deepEqual(camposDeDetalle(actual, campos, datos), { calle_y_numero: 'Paraná 2335', localidad: 'Barrio Ficticio' });
  // Localidad corregida a mano: sólo las tildes de la calle.
  assert.deepEqual(camposDeDetalle({ ...actual, localidad: 'Escrita a mano' }, campos, datos), { calle_y_numero: 'Paraná 2335' });
  // Calle cambiada: no se toca nada.
  assert.deepEqual(camposDeDetalle({ ...actual, calle_y_numero: 'Parana 2337' }, campos, datos), {});
  assert.deepEqual(camposDeDetalle(actual, campos, {}), {});
  assert.deepEqual(camposDeDetalle(undefined, campos, datos), {});
});
