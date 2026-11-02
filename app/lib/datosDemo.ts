import { ALFABETO } from './config'
import type { JugadorInicial, LetraRosco, TipoPista } from './juego'

type EntradaDemo = {
  letra: string
  tipo: TipoPista
  pista: string
  respuesta: string
}

// Dos entradas por letra: una que empieza con la letra y otra que la contiene.
const BANCO_DEMO: EntradaDemo[] = [
  { letra: 'A', tipo: 'empieza', pista: 'Fruto seco de cáscara dura que se usa para hacer turrón', respuesta: 'almendra' },
  { letra: 'A', tipo: 'contiene', pista: 'Instrumento musical de seis cuerdas que se toca con los dedos', respuesta: 'guitarra' },

  { letra: 'B', tipo: 'empieza', pista: 'Fruta amarilla y alargada que se pela antes de comer', respuesta: 'banana' },
  { letra: 'B', tipo: 'contiene', pista: 'Instrumento de percusión que se toca con baquetas', respuesta: 'tambor' },

  { letra: 'C', tipo: 'empieza', pista: 'Animal de mar que camina de costado y tiene caparazón', respuesta: 'cangrejo' },
  { letra: 'C', tipo: 'contiene', pista: 'Instrumento musical de viento con teclas y fuelle', respuesta: 'acordeón' },

  { letra: 'D', tipo: 'empieza', pista: 'Animal marino que emite silbidos y es muy inteligente', respuesta: 'delfín' },
  { letra: 'D', tipo: 'contiene', pista: 'Fruta de piel aterciopelada y carozo duro', respuesta: 'durazno' },

  { letra: 'E', tipo: 'empieza', pista: 'Animal muy grande que tiene trompa y orejas enormes', respuesta: 'elefante' },
  { letra: 'E', tipo: 'contiene', pista: 'Instrumento que mide la temperatura corporal', respuesta: 'termómetro' },

  { letra: 'F', tipo: 'empieza', pista: 'Fruta roja y pequeña que se usa en postres', respuesta: 'frutilla' },
  { letra: 'F', tipo: 'contiene', pista: 'Prenda de lana que se usa alrededor del cuello', respuesta: 'bufanda' },

  { letra: 'G', tipo: 'empieza', pista: 'Animal doméstico que maúlla y duerme muchas horas', respuesta: 'gato' },
  { letra: 'G', tipo: 'contiene', pista: 'Animal australiano que salta y lleva a sus crías en una bolsa', respuesta: 'canguro' },

  { letra: 'H', tipo: 'empieza', pista: 'Alimento blanco y amarillo que ponen las gallinas', respuesta: 'huevo' },
  { letra: 'H', tipo: 'contiene', pista: 'Vegetal de hojas verdes y redondeadas que se usa en ensaladas', respuesta: 'lechuga' },

  { letra: 'I', tipo: 'empieza', pista: 'Vivienda que se construye con bloques de hielo', respuesta: 'iglú' },
  { letra: 'I', tipo: 'contiene', pista: 'Ave que no vuela y vive en los polos', respuesta: 'pingüino' },

  { letra: 'J', tipo: 'empieza', pista: 'Animal alto, de cuello largo y con manchas', respuesta: 'jirafa' },
  { letra: 'J', tipo: 'contiene', pista: 'Herramienta de dos hojas que sirve para cortar papel', respuesta: 'tijera' },

  { letra: 'K', tipo: 'empieza', pista: 'Fruta verde por dentro y con semillas negras', respuesta: 'kiwi' },
  { letra: 'K', tipo: 'contiene', pista: 'Prenda de abrigo impermeable con capucha', respuesta: 'anorak' },

  { letra: 'L', tipo: 'empieza', pista: 'Fruta cítrica que se usa para hacer limonada', respuesta: 'limón' },
  { letra: 'L', tipo: 'contiene', pista: 'Ave blanca que se usa como símbolo de la paz', respuesta: 'paloma' },

  { letra: 'M', tipo: 'empieza', pista: 'Fruta redonda y roja que se come en ensaladas', respuesta: 'manzana' },
  { letra: 'M', tipo: 'contiene', pista: 'Bebida ácida que se prepara con limón y agua', respuesta: 'limonada' },

  { letra: 'N', tipo: 'empieza', pista: 'Fruta cítrica de color naranja y rica en vitamina C', respuesta: 'naranja' },
  { letra: 'N', tipo: 'contiene', pista: 'Animal marino de gran tamaño que expulsa agua por un orificio', respuesta: 'ballena' },

  { letra: 'Ñ', tipo: 'empieza', pista: 'Ave grande que no vuela y vive en Sudamérica', respuesta: 'ñandú' },
  { letra: 'Ñ', tipo: 'contiene', pista: 'Fruta tropical con corona de hojas verdes', respuesta: 'piña' },

  { letra: 'O', tipo: 'empieza', pista: 'Animal que produce lana y se cría en el campo', respuesta: 'oveja' },
  { letra: 'O', tipo: 'contiene', pista: 'Instrumento musical de viento construido en metal', respuesta: 'saxofón' },

  { letra: 'P', tipo: 'empieza', pista: 'Fruta verde con la que se prepara el guacamole', respuesta: 'palta' },
  { letra: 'P', tipo: 'contiene', pista: 'Juguete que gira sobre una punta y se hace bailar con un látigo', respuesta: 'trompo' },

  { letra: 'Q', tipo: 'empieza', pista: 'Alimento que se hace con leche y se deja curar', respuesta: 'queso' },
  { letra: 'Q', tipo: 'contiene', pista: 'Aparato que se usa para lavar la ropa', respuesta: 'máquina' },

  { letra: 'R', tipo: 'empieza', pista: 'Animal que salta y vive cerca del agua', respuesta: 'rana' },
  { letra: 'R', tipo: 'contiene', pista: 'Fruta de forma de gota, amarilla o verde', respuesta: 'pera' },

  { letra: 'S', tipo: 'empieza', pista: 'Fruta grande, verde por fuera y roja por dentro', respuesta: 'sandía' },
  { letra: 'S', tipo: 'contiene', pista: 'Ave grande que corre y no vuela', respuesta: 'avestruz' },

  { letra: 'T', tipo: 'empieza', pista: 'Fruta roja que se usa en ensaladas', respuesta: 'tomate' },
  { letra: 'T', tipo: 'contiene', pista: 'Herramienta que se usa para clavar clavos', respuesta: 'martillo' },

  { letra: 'U', tipo: 'empieza', pista: 'Fruto pequeño y redondo que crece en racimos', respuesta: 'uva' },
  { letra: 'U', tipo: 'contiene', pista: 'Objeto redondo que gira y sirve para mover vehículos', respuesta: 'rueda' },

  { letra: 'V', tipo: 'empieza', pista: 'Bebida alcohólica que se obtiene de la uva', respuesta: 'vino' },
  { letra: 'V', tipo: 'contiene', pista: 'Aparato que se usa para mirar programas', respuesta: 'televisor' },

  { letra: 'W', tipo: 'empieza', pista: 'Bebida alcohólica de grano que se toma con hielo', respuesta: 'whisky' },
  { letra: 'W', tipo: 'contiene', pista: 'Comida de dos rebanadas de pan con relleno', respuesta: 'sándwich' },

  { letra: 'X', tipo: 'empieza', pista: 'Instrumento musical de percusión con láminas', respuesta: 'xilófono' },
  { letra: 'X', tipo: 'contiene', pista: 'Radiografía que permite ver los huesos', respuesta: 'rayos X' },

  { letra: 'Y', tipo: 'empieza', pista: 'Alimento lácteo fermentado que se come con cuchara', respuesta: 'yogur' },
  { letra: 'Y', tipo: 'contiene', pista: 'Fruta tropical de pulpa naranja y semillas negras', respuesta: 'papaya' },

  { letra: 'Z', tipo: 'empieza', pista: 'Calzado que se usa para hacer deporte', respuesta: 'zapatilla' },
  { letra: 'Z', tipo: 'contiene', pista: 'Fruta pequeña y redonda de color rojo', respuesta: 'cereza' },
]

export function crearJugadoresDemo(): JugadorInicial[] {
  const porLetra = new Map<string, EntradaDemo[]>()

  for (const entrada of BANCO_DEMO) {
    const lista = porLetra.get(entrada.letra) ?? []
    lista.push(entrada)
    porLetra.set(entrada.letra, lista)
  }

  const jugadorUno: LetraRosco[] = []
  const jugadorDos: LetraRosco[] = []

  ALFABETO.forEach((letra, indice) => {
    const [primera, segunda] = porLetra.get(letra) ?? []
    if (!primera || !segunda) return

    const paraUno = indice % 2 === 0 ? primera : segunda
    const paraDos = indice % 2 === 0 ? segunda : primera

    jugadorUno.push({ ...paraUno, estado: 'pendiente' })
    jugadorDos.push({ ...paraDos, estado: 'pendiente' })
  })

  return [
    { nombre: 'Jugador 1', rosco: jugadorUno },
    { nombre: 'Jugador 2', rosco: jugadorDos },
  ]
}
