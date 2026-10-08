// Plantilla de inmobiliaria.config.mjs: copiar a la raíz del cliente y completar. Datos ficticios.
export default {
  marca: {
    nombre: 'Inmobiliaria Ejemplo',
    panel: 'Panel privado',
    tipografiaTitulos: "Georgia, 'Times New Roman', serif",
    simbolo: '/static/simbolo.svg', // en studio/static/; omitir si no hay
  },

  // [valor guardado, título visible]. Cambiar un valor ya cargado exige migrar documentos; el título no.
  operaciones: [['venta', 'Venta'], ['alquiler', 'Alquiler']],
  tipos: [['casa', 'Casa'], ['departamento', 'Departamento'], ['ph', 'PH'], ['terreno', 'Terreno'], ['local-oficina', 'Local / Oficina']],
  // Obligatorios para publicar (kit/studio/requisitos.mjs): las viviendas piden ambientes, dormitorios y baños;
  // los tipos sin cubierta piden sólo la superficie total (ni cubierta ni antigüedad).
  tiposVivienda: ['casa', 'departamento', 'ph'],
  tiposSinCubierta: ['terreno'],
  monedas: [['USD', 'USD'], ['ARS', 'ARS']],
  estados: [['disponible', 'Disponible'], ['reservada', 'Reservada'], ['vendida', 'Vendida'], ['alquilada', 'Alquilada']],

  // Zonas comerciales: `partidos` se asignan solos al elegir una dirección; `capital` es la Ciudad de Buenos Aires.
  zonas: [
    { nombre: 'Zona Norte', partidos: ['San Isidro', 'Vicente López'] },
    { nombre: 'Ciudad', capital: true },
    { nombre: 'Otra zona' },
  ],
  ubicacionInicial: { provincia: 'Buenos Aires', zona: 'Zona Norte' },

  // Ids de provincia de Georef para el buscador del sitio ('' = todo el país). El Studio busca en todo el país.
  provinciasSitio: '',

  // Cada campo de Propiedad en una sola etapa; la última es la de revisión.
  etapas: [
    { titulo: '¿Qué vas a publicar?', campos: ['operacion', 'tipo', 'ubicacion'] },
    { titulo: '¿Cómo es la propiedad?', campos: ['superficies', 'antiguedad', 'ambientes', 'casillas', 'servicios', 'facilidades', 'detalles'] },
    { titulo: 'Precio, fotos y descripción', campos: ['precio', 'moneda', 'precio_consultar', 'expensas', 'estado', 'descripcion', 'fotos', 'slug', 'fuentes', 'notas_datos'] },
  ],
};
