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
    { titulo: 'Operación, tipo y ubicación', campos: ['operacion', 'tipo', 'ubicacion'] },
    { titulo: 'Características', campos: ['superficies', 'antiguedad', 'ambientes', 'casillas', 'servicios', 'facilidades', 'detalles'] },
    { titulo: 'Contenido y revisión', campos: ['precio', 'moneda', 'precio_consultar', 'expensas', 'estado', 'descripcion', 'fotos', 'slug', 'fuentes', 'notas_datos'] },
  ],
};
