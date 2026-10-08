// Esquema de Propiedad del kit. Las listas y valores iniciales salen de inmobiliaria.config.mjs;
// el cliente suma sus propios tipos (blog, personas…) en su schemaTypes.
import { defineArrayMember, defineField, defineType, type ConditionalProperty } from 'sanity';
import config from '../../../inmobiliaria.config.mjs';
import { PropertyWizardInput } from './PropertyWizardInput';
import { UbicacionInput } from './UbicacionInput';
import { AntiguedadInput, CasillasInput } from './CaracteristicasInput';
import { MonedaInput, OpcionesInput, TipoInput } from './OpcionesInput';
import { slugDePropiedad } from './property-workflow.mjs';
import { epigrafe, MAXIMO_EN_PORTADA, OPERACIONES_CERRADAS } from './operacion-cerrada.mjs';
import { validarCampo } from './requisitos.mjs';
import { ZONAS } from './ubicacion-sugerida.mjs';
import { PROVINCIAS } from '../direccion/provincias.mjs';

// Un par [valor, título] muestra un título legible sin cambiar el valor guardado.
// En inmobiliaria.config.mjs los pares llegan como string[] (JS sin tipos): [0] es el valor y [1] el título.
type Opcion = string | readonly string[];
const lista = (items: readonly Opcion[]) => items.map((item) => typeof item === 'string' ? { title: item, value: item } : { title: item[1] ?? item[0], value: item[0] });
const opcion = (name: string, title: string, values: readonly Opcion[], required = false) => defineField({
  name, title, type: 'string', options: { list: lista(values) },
  validation: required ? (rule) => rule.required() : undefined,
});
const numero = (name: string, title: string) => defineField({ name, title, type: 'number', validation: (rule) => rule.min(0) });
const booleano = (name: string, title: string) => defineField({ name, title, type: 'boolean', initialValue: false });
// Con «Consultar precio» marcado, monto y moneda quedan deshabilitados (se conservan).
const sinPrecio: ConditionalProperty = ({ document }) => Boolean((document as { precio_consultar?: boolean } | undefined)?.precio_consultar);
// Títulos con tildes para los botones; el nombre guardado no cambia.
const TITULOS: Record<string, string> = { 'hall-de-distribucion': 'Hall de distribución', jardin: 'Jardín', balcon: 'Balcón',
  sotano: 'Sótano', calefaccion: 'Calefacción', calefon: 'Calefón', 'dependencia-de-servicio': 'Dependencia de servicio' };
const titulo = (v: string) => TITULOS[v] ?? v[0].toUpperCase() + v.slice(1).replaceAll('-', ' ');
const casillasDe = (valores: string[]) => valores.map((v) => booleano(v.replaceAll('-', '_'), titulo(v)));

const ubicacion = defineType({
  name: 'ubicacion', title: 'Ubicación', type: 'object',
  components: { input: UbicacionInput },
  fields: [
    // En el orden de ZonaProp; el orden de los campos no cambia los datos guardados.
    defineField({ name: 'calle_y_numero', title: 'Calle y número', type: 'string', validation: (rule) => rule.required() }),
    // La zona comercial es del cliente: decide quién atiende y se muestra en el sitio.
    defineField({ name: 'zona', title: 'Zona', type: 'string', initialValue: config.ubicacionInicial.zona,
      options: { list: lista(ZONAS) }, validation: (rule) => rule.required() }),
    defineField({ name: 'ciudad', title: 'Ciudad o partido', type: 'string', validation: (rule) => rule.required() }),
    defineField({ name: 'localidad', title: 'Barrio', type: 'string', validation: (rule) => rule.required() }),
    // La provincia oficial sale de la dirección (Georef): al final y más chica (UbicacionInput), pero editable.
    defineField({ name: 'provincia', title: 'Provincia', type: 'string', initialValue: config.ubicacionInicial.provincia,
      description: 'Se completa sola con la dirección. Corregila si hace falta.',
      options: { list: lista(PROVINCIAS.map((p) => p.nombre)) }, validation: (rule) => rule.required() }),
  ],
  validation: (rule) => rule.required(),
});

