export interface DemoSeedList {
  name: string
  category: string
  fields: string[]
  items: {
    name: string
    notes: string
    attributes: Record<string, string>
  }[]
  rankings: {
    name: string
    itemIndexes: number[]
  }[]
}

export const DEMO_DATASET: DemoSeedList[] = [
  {
    name: 'Vinos tintos para repetir',
    category: 'Vinos',
    fields: ['Bodega', 'Cepa', 'Año', 'Región'],
    items: [
      {
        name: 'El Enemigo Cabernet Franc',
        notes: 'Especiado y elegante, con final persistente y taninos firmes.',
        attributes: {
          Bodega: 'Aleanna',
          Cepa: 'Cabernet Franc',
          Año: '2020',
          Región: 'Valle de Uco',
        },
      },
      {
        name: 'Catena Zapata Malbec Argentino',
        notes: 'Intenso, notas de violetas y frutos negros maduros. Ideal para carnes asadas.',
        attributes: {
          Bodega: 'Catena Zapata',
          Cepa: 'Malbec',
          Año: '2021',
          Región: 'Gualtallary, Mendoza',
        },
      },
      {
        name: 'Zuccardi Q Tempranillo',
        notes: 'Cuerpo medio, notas de higos y cacao. Gran compañero de pastas.',
        attributes: {
          Bodega: 'Zuccardi',
          Cepa: 'Tempranillo',
          Año: '2021',
          Región: 'Santa Rosa',
        },
      },
    ],
    rankings: [
      {
        name: 'Mis favoritos',
        itemIndexes: [0, 1, 2],
      },
      {
        name: 'Precio / calidad',
        itemIndexes: [2, 0],
      },
    ],
  },
  {
    name: 'Cafés de especialidad',
    category: 'Cafeterías y granos',
    fields: ['Tostador', 'Origen', 'Proceso', 'Método ideal'],
    items: [
      {
        name: 'Etiopía Yirgacheffe',
        notes: 'Floral, notas cítricas a bergamota y té negro. Acidez brillante.',
        attributes: {
          Tostador: 'Puerto Blest',
          Origen: 'Etiopía',
          Proceso: 'Lavado',
          'Método ideal': 'V60 / Filtrado',
        },
      },
      {
        name: 'Colombia Huila Bourbon Rosado',
        notes: 'Dulce, notas a durazno y caramelo con cuerpo sedoso.',
        attributes: {
          Tostador: 'Fuego Tostadores',
          Origen: 'Colombia',
          Proceso: 'Honey',
          'Método ideal': 'Aeropress',
        },
      },
      {
        name: 'Brasil Cerrado Mineiro',
        notes: 'Cuerpo denso, notas a chocolate amargo y avellanas tostadas.',
        attributes: {
          Tostador: 'Cuervo Café',
          Origen: 'Brasil',
          Proceso: 'Natural',
          'Método ideal': 'Espresso',
        },
      },
    ],
    rankings: [
      {
        name: 'Top filtrados de la mañana',
        itemIndexes: [0, 1, 2],
      },
    ],
  },
]

