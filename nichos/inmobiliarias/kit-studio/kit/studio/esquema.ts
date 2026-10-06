// Esquema de Propiedad del kit. Las listas y valores iniciales salen de inmobiliaria.config.mjs;
// el cliente suma sus propios tipos (blog, personas…) en su schemaTypes.
import { defineArrayMember, defineField, defineType } from 'sanity';
import config from '../../../inmobiliaria.config.mjs';
import { PropertyWizardInput } from './PropertyWizardInput';
import { UbicacionInput } from './UbicacionInput';
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
const casillasDe = (valores: string[]) => valores.map((v) => booleano(v.replaceAll('-', '_'), v.replaceAll('-', ' ')));

const ubicacion = defineType({
  name: 'ubicacion', title: 'Ubicación', type: 'object',
  components: { input: UbicacionInput },
  fields: [
    defineField({ name: 'calle_y_numero', title: 'Calle y número', type: 'string', validation: (rule) => rule.required() }),
    defineField({ name: 'ciudad', title: 'Ciudad o partido', type: 'string', validation: (rule) => rule.required() }),
    defineField({ name: 'localidad', title: 'Localidad o barrio', type: 'string', validation: (rule) => rule.required() }),
    defineField({ name: 'provincia', title: 'Provincia', type: 'string', initialValue: config.ubicacionInicial.provincia,
      options: { list: lista(PROVINCIAS.map((p) => p.nombre)) }, validation: (rule) => rule.required() }),
    // La zona comercial es del cliente: decide quién atiende y se muestra en el sitio.
    defineField({ name: 'zona', title: 'Zona', type: 'string', initialValue: config.ubicacionInicial.zona,
      options: { list: lista(ZONAS) }, validation: (rule) => rule.required() }),
  ],
  validation: (rule) => rule.required(),
});

const superficies = defineType({ name: 'superficies', title: 'Superficies', type: 'object', fields: [
  numero('cubierta_m2', 'Cubierta m²'), numero('semicubierta_m2', 'Semicubierta m²'),
  numero('libre_m2', 'Libre m²'), numero('terreno_m2', 'Terreno m²'),
] });
const antiguedad = defineType({ name: 'antiguedad', title: 'Antigüedad', type: 'object', fields: [
  booleano('a_estrenar', 'A estrenar'), numero('anios', 'Años'),
] });
const ambientes = defineType({ name: 'ambientes', title: 'Ambientes principales', type: 'object', fields: [
  numero('ambientes', 'Ambientes'), numero('dormitorios', 'Dormitorios'), numero('dormitorios_suite', 'Dormitorios en suite'),
  numero('banos', 'Baños'), numero('toilettes', 'Toilettes'), numero('cocheras', 'Cocheras'),
] });
const casillas = defineType({ name: 'casillas', title: 'Ambientes y casillas', type: 'object', fields: casillasDe([
  'living', 'living-comedor', 'hall-de-distribucion', 'comedor', 'comedor-diario', 'jardin', 'patio', 'vestidor',
  'quincho', 'escritorio', 'lavadero', 'playroom', 'altillo', 'balcon', 'baulera', 'dependencia-de-servicio',
  'sotano', 'terraza', 'pileta', 'parrilla', 'hidromasaje', 'sala-de-juegos']) });
const servicios = defineType({ name: 'servicios', title: 'Servicios', type: 'object', fields: casillasDe([
  'ascensor', 'encargado', 'aire-acondicionado', 'alarma', 'calefaccion', 'vigilancia', 'caldera', 'calefon', 'termotanque']) });
const facilidades = defineType({ name: 'facilidades', title: 'Facilidades', type: 'object', fields: [
  booleano('uso_profesional', 'Uso profesional'), booleano('uso_comercial', 'Uso comercial'),
  opcion('mascotas', 'Mascotas', ['si', 'no', 'consultar']),
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
  fields: [
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'ubicacion.calle_y_numero' }, validation: (rule) => rule.required() }),
    opcion('operacion', 'Operación', config.operaciones, true),
    opcion('tipo', 'Propiedad', config.tipos, true),
    numero('precio', 'Precio'), opcion('moneda', 'Moneda', config.monedas),
    booleano('precio_consultar', 'Consultar precio'), numero('expensas', 'Expensas'),
    opcion('estado', 'Estado', config.estados, true),
    defineField({ name: 'ubicacion', title: 'Ubicación', type: 'ubicacion', validation: (rule) => rule.required() }),
    defineField({ name: 'superficies', title: 'Superficies', type: 'superficies' }),
    defineField({ name: 'antiguedad', title: 'Antigüedad', type: 'antiguedad' }),
    defineField({ name: 'ambientes', title: 'Ambientes', type: 'ambientes' }),
    defineField({ name: 'casillas', title: 'Ambientes y casillas', type: 'casillas' }),
    defineField({ name: 'servicios', title: 'Servicios', type: 'servicios' }),
    defineField({ name: 'facilidades', title: 'Facilidades', type: 'facilidades' }),
    defineField({ name: 'detalles', title: 'Detalles', type: 'detalles' }),
    defineField({ name: 'descripcion', title: 'Descripción', type: 'text' }),
    defineField({ name: 'fotos', title: 'Fotos', type: 'array', of: [defineArrayMember({ type: 'image', options: { hotspot: true } })], validation: (rule) => rule.required().min(1) }),
    defineField({ name: 'fuentes', title: 'Fuentes', type: 'fuentes' }),
    defineField({ name: 'notas_datos', title: 'Notas de datos', type: 'text' }),
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
