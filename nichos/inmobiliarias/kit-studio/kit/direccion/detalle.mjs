import config from '../../../inmobiliaria.config.mjs';

export const DETALLE_DIRECCION_URL = 'https://photon.komoot.io/reverse';

const limpio = (valor, limite = 100) => typeof valor === 'string' && valor.length <= limite
  && !/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/.test(valor) ? valor.trim() : '';
const comparar = (valor) => limpio(valor).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/^partido de\s+|^comuna\s+/g, '').trim();

const CAPITAL = ['caba', 'ciudad autonoma de buenos aires', 'capital federal'];

// La ciudad de Capital se escribe «CABA», como en las propiedades ya cargadas.
export function ciudadDireccion(ciudad) {
  return CAPITAL.includes(comparar(ciudad)) ? 'CABA' : limpio(ciudad);
}

/**
 * Zona comercial del cliente para un partido, según `zonas` de inmobiliaria.config.mjs: la que lista
 * el partido, o la marcada `capital` para la Ciudad de Buenos Aires. Sin coincidencia: '' (queda manual).
 */
export function regionDireccion(ciudad, zona, zonas = config.zonas) {
  const capital = zona === 'Capital Federal' || CAPITAL.includes(comparar(ciudad));
  const encontrada = zonas.find((z) => capital ? z.capital : z.partidos?.some((p) => comparar(p) === comparar(ciudad)));
  return encontrada?.nombre ?? '';
}

export function coordenadasValidas(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

export function urlDetalleDireccion(opcion) {
  if (!coordenadasValidas(opcion.lat, opcion.lon)) return null;
  const url = new URL(DETALLE_DIRECCION_URL);
  url.search = new URLSearchParams({ lat: String(opcion.lat), lon: String(opcion.lon), limit: '1', radius: '0.2' }).toString();
  return url.toString();
}

export function detalleDireccion(respuesta, opcion) {
  const feature = respuesta?.features?.[0];
  const props = feature?.properties;
  const punto = feature?.geometry?.coordinates;
  if (!props || props.countrycode !== 'AR' || !Array.isArray(punto) || !coordenadasValidas(punto[1], punto[0])) return {};
  const distancia = Math.hypot((punto[1] - opcion.lat) * 111320, (punto[0] - opcion.lon) * 111320 * Math.cos(opcion.lat * Math.PI / 180));
  if (!Number.isFinite(distancia) || distancia > 250) return {};
  const capital = opcion.zona === 'Capital Federal';
  if (!capital && comparar(props.county) !== comparar(opcion.ciudad)) return {};
  // En Capital, Photon suele traer `state` y no `city`.
  if (capital && !/buenos aires/.test(comparar(props.city || props.state))) return {};
  // Sólo enriquecer localidad y CP; el número de un inmueble vecino no reemplaza la dirección elegida.
  const barrio = limpio(capital ? props.district : props.city);
  const codigo_postal = limpio(props.postcode, 16);
  const direccion = direccionConTildes(opcion.direccion, [props.street, props.type === 'street' ? props.name : '']);
  return { ...(barrio && comparar(barrio) !== comparar(opcion.ciudad) ? { barrio } : {}), ...(codigo_postal ? { codigo_postal } : {}),
    ...(direccion ? { direccion } : {}) };
}

const sinTildes = (valor) => valor.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/**
 * Georef no trae tildes y OSM sí. Si el nombre de OSM es la misma calle (igual sin tildes ni
 * mayúsculas), se copian sus tildes letra por letra y se conserva la caja ya normalizada.
 */
export function direccionConTildes(direccion, nombresOsm) {
  if (typeof direccion !== 'string') return null;
  const calle = direccion.replace(/\s+\d+\s*$/, '').normalize('NFC');
  const osm = nombresOsm.map((nombre) => limpio(nombre).normalize('NFC'))
    .find((nombre) => nombre && nombre.length === calle.length && sinTildes(nombre) === sinTildes(calle));
  if (!osm) return null;
  const conTildes = [...calle].map((letra, i) => letra === letra.toUpperCase() ? osm[i].toUpperCase() : osm[i].toLowerCase()).join('');
  return conTildes === calle ? null : conTildes + direccion.slice(calle.length);
}
