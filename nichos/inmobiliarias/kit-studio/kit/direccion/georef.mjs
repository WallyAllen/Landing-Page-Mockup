import config from '../../../inmobiliaria.config.mjs';
import { ciudadDireccion, coordenadasValidas, regionDireccion } from './detalle.mjs';
import { provinciaPorId } from './provincias.mjs';

export const GEOREF_URL = 'https://apis.datos.gob.ar/georef/api/direcciones';

// Georef escribe las calles en mayúsculas y sin tildes; se corrige la caja, nunca la ortografía.
// Incluye las abreviaturas propias de Georef (GRL, CNL, IGR) junto a las habituales.
const ABREVIATURAS = {
  AV: 'Av.', AVDA: 'Av.', GRL: 'Gral.', GRAL: 'Gral.', PRES: 'Pres.', PJE: 'Pje.', DR: 'Dr.', DRA: 'Dra.',
  TTE: 'Tte.', CNL: 'Cnel.', CNEL: 'Cnel.', INT: 'Int.', IGR: 'Ing.', ING: 'Ing.', DIAG: 'Diag.', COMOD: 'Comod.',
  ALMTE: 'Almte.', GDOR: 'Gdor.', GOB: 'Gob.', SGTO: 'Sgto.', CMTE: 'Cmte.', PBRO: 'Pbro.', MONS: 'Mons.',
  BV: 'Bv.', BLVD: 'Bv.', PROF: 'Prof.', ARQ: 'Arq.', LIC: 'Lic.', CDOR: 'Cdor.',
};
const ROMANO = /^(?=[IVX]{2,}$)X{0,3}(IX|IV|V?I{0,3})$/;

export function nombreCalle(texto) {
  // Un texto que ya trae minúsculas lo escribió una persona: no se toca.
  if (typeof texto !== 'string' || texto !== texto.toUpperCase()) return texto;
  const palabras = texto.trim().split(/\s+/);
  return palabras.map((palabra, i) => {
    const clave = palabra.replace(/\.$/, '');
    if (ABREVIATURAS[clave]) return ABREVIATURAS[clave];
    if (ROMANO.test(clave)) return clave;
    const minuscula = palabra.toLowerCase();
    const anterior = palabras[i - 1]?.toLowerCase();
    if (i > 0 && (/^(de|del|y)$/.test(minuscula) || (/^(la|las|los|el)$/.test(minuscula) && /^(de|del)$/.test(anterior)))) return minuscula;
    if (/^\p{L}\.?$/u.test(palabra)) return palabra; // inicial: JUAN B JUSTO
    return minuscula.replace(/(^|['-])(\p{L})/gu, (_, separador, letra) => separador + letra.toUpperCase());
  }).join(' ');
}

const conCalle = (nomenclatura) => {
  const [calle, ...resto] = nomenclatura.split(', ');
  return [nombreCalle(calle), ...resto].join(', ');
};

export function puedeBuscarDireccion(valor) {
  const texto = valor.trim();
  return texto.length >= 4 && texto.length <= 140 && /\b\d+\b/.test(texto)
    && (/\p{L}/u.test(texto) || /\d+\D+\d+/.test(texto));
}

/** `provincias`: ids de Georef separados por coma para acotar la búsqueda (p. ej. '02,06'); vacío = todo el país. */
export function urlDireccion(valor, provincias = '') {
  const url = new URL(GEOREF_URL);
  url.search = new URLSearchParams({ direccion: valor.trim(), ...(provincias ? { provincia: provincias } : {}), max: '20' }).toString();
  return url.toString();
}

export function sugerenciasDireccion(respuesta, zonas = config.zonas) {
  const opciones = new Map();
  for (const direccion of Array.isArray(respuesta?.direcciones) ? respuesta.direcciones : []) {
    const id = direccion?.provincia?.id;
    const provincia = provinciaPorId(id);
    // `zona` conserva los valores del formulario de tasación del sitio, que sólo busca en Capital y Provincia.
    const zona = id === '02' ? 'Capital Federal' : id === '06' ? 'Provincia de Buenos Aires' : provincia;
    const texto = direccion?.nomenclatura;
    if (!provincia || typeof texto !== 'string' || !texto.trim() || texto.length > 140
      || /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/.test(texto)
      || !direccion?.calle?.nombre || direccion?.altura?.valor == null) continue;
    const valor = conCalle(texto.trim());
    if (!opciones.has(zona + ':' + valor)) {
      const ciudad = zona === 'Capital Federal' ? 'CABA' : ciudadDireccion(direccion.departamento?.nombre || '');
      const localidad = direccion.localidad_censal?.nombre || '';
      const lat = direccion.ubicacion?.lat;
      const lon = direccion.ubicacion?.lon;
      opciones.set(zona + ':' + valor, {
        valor, zona, provincia, direccion: nombreCalle(direccion.calle.nombre) + ' ' + direccion.altura.valor,
        ciudad, barrio: zona !== 'Capital Federal' && localidad !== ciudad ? localidad : '', region: regionDireccion(ciudad, zona, zonas), codigo_postal: '',
        ...(coordenadasValidas(lat, lon) ? { lat, lon } : {}),
      });
    }
    if (opciones.size === 20) break;
  }
  return [...opciones.values()];
}
