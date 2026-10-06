import assert from 'node:assert/strict';
import test from 'node:test';
import { nombreCalle, puedeBuscarDireccion, sugerenciasDireccion, urlDireccion } from '../direccion/georef.mjs';
import { ZONAS_PRUEBA } from './zonas-de-prueba.mjs';

test('sólo consulta al escribir calle y número; la URL no incluye campos personales', () => {
  for (const texto of ['Corrientes 2431', 'Av. 9 de Julio 100', '14 1486']) assert.equal(puedeBuscarDireccion(texto), true);
  for (const texto of ['', 'Martínez', 'Corrientes', '2431', 'x'.repeat(141)]) assert.equal(puedeBuscarDireccion(texto), false);
  const url = new URL(urlDireccion(' Corrientes 2431 ', '02,06'));
  assert.equal(url.origin, 'https://apis.datos.gob.ar');
  assert.equal(url.searchParams.get('direccion'), 'Corrientes 2431');
  assert.equal(url.searchParams.get('provincia'), '02,06');
  assert.deepEqual([...url.searchParams.keys()].sort(), ['direccion', 'max', 'provincia']);
  // Sin filtro busca en todo el país.
  assert.equal(new URL(urlDireccion('Corrientes 2431')).searchParams.has('provincia'), false);
});

test('resultados válidos: todo el país con su provincia oficial; descarta ids desconocidos y direcciones incompletas; no inventa localidad', () => {
  const direccion = { nomenclatura: 'CORRIENTES 2431, San Isidro, Buenos Aires', provincia: { id: '06' }, calle: { nombre: 'CORRIENTES' }, altura: { valor: 2431 } };
  const cordoba = { ...direccion, provincia: { id: '14' }, nomenclatura: 'CORRIENTES 2431, Capital, Córdoba' };
  assert.deepEqual(sugerenciasDireccion({ direcciones: [direccion, direccion, cordoba, { ...direccion, provincia: { id: '99' } }, { ...direccion, altura: {} }, { ...direccion, nomenclatura: 'Inyección\ntexto' }] }, ZONAS_PRUEBA), [
    { valor: 'Corrientes 2431, San Isidro, Buenos Aires', zona: 'Provincia de Buenos Aires', provincia: 'Buenos Aires', direccion: 'Corrientes 2431', ciudad: '', barrio: '', region: '', codigo_postal: '' },
    { valor: 'Corrientes 2431, Capital, Córdoba', zona: 'Córdoba', provincia: 'Córdoba', direccion: 'Corrientes 2431', ciudad: '', barrio: '', region: '', codigo_postal: '' },
  ]);
  assert.deepEqual(sugerenciasDireccion({ direcciones: [{ ...direccion, provincia: { id: '02' }, nomenclatura: 'AV CORRIENTES 2431, Ciudad Autónoma de Buenos Aires' }] }, ZONAS_PRUEBA), [{ valor: 'Av. Corrientes 2431, Ciudad Autónoma de Buenos Aires', zona: 'Capital Federal', provincia: 'Ciudad Autónoma de Buenos Aires', direccion: 'Corrientes 2431', ciudad: 'CABA', barrio: '', region: 'Ciudad', codigo_postal: '' }]);
  for (const respuesta of [null, {}, { direcciones: {} }]) assert.deepEqual(sugerenciasDireccion(respuesta), []);
});

test('nombreCalle corrige la caja de Georef sin inventar tildes (casos reales de la API)', () => {
  const casos = [
    ['PARANA', 'Parana'], // Georef no trae la tilde de Paraná: no se agrega.
    ['AV DEL LIBERTADOR', 'Av. del Libertador'], ['GRL PAZ', 'Gral. Paz'], ['PRES JULIO A ROCA', 'Pres. Julio A Roca'],
    ['ROCA JULIO A PRES', 'Roca Julio A Pres.'], ['9 DE JULIO', '9 de Julio'], ['PIO XII', 'Pio XII'],
    ["GRL BERNARDO O'HIGGINS", "Gral. Bernardo O'Higgins"], ["C 313 - O'HIGGINS", "C 313 - O'Higgins"], ['PJE 100 MONTERO', 'Pje. 100 Montero'],
    ['DR IGNACIO ARIETA', 'Dr. Ignacio Arieta'], ['LAS HERAS', 'Las Heras'], ['LISANDRO DE LA TORRE', 'Lisandro de la Torre'],
    ['DE LA TORRE', 'De la Torre'], ['AV CNL DIAZ', 'Av. Cnel. Diaz'], ['INT NEYER', 'Int. Neyer'], ['IGR HUERGO', 'Ing. Huergo'],
    ['NORTE DIAG', 'Norte Diag.'], ['RIVADAVIA COMOD', 'Rivadavia Comod.'], ['ALMTE BROWN', 'Almte. Brown'],
    ['CALLE 39 - GDOR UGARTE', 'Calle 39 - Gdor. Ugarte'], ['AV 1 DE LOS CONSTITUYENTES', 'Av. 1 de los Constituyentes'],
    ['JUAN B JUSTO', 'Juan B Justo'], ['MONSENOR LARUMBE', 'Monsenor Larumbe'], ['TTE URIBURU', 'Tte. Uriburu'],
    ['AV. SANTA FE', 'Av. Santa Fe'], ['ESTANISLAO DEL CAMPO', 'Estanislao del Campo'], ['MITRE Y VEDIA', 'Mitre y Vedia'],
    ['AVELLANEDA', 'Avellaneda'], ['DIAZ VELEZ', 'Diaz Velez'], ['TUCUMÁN', 'Tucumán'],
  ];
  for (const [georef, esperado] of casos) assert.equal(nombreCalle(georef), esperado, georef);
  // Lo escrito por una persona se respeta tal cual.
  assert.equal(nombreCalle('Paraná'), 'Paraná');
});

test('Las sugerencias muestran y completan la calle normalizada', () => {
  const [opcion] = sugerenciasDireccion({ direcciones: [{ nomenclatura: 'GRL PAZ 1200, Vicente López, Buenos Aires', provincia: { id: '06' },
    calle: { nombre: 'GRL PAZ' }, altura: { valor: 1200 }, departamento: { nombre: 'Vicente López' } }] });
  assert.equal(opcion.valor, 'Gral. Paz 1200, Vicente López, Buenos Aires');
  assert.equal(opcion.direccion, 'Gral. Paz 1200');
});
