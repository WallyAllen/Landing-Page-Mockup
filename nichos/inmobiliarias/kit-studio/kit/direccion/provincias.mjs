// Las 24 jurisdicciones de Georef (apis.datos.gob.ar/georef/api/provincias), con su id y nombre oficial.
// Es una lista fija del país: no depende del cliente. Las zonas comerciales van aparte, en la configuración.
export const PROVINCIAS = [
  ['06', 'Buenos Aires'], ['10', 'Catamarca'], ['22', 'Chaco'], ['26', 'Chubut'],
  ['02', 'Ciudad Autónoma de Buenos Aires'], ['14', 'Córdoba'], ['18', 'Corrientes'], ['30', 'Entre Ríos'],
  ['34', 'Formosa'], ['38', 'Jujuy'], ['42', 'La Pampa'], ['46', 'La Rioja'], ['50', 'Mendoza'],
  ['54', 'Misiones'], ['58', 'Neuquén'], ['62', 'Río Negro'], ['66', 'Salta'], ['70', 'San Juan'],
  ['74', 'San Luis'], ['78', 'Santa Cruz'], ['82', 'Santa Fe'], ['86', 'Santiago del Estero'],
  ['94', 'Tierra del Fuego, Antártida e Islas del Atlántico Sur'], ['90', 'Tucumán'],
].map(([id, nombre]) => ({ id, nombre }));

export const provinciaPorId = (id) => PROVINCIAS.find((p) => p.id === id)?.nombre ?? '';
