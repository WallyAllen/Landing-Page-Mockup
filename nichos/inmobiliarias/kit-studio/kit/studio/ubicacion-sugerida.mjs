// Traduce una sugerencia de lib/direccion-georef.mjs a los campos del objeto `ubicacion`.
import config from '../../../inmobiliaria.config.mjs';
import { PROVINCIAS } from '../direccion/provincias.mjs';

// Zonas comerciales del cliente (inmobiliaria.config.mjs), aparte de la provincia oficial.
export const ZONAS = config.zonas.map((zona) => zona.nombre);

/** Campos a escribir al elegir una sugerencia. `undefined` borra el campo; sin zona conocida, la zona no se toca. */
export function camposDeSugerencia(opcion, zonas = ZONAS) {
  return {
    calle_y_numero: opcion.direccion,
    ciudad: opcion.ciudad || undefined,
    // Una localidad vieja de otra dirección es peor que un campo vacío que la validación marca.
    localidad: opcion.barrio || undefined,
    ...(PROVINCIAS.some((p) => p.nombre === opcion.provincia) ? { provincia: opcion.provincia } : {}),
    ...(zonas.includes(opcion.region) ? { zona: opcion.region } : {}),
  };
}

/**
 * Lo que llega después desde Photon: la localidad y la calle con tildes de OSM. Cada una se
 * aplica sólo si el editor no tocó la ubicación (la localidad) o la calle desde que eligió.
 */
export function camposDeDetalle(actual, campos, datos) {
  const igual = (campo) => (actual?.[campo] ?? '') === (campos[campo] ?? '');
  const nuevos = {};
  if (datos?.direccion && actual && igual('calle_y_numero')) nuevos.calle_y_numero = datos.direccion;
  if (datos?.barrio && datos.barrio !== campos.localidad && actual && ['calle_y_numero', 'ciudad', 'localidad'].every(igual)) nuevos.localidad = datos.barrio;
  return nuevos;
}
