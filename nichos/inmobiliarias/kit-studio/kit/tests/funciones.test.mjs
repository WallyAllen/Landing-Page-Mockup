import assert from 'node:assert/strict';
import test from 'node:test';
import { funcionesDeSanity } from '../studio/funciones.mjs';

const apagado = { enabled: false };

test('sin configurar, las funciones de Sanity que el panel no usa quedan apagadas', () => {
  assert.deepEqual(funcionesDeSanity(), {
    releases: apagado, tasks: apagado, scheduledPublishing: apagado, scheduledDrafts: apagado, mediaLibrary: apagado,
    document: { comments: apagado },
  });
  assert.deepEqual(funcionesDeSanity({}), funcionesDeSanity());
});

test('cada función se prende por separado; la publicación programada prende también los borradores programados', () => {
  const f = funcionesDeSanity({ comentarios: true, publicacionProgramada: true });
  assert.deepEqual(f.document, { comments: { enabled: true } });
  assert.deepEqual(f.scheduledPublishing, { enabled: true });
  assert.deepEqual(f.scheduledDrafts, { enabled: true });
  assert.deepEqual([f.releases, f.tasks, f.mediaLibrary], [apagado, apagado, apagado]);
  assert.deepEqual(funcionesDeSanity({ lanzamientos: true, tareas: true, mediaLibrary: true }).releases, { enabled: true });
  assert.deepEqual(funcionesDeSanity({ tareas: true }).tasks, { enabled: true });
  assert.deepEqual(funcionesDeSanity({ mediaLibrary: true }).mediaLibrary, { enabled: true });
});

test('sólo true prende: un valor raro no enciende nada por accidente', () => {
  assert.deepEqual(funcionesDeSanity({ comentarios: 'si', tareas: 1 }), funcionesDeSanity());
});

test('una clave desconocida es un error, no se ignora en silencio', () => {
  assert.throws(() => funcionesDeSanity({ comentario: true }), /funcionesSanity.*comentario/);
});
