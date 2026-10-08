// Datos obligatorios para publicar, en el orden de los portales (ZonaProp): superficie total y
// cubierta, antigüedad, y ambientes, dormitorios y baños en las viviendas. Los usan el asistente
// (Continuar) y la validación de publicación del esquema. Qué tipos son vivienda o no llevan
// superficie cubierta se define en inmobiliaria.config.mjs.
import config from '../../../inmobiliaria.config.mjs';

const SIN_CUBIERTA = config.tiposSinCubierta ?? ['terreno'];
const VIVIENDA = config.tiposVivienda ?? [];
const sinNumero = (n) => typeof n !== 'number' || !Number.isFinite(n);
const conCubierta = (doc) => !SIN_CUBIERTA.includes(doc.tipo);
const esVivienda = (doc) => VIVIENDA.includes(doc.tipo);

export const REQUISITOS = [
  { path: ['superficies', 'total_m2'], mensaje: 'Ingresá la superficie total', aplica: () => true,
    falta: (doc) => sinNumero(doc.superficies?.total_m2) },
  { path: ['superficies', 'cubierta_m2'], mensaje: 'Ingresá la superficie cubierta', aplica: conCubierta,
    falta: (doc) => sinNumero(doc.superficies?.cubierta_m2) },
  { path: ['antiguedad'], mensaje: 'Elegí la antigüedad: en construcción, a estrenar o años de la propiedad', aplica: conCubierta,
    falta: (doc) => { const a = doc.antiguedad ?? {}; return !a.en_construccion && !a.a_estrenar && sinNumero(a.anios); } },
  { path: ['ambientes', 'ambientes'], mensaje: 'Indicá la cantidad de ambientes', aplica: esVivienda,
    falta: (doc) => sinNumero(doc.ambientes?.ambientes) },
  { path: ['ambientes', 'dormitorios'], mensaje: 'Indicá la cantidad de dormitorios (0 si es monoambiente)', aplica: esVivienda,
    falta: (doc) => sinNumero(doc.ambientes?.dormitorios) },
  { path: ['ambientes', 'banos'], mensaje: 'Indicá la cantidad de baños', aplica: esVivienda,
    falta: (doc) => sinNumero(doc.ambientes?.banos) },
];

/** Lo que falta para publicar, con la ruta exacta de cada campo. */
export function faltantes(doc = {}) {
  return REQUISITOS.filter((r) => r.aplica(doc) && r.falta(doc)).map((r) => ({ path: r.path, message: r.mensaje, level: 'error' }));
}

/** Validación de Sanity para un campo de Propiedad (superficies, antiguedad, ambientes): junta sus faltantes. */
export function validarCampo(nombre) {
  return (_valor, context) => {
    const mensajes = faltantes(context?.document ?? {}).filter((f) => f.path[0] === nombre).map((f) => f.message);
    return mensajes.length ? mensajes.join(' · ') : true;
  };
}
