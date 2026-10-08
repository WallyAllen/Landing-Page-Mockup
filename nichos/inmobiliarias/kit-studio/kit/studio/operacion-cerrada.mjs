// Galería «Lo que vendimos y alquilamos»: fotos de carteles de operaciones cerradas, como prueba de trayectoria.
// JS sin dependencias: lo usan el esquema del Studio y el sitio (consulta, epígrafe y URL de la foto).
// Sin precio ni dirección: sólo la operación, el barrio y, si se sabe, el año.

/** [valor guardado, título visible]. */
export const OPERACIONES_CERRADAS = [['vendida', 'Vendida'], ['alquilada', 'Alquilada']];
/** Cuántas fotos muestra la portada. */
export const MAXIMO_EN_PORTADA = 8;

// Sin orden cargado, va al final; a igual orden, la más nueva primero.
export const consultaOperacionesCerradas = `*[_type == "operacionCerrada" && defined(foto.asset) && operacion in ${JSON.stringify(OPERACIONES_CERRADAS.map(([v]) => v))}]`
  + ` | order(coalesce(orden, 9999) asc, _createdAt desc)[0...${MAXIMO_EN_PORTADA}]`
  + '{_id, operacion, barrio, anio, "url": foto.asset->url, "hotspot": foto.hotspot}';

/** «Vendida en Martínez · 2008»; sin barrio, «Vendida»; con una operación desconocida, ''. */
export function epigrafe({ operacion, barrio, anio } = {}) {
  const titulo = OPERACIONES_CERRADAS.find(([valor]) => valor === operacion)?.[1];
  if (!titulo) return '';
  const lugar = barrio?.trim() ? ` en ${barrio.trim()}` : '';
  return `${titulo}${lugar}${Number.isInteger(anio) ? ` · ${anio}` : ''}`;
}

/** URL del CDN de Sanity recortada al punto de interés (hotspot) que se marcó en el Studio. */
export function fotoCartel(url, hotspot, ancho, alto) {
  const p = new URLSearchParams({ w: String(ancho), h: String(alto), fit: 'crop', auto: 'format' });
  if (Number.isFinite(hotspot?.x) && Number.isFinite(hotspot?.y)) {
    p.set('crop', 'focalpoint');
    p.set('fp-x', String(hotspot.x));
    p.set('fp-y', String(hotspot.y));
  }
  return `${url}?${p}`;
}