const superficies = defineType({ name: 'superficies', title: 'Superficies', type: 'object', fields: [
  numero('total_m2', 'Total m²'), numero('cubierta_m2', 'Cubierta m²'), numero('semicubierta_m2', 'Semicubierta m²'),
  numero('libre_m2', 'Libre m²'), numero('terreno_m2', 'Terreno m²'),
] });
const antiguedad = defineType({ name: 'antiguedad', title: 'Antigüedad', type: 'object',
  components: { input: AntiguedadInput }, fields: [
  booleano('en_construccion', 'En construcción'), booleano('a_estrenar', 'A estrenar'), numero('anios', 'Años'),
] });
const ambientes = defineType({ name: 'ambientes', title: 'Ambientes principales', type: 'object', fields: [
  numero('ambientes', 'Ambientes'), numero('dormitorios', 'Dormitorios'), numero('dormitorios_suite', 'Dormitorios en suite'),
  numero('banos', 'Baños'), numero('toilettes', 'Toilettes'), numero('cocheras', 'Cocheras'),
] });
const casillas = defineType({ name: 'casillas', title: 'Ambientes y casillas', type: 'object', components: { input: CasillasInput }, fields: casillasDe([
  'living', 'living-comedor', 'hall-de-distribucion', 'comedor', 'comedor-diario', 'jardin', 'patio', 'vestidor',
  'quincho', 'escritorio', 'lavadero', 'playroom', 'altillo', 'balcon', 'baulera', 'dependencia-de-servicio',
  'sotano', 'terraza', 'pileta', 'parrilla', 'hidromasaje', 'sala-de-juegos']) });
const servicios = defineType({ name: 'servicios', title: 'Servicios', type: 'object', components: { input: CasillasInput }, fields: casillasDe([
  'ascensor', 'encargado', 'aire-acondicionado', 'alarma', 'calefaccion', 'vigilancia', 'caldera', 'calefon', 'termotanque']) });
// Mascotas: sólo «sí» o «consultar»; si no se toca, no aparece.
const facilidades = defineType({ name: 'facilidades', title: 'Facilidades', type: 'object', components: { input: CasillasInput }, fields: [
  booleano('uso_profesional', 'Apto profesional'), booleano('uso_comercial', 'Apto comercial'),
  opcion('mascotas', 'Mascotas', [['si', 'Permite mascotas'], ['consultar', 'Mascotas: consultar']]),
] });
const detalles = defineType({ name: 'detalles', title: 'Detalles', type: 'object', fields: [
  opcion('luminosidad', 'Luminosidad', ['muy-luminoso', 'luminoso', 'poco-luminoso']),
  opcion('orientacion', 'Orientación', ['norte', 'sur', 'este', 'oeste', 'noreste', 'noroeste', 'sudeste', 'sudoeste']),
  defineField({ name: 'plantas', title: 'Plantas', type: 'string', options: { list: lista(['1', '2', '3', '4+']) } }),
  opcion('cobertura_cochera', 'Cobertura de cochera', ['cubierta', 'semicubierta', 'descubierta']),
] });
const fuentes = defineType({ name: 'fuentes', title: 'Fuentes del aviso', type: 'object', fields: [
  defineField({ name: 'zonaprop_url', title: 'ZonaProp', type: 'url' }),
  defineField({ name: 'argenprop_url', title: 'Argenprop', type: 'url' }),
  defineField({ name: 'codigo', title: 'Código', type: 'string' }),
] });

