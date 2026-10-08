import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizarOpciones, repartirOpciones } from '../studio/opciones.mjs';
import config from '../../../inmobiliaria.config.mjs';

// Lista ficticia: la lógica no depende de la configuración de ningún cliente.
const tipos = normalizarOpciones([{ title: 'Casa', value: 'casa' }, { title: 'Departamento', value: 'departamento' },
  { title: 'PH', value: 'ph' }, { title: 'Terreno', value: 'terreno' }, 'local']);
const valores = (lista) => lista.map((o) => o.value);

test('Las listas de Sanity llegan como { title, value }, también las de strings', () => {
  assert.deepEqual(tipos.at(-1), { title: 'local', value: 'local' });
  assert.deepEqual(normalizarOpciones(), []);
});

test('Los principales quedan a la vista en su orden y el resto en «Ver más»', () => {
  const { visibles, resto, valorEnResto } = repartirOpciones(tipos, ['ph', 'casa', 'departamento'], 'casa');
  assert.deepEqual(valores(visibles), ['ph', 'casa', 'departamento']);
  assert.deepEqual(valores(resto), ['terreno', 'local']);
  assert.equal(valorEnResto, false);
});

test('Un valor guardado fuera de los principales abre «Ver más»; sin valor, queda cerrado', () => {
  assert.equal(repartirOpciones(tipos, ['casa', 'departamento', 'ph'], 'terreno').valorEnResto, true);
  assert.equal(repartirOpciones(tipos, ['casa', 'departamento', 'ph'], undefined).valorEnResto, false);
});

test('Sin principales (operación, o un cliente que no los configura) se ven todas', () => {
  for (const principales of [undefined, []]) {
    const { visibles, resto } = repartirOpciones(tipos, principales, 'terreno');
    assert.equal(visibles.length, tipos.length);
    assert.equal(resto.length, 0);
  }
  // Un principal que no existe en la lista no deja un botón vacío.
  assert.deepEqual(valores(repartirOpciones(tipos, ['casa', 'inexistente']).visibles), ['casa']);
});

test('Los tiposPrincipales de la configuración existen en tipos', () => {
  const existentes = config.tipos.map(([valor]) => valor);
  for (const valor of config.tiposPrincipales ?? []) assert.ok(existentes.includes(valor), `${valor} no está en tipos`);
});
