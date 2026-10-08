import config from '../../../inmobiliaria.config.mjs';
import { faltantes } from './requisitos.mjs';

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
      ['ubicacion.calle_y_numero', 'Ingresá la calle y el número'], ['ubicacion.zona', 'Elegí la zona'],
      ['ubicacion.ciudad', 'Ingresá la ciudad o el partido'], ['ubicacion.localidad', 'Ingresá el barrio'],
      ['ubicacion.provincia', 'Elegí la provincia'],
    ];
    for (const [key, message] of essentials) {
      const path = key.split('.');
      const fieldValue = path.reduce((current, part) => current?.[part], value);
      if (typeof fieldValue !== 'string' || !fieldValue.trim()) errors.push({ path, message, level: 'error' });
    }
  }
  // Lo obligatorio para publicar (requisitos.mjs) se pide en la etapa de cada campo, con su ruta exacta;
  // reemplaza al aviso de Sanity del campo entero (validarCampo), que junta todo en un mensaje.
  const propios = faltantes(value).filter((falta) => stageForField(falta.path[0]) === index);
  const cubiertos = new Set(propios.map((falta) => falta.path[0]));
  return [...errors.filter((error) => error.path.length > 1 || !cubiertos.has(error.path[0])), ...propios].filter((error, i, all) => all.findIndex((item) =>
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

/** Si un miembro del formulario va en la etapa: un campo por su nombre; un grupo (fieldset) por sus campos. */
export function miembroEnEtapa(member, index) {
  if (member.kind === 'field') return stageForField(member.name) === index;
  if (member.kind === 'fieldSet') return member.fieldSet.members.some((m) => m.kind === 'field' && stageForField(m.name) === index);
  return true;
}

/** Dirección web del aviso desde calle y número + barrio, sin tildes: «Don Bosco 123», «Martínez» → «don-bosco-123-martinez». */
export const slugDePropiedad = (ubicacion = {}) => [ubicacion.calle_y_numero, ubicacion.localidad].filter(Boolean).join(' ')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+/, '').slice(0, 96).replace(/-+$/, '');

/** El slug a asignar al primer guardado; vacío si ya tiene uno (nunca se pisa) o falta calle o barrio. */
export function slugPendiente(doc = {}) {
  const u = doc.ubicacion ?? {};
  if (doc.slug?.current || !u.calle_y_numero?.trim() || !u.localidad?.trim()) return '';
  return slugDePropiedad(u);
}

const tituloDe = (lista, valor) => lista.find(([v]) => v === valor)?.[1] ?? valor ?? '';
const numero = (n) => typeof n === 'number' && Number.isFinite(n);
const miles = new Intl.NumberFormat('es-AR');

/** Resumen de lo cargado para la revisión: etiqueta, valor legible ('' = falta) y la ruta del campo para «Editar». */
export function resumenRevision(doc = {}) {
  const u = doc.ubicacion ?? {};
  const s = doc.superficies ?? {};
  const fotos = doc.fotos?.length ?? 0;
  const precio = doc.precio_consultar ? 'Consultar precio' : numero(doc.precio) ? `${doc.moneda ?? ''} ${miles.format(doc.precio)}`.trim() : '';
  const superficie = [numero(s.total_m2) && `${s.total_m2} m² totales`, numero(s.cubierta_m2) && `${s.cubierta_m2} m² cubiertos`].filter(Boolean).join(' · ');
  return [
    ['Operación', tituloDe(config.operaciones, doc.operacion), ['operacion']],
    ['Tipo', tituloDe(config.tipos, doc.tipo), ['tipo']],
    ['Dirección', [u.calle_y_numero, u.localidad, u.ciudad].filter(Boolean).join(', '), ['ubicacion', 'calle_y_numero']],
    ['Precio', precio, [doc.precio_consultar ? 'precio_consultar' : 'precio']],
    ['Superficie', superficie, ['superficies', 'total_m2']],
    ['Ambientes', numero(doc.ambientes?.ambientes) ? String(doc.ambientes.ambientes) : '', ['ambientes', 'ambientes']],
    ['Fotos', fotos ? `${fotos} ${fotos === 1 ? 'foto' : 'fotos'}` : '', ['fotos']],
  ].map(([etiqueta, valor, path]) => ({ etiqueta, valor, path }));
}
