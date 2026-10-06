import config from '../../../inmobiliaria.config.mjs';

// Las etapas y sus campos salen de inmobiliaria.config.mjs.
export const stages = config.etapas.map((etapa) => ({ title: etapa.titulo, fields: etapa.campos }));

export function stageForField(name) {
  // Los controles agregados al esquema en el futuro quedan accesibles en la revisión.
  const index = stages.findIndex((stage) => stage.fields.includes(name));
  return index < 0 ? stages.length - 1 : index;
}

export function errorsForStage(index, value = {}, markers = []) {
  const errors = markers.filter((marker) => marker.level === 'error' &&
    marker.path?.length && stageForField(marker.path[0]) === index);
  if (index === 0) {
    const essentials = [
      ['operacion', 'Elegí la operación'], ['tipo', 'Elegí el tipo de propiedad'],
      ['ubicacion.calle_y_numero', 'Ingresá la calle y el número'],
      ['ubicacion.ciudad', 'Ingresá la ciudad o el partido'],
      ['ubicacion.localidad', 'Ingresá la localidad o el barrio'],
      ['ubicacion.provincia', 'Elegí la provincia'], ['ubicacion.zona', 'Elegí la zona'],
    ];
    for (const [key, message] of essentials) {
      const path = key.split('.');
      const fieldValue = path.reduce((current, part) => current?.[part], value);
      if (typeof fieldValue !== 'string' || !fieldValue.trim()) errors.push({ path, message, level: 'error' });
    }
  }
  return errors.filter((error, i, all) => all.findIndex((item) =>
    JSON.stringify(item.path) === JSON.stringify(error.path)) === i);
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort()
    .filter((key) => value[key] !== undefined).map((key) => [key, canonical(value[key])]));
  return value;
}

export function documentContent(value) {
  // Se conserva _type, los _key de imágenes y TODOS los campos desconocidos.
  const { _id, _rev, _createdAt, _updatedAt, ...content } = value ?? {};
  return canonical(content);
}

export function sameContent(local, remote) {
  return JSON.stringify(documentContent(local)) === JSON.stringify(documentContent(remote));
}

/** Confirma el documento exacto en el servidor; no escribe ni publica nada. */
export async function confirmSaved({ read, expected, id, isSyncing, signal, timeoutMs = 15000, intervalMs = 400 }) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    signal?.throwIfAborted();
    const remote = await read(id, signal);
    if (remote?._id === id && remote._rev && !isSyncing() && sameContent(expected, remote)) return remote;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error('No pudimos confirmar todos los cambios en Sanity. El editor sigue abierto; revisá la conexión y reintentá.');
}
