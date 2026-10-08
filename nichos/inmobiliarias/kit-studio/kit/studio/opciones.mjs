// Opciones de un campo de una sola elección (operación, tipo…) para BotonesOpcion: las principales
// a la vista y el resto detrás de «Ver más», como en ZonaProp. Sin principales se muestran todas.

/** @typedef {{ title: string, value: string }} Opcion */

/**
 * Lista de Sanity (`options.list`: strings o { title, value }) como { title, value }.
 * @param {Array<string | { title?: string, value: string }>} [lista]
 * @returns {Opcion[]}
 */
export const normalizarOpciones = (lista = []) => lista.map((item) =>
  typeof item === 'string' ? { title: item, value: item } : { title: item.title ?? item.value, value: item.value });

/**
 * Reparte las opciones: `visibles` en el orden de `principales`; `valorEnResto` obliga a mostrar el resto.
 * @param {Opcion[]} opciones
 * @param {readonly string[]} [principales]
 * @param {string} [valor]
 * @returns {{ visibles: Opcion[], resto: Opcion[], valorEnResto: boolean }}
 */
export function repartirOpciones(opciones, principales = [], valor) {
  if (!principales?.length) return { visibles: opciones, resto: [], valorEnResto: false };
  const visibles = principales.map((v) => opciones.find((o) => o.value === v)).filter((o) => o !== undefined);
  const resto = opciones.filter((o) => !principales.includes(o.value));
  return { visibles, resto, valorEnResto: resto.some((o) => o.value === valor) };
}