const propiedad = defineType({
  name: 'propiedad', title: 'Propiedad', type: 'document',
  components: { input: PropertyWizardInput },
  fieldsets: [
    // Monto, moneda y «Consultar precio» en una fila desde 600 px; en celular, uno debajo del otro.
    { name: 'precio', title: 'Precio', options: { columns: [1, 1, 3] as unknown as number } },
    { name: 'internos', title: 'Datos internos', description: 'Dirección web del aviso, fuentes y notas. No hace falta tocarlos para publicar.',
      options: { collapsible: true, collapsed: true } },
  ],
  fields: [
    // Botones de una sola elección, como en ZonaProp (OpcionesInput).
    { ...opcion('operacion', 'Operación', config.operaciones, true), components: { input: OpcionesInput } },
    { ...opcion('tipo', 'Tipo de propiedad', config.tipos, true), components: { input: TipoInput } },
    { ...numero('precio', 'Monto'), fieldset: 'precio', readOnly: sinPrecio },
    { ...opcion('moneda', 'Moneda', config.monedas), fieldset: 'precio', readOnly: sinPrecio, components: { input: MonedaInput } },
    { ...booleano('precio_consultar', 'Consultar precio'), fieldset: 'precio', options: { layout: 'checkbox' as const } },
    numero('expensas', 'Expensas (ARS por mes)'),
    { ...opcion('estado', 'Estado', config.estados, true), components: { input: OpcionesInput } },
    defineField({ name: 'ubicacion', title: 'Ubicación', type: 'ubicacion', validation: (rule) => rule.required() }),
    // Obligatorios para publicar según el tipo (requisitos.mjs); el borrador se guarda igual.
    defineField({ name: 'superficies', title: 'Superficies', type: 'superficies', validation: (rule) => rule.custom(validarCampo('superficies')) }),
    defineField({ name: 'antiguedad', title: 'Antigüedad', type: 'antiguedad', validation: (rule) => rule.custom(validarCampo('antiguedad')) }),
    defineField({ name: 'ambientes', title: 'Ambientes principales', type: 'ambientes', validation: (rule) => rule.custom(validarCampo('ambientes')) }),
    defineField({ name: 'casillas', title: 'Ambientes y casillas', type: 'casillas' }),
    defineField({ name: 'servicios', title: 'Servicios', type: 'servicios' }),
    defineField({ name: 'facilidades', title: 'Facilidades', type: 'facilidades' }),
    defineField({ name: 'detalles', title: 'Detalles', type: 'detalles' }),
    defineField({ name: 'descripcion', title: 'Descripción', type: 'text' }),
    defineField({ name: 'fotos', title: 'Fotos', description: 'La primera foto es la portada. Arrastrá para cambiar el orden.', type: 'array', of: [defineArrayMember({ type: 'image', options: { hotspot: true } })], validation: (rule) => rule.required().min(1) }),
    // Se genera solo al pasar de la primera etapa o al guardar (PropertyWizardInput); acá se ve y se corrige.
    defineField({ name: 'slug', title: 'Dirección web (slug)', type: 'slug', fieldset: 'internos',
      options: { source: (doc) => slugDePropiedad((doc as { ubicacion?: object }).ubicacion) }, validation: (rule) => rule.required() }),
    defineField({ name: 'fuentes', title: 'Fuentes', type: 'fuentes', fieldset: 'internos' }),
    defineField({ name: 'notas_datos', title: 'Notas de datos', type: 'text', fieldset: 'internos' }),
  ],
  initialValue: { operacion: config.operaciones[0][0], ubicacion: { ...config.ubicacionInicial }, estado: config.estados[0][0] },
  validation: (rule) => rule.custom((doc) => {
    if (!doc) return true;
    const d = doc as { precio?: number; precio_consultar?: boolean; moneda?: string };
    if (!d.precio_consultar && (d.precio === undefined || d.precio === null)) return 'Ingresá un precio o marcá Consultar precio';
    if (!d.precio_consultar && !d.moneda) return 'Elegí la moneda del precio';
    return true;
  }),
  preview: { select: { title: 'ubicacion.calle_y_numero', subtitle: 'operacion', media: 'fotos.0' } },
});

export const tiposPropiedad = [ubicacion, superficies, antiguedad, ambientes, casillas, servicios, facilidades, detalles, fuentes, propiedad];

// Galería «Lo que vendimos y alquilamos» (interruptor `operacionesCerradas` en inmobiliaria.config.mjs).
// Sin precio ni dirección exacta a propósito: es prueba de trayectoria, no un aviso.
const operacionCerrada = defineType({
  name: 'operacionCerrada', title: 'Operación cerrada', type: 'document',
  description: `Foto de un cartel de vendido o alquilado. La portada muestra las ${MAXIMO_EN_PORTADA} primeras según el orden.`,
  fields: [
    defineField({ name: 'foto', title: 'Foto del cartel', type: 'image', options: { hotspot: true },
      description: 'Marcá el cartel como punto de interés: la portada recorta alrededor de él.', validation: (rule) => rule.required() }),
    { ...opcion('operacion', 'Operación', OPERACIONES_CERRADAS, true), components: { input: OpcionesInput } },
    defineField({ name: 'barrio', title: 'Barrio', type: 'string', description: 'Sólo el barrio (por ejemplo, Martínez). Nunca la dirección.' }),
    defineField({ name: 'anio', title: 'Año', type: 'number', validation: (rule) => rule.integer().min(1900).max(new Date().getFullYear()) }),
    defineField({ name: 'orden', title: 'Orden', type: 'number', description: 'Menor primero. Sin orden, va al final.',
      validation: (rule) => rule.integer().min(0) }),
  ],
  orderings: [{ title: 'Orden', name: 'orden', by: [{ field: 'orden', direction: 'asc' }] }],
  preview: { select: { operacion: 'operacion', barrio: 'barrio', anio: 'anio', media: 'foto' },
    prepare: ({ operacion, barrio, anio, media }) => ({ title: epigrafe({ operacion, barrio, anio }) || 'Sin operación', media }) },
});

/** Vacío si el cliente no activa la galería en su configuración. */
export const tiposOperacionCerrada = config.operacionesCerradas ? [operacionCerrada] : [];
