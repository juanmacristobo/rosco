import {
  actualizarAnimaciones,
  type Animaciones,
  type LetraAnimada,
} from './animaciones'
import {
  ALFABETO,
  CANVAS_ALTO,
  CANVAS_ANCHO,
  LETRA_RADIO,
  ROSCO_CENTRO_X,
  ROSCO_CENTRO_Y,
  ROSCO_RADIO,
} from './config'
import type { EstadoLetra, FaseJuego, ResultadoJuego } from './juego'

export type MarcadorJugador = {
  nombre: string
  segundos: number
  enTurno: boolean
}

export type DatosDibujo = {
  estados: EstadoLetra[]
  letraActiva: number
  jugador: string
  segundos: number
  pista: string
  fase: FaseJuego
  marcador: MarcadorJugador[]
  cartel: string | null
  cuentaRegresiva: number | null
  resultados: ResultadoJuego | null
}

// Rosco: todo el aspecto visual de las letras se ajusta desde este objeto.
export type TemaRosco = {
  radio: number
  escalaActiva: number
  tipografia: string
  letra: {
    peso: string
    escala: number
    color: string
    offsetY: number
    sombra: string
    sombraDifuminado: number
    sombraOffsetY: number
  }
  borde: { color: string; grosor: number }
  bordeActivo: { color: string; grosor: number }
  // La sombra se usa solo al pre-renderizar los sprites, nunca por frame.
  sombra: { color: string; difuminado: number; offsetY: number }
  brillo: { color: string; colorFin: string; hasta: number }
  estados: Record<EstadoLetra, { centro: string; borde: string }>
}

export const TEMA: TemaRosco = {
  radio: LETRA_RADIO,
  escalaActiva: 1.25,
  tipografia: 'sans-serif',
  letra: {
    peso: 'bold',
    escala: 0.92,
    color: '#ffffff',
    offsetY: 1,
    sombra: 'rgba(0, 0, 0, 0.3)',
    sombraDifuminado: 4,
    sombraOffsetY: 2,
  },
  borde: { color: 'rgba(255, 226, 163, 0.95)', grosor: 2.5 },
  bordeActivo: { color: '#ffd75e', grosor: 7 },
  sombra: { color: 'rgba(0, 0, 0, 0.45)', difuminado: 10, offsetY: 4 },
  brillo: {
    color: 'rgba(255, 255, 255, 0.24)',
    colorFin: 'rgba(255, 255, 255, 0)',
    hasta: 0.58,
  },
  estados: {
    pendiente: { centro: '#2f6ae0', borde: '#123a8f' },
    correcta: { centro: '#4bdc7a', borde: '#128a3c' },
    error: { centro: '#ff5a66', borde: '#a11224' },
    pasapalabra: { centro: '#ffd257', borde: '#a87200' },
  },
}


// Textos superiores
const COLOR_TEXTO = '#ffffff'
const COLOR_TEXTO_SECUNDARIO = 'rgba(255, 255, 255, 0.75)'
const COLOR_DESTACADO = '#ffd60a'
const COLOR_RELOJ_ALERTA = '#ff3b30'
const COLOR_CONTORNO = 'rgba(0, 0, 0, 0.85)'
const GROSOR_CONTORNO = 8
const MARGEN_TEXTO = 48
const JUGADOR_X = MARGEN_TEXTO
const JUGADOR_Y = 64
const RELOJ_X = CANVAS_ANCHO - MARGEN_TEXTO
const RELOJ_Y = 80
const FUENTE_JUGADOR = 'bold 52px sans-serif'
const FUENTE_RELOJ = 'bold 84px sans-serif'

// Marcador
const MARCADOR_X = MARGEN_TEXTO
const MARCADOR_Y = 124
const MARCADOR_ALTO = 36
const FUENTE_MARCADOR = 'bold 26px sans-serif'

// Cuadro de la pista
const PISTA_CENTRO_X = 960
const PISTA_ANCHO = 1400
const PISTA_ALTO = 170
const PISTA_Y = 872
const PISTA_PADDING = 24
const PISTA_RADIO_ESQUINA = 28
const PISTA_FUENTE_INICIAL = 44
const PISTA_FUENTE_MINIMA = 32
const PISTA_INTERLINEADO = 1.2
const PISTA_LINEAS_MAX = 3
const COLOR_FONDO_PISTA = 'rgba(0, 0, 0, 0.65)'

// Cuenta regresiva y carteles
const COLOR_FONDO_OSCURO = 'rgba(0, 0, 0, 0.55)'
const CARTEL_Y = 300
const CARTEL_ESPERA_Y = 540
const FUENTE_CARTEL = 'bold 78px sans-serif'
const FUENTE_CARTEL_ESPERA = 'bold 84px sans-serif'
const FUENTE_CUENTA = 'bold 300px sans-serif'
const CUENTA_Y = 610

// Resultados
const COLOR_FONDO_RESULTADOS = 'rgba(0, 0, 0, 0.88)'
const RESULTADOS_TITULO_Y = 150
const RESULTADOS_INICIO_Y = 300
const RESULTADOS_ALTO_LINEA = 84
const RESULTADOS_NOMBRE_X = 360
const RESULTADOS_ACIERTOS_X = 1120
const RESULTADOS_ERRORES_X = 1360
const RESULTADOS_TIEMPO_X = 1780
const RESULTADOS_MENSAJE_Y = 860

const ESTADOS_LETRA: EstadoLetra[] = [
  'pendiente',
  'correcta',
  'error',
  'pasapalabra',
]

type SpriteLetra = { canvas: HTMLCanvasElement; lado: number }

let cacheSprites: { firma: string; sprites: Map<string, SpriteLetra> } | null = null

function claveSprite(letra: string, estado: EstadoLetra, activa: boolean) {
  return `${letra}|${estado}|${activa ? 'activa' : 'normal'}`
}

function crearSprite(
  letra: string,
  estado: EstadoLetra,
  activa: boolean
): SpriteLetra {
  const radio = activa ? TEMA.radio * TEMA.escalaActiva : TEMA.radio
  const grosorBorde = activa ? TEMA.bordeActivo.grosor : TEMA.borde.grosor
  const margen = Math.ceil(
    grosorBorde / 2 +
      TEMA.sombra.difuminado +
      Math.max(0, TEMA.sombra.offsetY) +
      2
  )
  const lado = Math.ceil((radio + margen) * 2)
  const canvas = document.createElement('canvas')
  canvas.width = lado
  canvas.height = lado

  const c = canvas.getContext('2d')
  if (!c) return { canvas, lado }

  const cx = lado / 2
  const cy = lado / 2
  const colores = TEMA.estados[estado]

  // Relleno con degradado radial y sombra (solo al pre-renderizar).
  c.save()
  c.shadowColor = TEMA.sombra.color
  c.shadowBlur = TEMA.sombra.difuminado
  c.shadowOffsetY = TEMA.sombra.offsetY
  const degradado = c.createRadialGradient(
    cx,
    cy - radio * 0.15,
    radio * 0.1,
    cx,
    cy,
    radio
  )
  degradado.addColorStop(0, colores.centro)
  degradado.addColorStop(1, colores.borde)
  c.fillStyle = degradado
  c.beginPath()
  c.arc(cx, cy, radio, 0, Math.PI * 2)
  c.fill()
  c.restore()

  // Leve brillo interno en la parte superior.
  c.save()
  c.beginPath()
  c.arc(cx, cy, radio, 0, Math.PI * 2)
  c.clip()
  const brillo = c.createLinearGradient(0, cy - radio, 0, cy + radio)
  brillo.addColorStop(0, TEMA.brillo.color)
  brillo.addColorStop(TEMA.brillo.hasta, TEMA.brillo.colorFin)
  c.fillStyle = brillo
  c.fillRect(cx - radio, cy - radio, radio * 2, radio * 2)
  c.restore()

  // Aro exterior: fino y claro en reposo, dorado y grueso en la letra activa.
  c.lineWidth = grosorBorde
  c.strokeStyle = activa ? TEMA.bordeActivo.color : TEMA.borde.color
  c.beginPath()
  c.arc(cx, cy, radio, 0, Math.PI * 2)
  c.stroke()

  // Letra blanca centrada.
  c.font = `${TEMA.letra.peso} ${Math.round(
    radio * TEMA.letra.escala
  )}px ${TEMA.tipografia}`
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  c.fillStyle = TEMA.letra.color
  if (TEMA.letra.sombraDifuminado > 0) {
    c.shadowColor = TEMA.letra.sombra
    c.shadowBlur = TEMA.letra.sombraDifuminado
    c.shadowOffsetY = TEMA.letra.sombraOffsetY
  }
  c.fillText(letra, cx, cy + TEMA.letra.offsetY)
  c.shadowBlur = 0
  c.shadowColor = 'transparent'

  return { canvas, lado }
}

// Los sprites se generan una sola vez y se rehacen solo si cambia TEMA.
function asegurarSprites(): Map<string, SpriteLetra> | null {
  if (typeof document === 'undefined') return null

  const firma = JSON.stringify(TEMA)
  if (cacheSprites && cacheSprites.firma === firma) return cacheSprites.sprites

  const sprites = new Map<string, SpriteLetra>()
  for (const letra of ALFABETO) {
    for (const estado of ESTADOS_LETRA) {
      sprites.set(
        claveSprite(letra, estado, false),
        crearSprite(letra, estado, false)
      )
      sprites.set(
        claveSprite(letra, estado, true),
        crearSprite(letra, estado, true)
      )
    }
  }

  cacheSprites = { firma, sprites }
  return sprites
}

function dibujarVideoCover(ctx: CanvasRenderingContext2D, video: HTMLVideoElement) {
  const ancho = CANVAS_ANCHO
  const alto = CANVAS_ALTO

  if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, ancho, alto)
    return
  }

  // Funciona tanto con streams verticales como horizontales: se escala al
  // máximo y se recorta centrado, sin deformar.
  const escala = Math.max(ancho / video.videoWidth, alto / video.videoHeight)
  const dibujoAncho = video.videoWidth * escala
  const dibujoAlto = video.videoHeight * escala
  const x = (ancho - dibujoAncho) / 2
  const y = (alto - dibujoAlto) / 2

  ctx.drawImage(video, x, y, dibujoAncho, dibujoAlto)
}

function dibujarSprite(
  ctx: CanvasRenderingContext2D,
  sprite: SpriteLetra,
  x: number,
  y: number,
  escala: number
) {
  if (escala <= 0) return

  const lado = sprite.lado * escala
  ctx.drawImage(sprite.canvas, x - lado / 2, y - lado / 2, lado, lado)
}

function dibujarLetra(
  ctx: CanvasRenderingContext2D,
  letra: string,
  x: number,
  y: number,
  info: LetraAnimada,
  sprites: Map<string, SpriteLetra>
) {
  const factorActiva = info.activa ? info.pulso / TEMA.escalaActiva : 1
  const escala = info.escala * factorActiva
  if (escala <= 0) return

  // Transición de color: el estado anterior queda debajo y el nuevo se
  // dibuja encima con globalAlpha creciente.
  if (info.estadoAnterior) {
    const anterior = sprites.get(
      claveSprite(letra, info.estadoAnterior, info.activa)
    )
    if (anterior) dibujarSprite(ctx, anterior, x, y, escala)
  }

  const actual = sprites.get(claveSprite(letra, info.estado, info.activa))
  if (actual) {
    ctx.globalAlpha = info.estadoAnterior ? info.mezcla : 1
    dibujarSprite(ctx, actual, x, y, escala)
    ctx.globalAlpha = 1
  }

  // Aro luminoso que respira junto con el pulso de la letra activa.
  if (info.activa && info.halo > 0) {
    const radio = TEMA.radio * info.pulso * info.escala
    ctx.globalAlpha = info.halo * 0.55
    ctx.lineWidth = 2
    ctx.strokeStyle = TEMA.bordeActivo.color
    ctx.beginPath()
    ctx.arc(x, y, radio + 3, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 1
  }
}

function dibujarRosco(
  ctx: CanvasRenderingContext2D,
  anim: Animaciones
) {
  const total = ALFABETO.length
  if (total === 0) return

  const sprites = asegurarSprites()
  if (!sprites) return

  for (let i = 0; i < total; i += 1) {
    const angulo = -Math.PI / 2 + (Math.PI * 2 * i) / total
    const x = ROSCO_CENTRO_X + ROSCO_RADIO * Math.cos(angulo)
    const y = ROSCO_CENTRO_Y + ROSCO_RADIO * Math.sin(angulo)

    const info = anim.letras[i]
    if (info) dibujarLetra(ctx, ALFABETO[i], x, y, info, sprites)
  }
}

function dibujarTextoConContorno(
  ctx: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  alineacion: CanvasTextAlign,
  color: string = COLOR_TEXTO
) {
  ctx.textAlign = alineacion
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.miterLimit = 2
  ctx.shadowColor = COLOR_CONTORNO
  ctx.shadowBlur = 10
  ctx.lineWidth = GROSOR_CONTORNO
  ctx.strokeStyle = COLOR_CONTORNO
  ctx.strokeText(texto, x, y)
  ctx.shadowBlur = 0
  ctx.fillStyle = color
  ctx.fillText(texto, x, y)
}

function formatearReloj(segundos: number) {
  const total = Math.max(0, Math.floor(segundos))
  const minutos = Math.floor(total / 60)
  const resto = total % 60
  return `${String(minutos).padStart(2, '0')}:${String(resto).padStart(2, '0')}`
}

function envolverTexto(ctx: CanvasRenderingContext2D, texto: string, anchoMax: number) {
  const palabras = texto.split(/\s+/).filter(Boolean)
  const lineas: string[] = []
  let lineaActual = ''

  for (const palabra of palabras) {
    const candidata = lineaActual ? `${lineaActual} ${palabra}` : palabra
    if (ctx.measureText(candidata).width <= anchoMax || !lineaActual) {
      lineaActual = candidata
      continue
    }

    lineas.push(lineaActual)
    lineaActual = palabra
  }

  if (lineaActual) lineas.push(lineaActual)
  return lineas
}

function recortarLineas(
  ctx: CanvasRenderingContext2D,
  lineas: string[],
  anchoMax: number
) {
  if (lineas.length <= PISTA_LINEAS_MAX) return lineas

  const recortadas = lineas.slice(0, PISTA_LINEAS_MAX)
  let ultima = recortadas[PISTA_LINEAS_MAX - 1]
  while (ultima.length > 0 && ctx.measureText(`${ultima}…`).width > anchoMax) {
    ultima = ultima.slice(0, -1)
  }
  recortadas[PISTA_LINEAS_MAX - 1] = `${ultima.trimEnd()}…`
  return recortadas
}

function calcularDisposicionPista(ctx: CanvasRenderingContext2D, texto: string) {
  const anchoMax = PISTA_ANCHO - PISTA_PADDING * 2
  const altoMax = PISTA_ALTO - PISTA_PADDING * 2

  for (let tam = PISTA_FUENTE_INICIAL; tam >= PISTA_FUENTE_MINIMA; tam -= 2) {
    ctx.font = `bold ${tam}px sans-serif`
    const lineas = envolverTexto(ctx, texto, anchoMax)
    const altoLinea = tam * PISTA_INTERLINEADO

    if (lineas.length <= PISTA_LINEAS_MAX && lineas.length * altoLinea <= altoMax) {
      return { lineas, altoLinea }
    }
  }

  const tam = PISTA_FUENTE_MINIMA
  ctx.font = `bold ${tam}px sans-serif`
  const lineas = recortarLineas(ctx, envolverTexto(ctx, texto, anchoMax), anchoMax)

  return { lineas, altoLinea: tam * PISTA_INTERLINEADO }
}

function caminoRectanguloRedondeado(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ancho: number,
  alto: number,
  radio: number
) {
  const r = Math.min(radio, ancho / 2, alto / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + ancho, y, x + ancho, y + alto, r)
  ctx.arcTo(x + ancho, y + alto, x, y + alto, r)
  ctx.arcTo(x, y + alto, x, y, r)
  ctx.arcTo(x, y, x + ancho, y, r)
  ctx.closePath()
}

function dibujarCuadroPista(ctx: CanvasRenderingContext2D, texto: string) {
  const x = PISTA_CENTRO_X - PISTA_ANCHO / 2

  caminoRectanguloRedondeado(
    ctx,
    x,
    PISTA_Y,
    PISTA_ANCHO,
    PISTA_ALTO,
    PISTA_RADIO_ESQUINA
  )
  ctx.fillStyle = COLOR_FONDO_PISTA
  ctx.fill()

  const { lineas, altoLinea } = calcularDisposicionPista(ctx, texto)
  if (lineas.length === 0) return

  const altoTotal = lineas.length * altoLinea
  const yInicio = PISTA_Y + PISTA_ALTO / 2 - altoTotal / 2 + altoLinea / 2

  ctx.fillStyle = COLOR_TEXTO
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  lineas.forEach((linea, indice) => {
    ctx.fillText(linea, PISTA_CENTRO_X, yInicio + indice * altoLinea)
  })
}

function dibujarMarcador(ctx: CanvasRenderingContext2D, marcador: MarcadorJugador[]) {
  ctx.font = FUENTE_MARCADOR

  marcador.forEach((jugador, indice) => {
    const y = MARCADOR_Y + indice * MARCADOR_ALTO
    const prefijo = jugador.enTurno ? '▶ ' : '   '
    const texto = `${prefijo}${jugador.nombre}  ${formatearReloj(jugador.segundos)}`
    dibujarTextoConContorno(
      ctx,
      texto,
      MARCADOR_X,
      y,
      'left',
      jugador.enTurno ? COLOR_DESTACADO : COLOR_TEXTO_SECUNDARIO
    )
  })
}

function dibujarTextos(
  ctx: CanvasRenderingContext2D,
  datos: DatosDibujo,
  anim: Animaciones
) {
  ctx.font = FUENTE_JUGADOR
  dibujarTextoConContorno(ctx, datos.jugador, JUGADOR_X, JUGADOR_Y, 'left')

  ctx.save()
  ctx.translate(RELOJ_X, RELOJ_Y)
  ctx.scale(anim.reloj.escala, anim.reloj.escala)
  ctx.font = FUENTE_RELOJ
  dibujarTextoConContorno(
    ctx,
    formatearReloj(datos.segundos),
    0,
    0,
    'right',
    anim.reloj.alerta ? COLOR_RELOJ_ALERTA : COLOR_TEXTO
  )
  ctx.restore()

  dibujarMarcador(ctx, datos.marcador)
  if (datos.pista) dibujarCuadroPista(ctx, datos.pista)
}

function dibujarCartel(
  ctx: CanvasRenderingContext2D,
  datos: DatosDibujo,
  anim: Animaciones
) {
  if (!datos.cartel) return

  ctx.save()
  ctx.globalAlpha = anim.cartel.alfa

  if (datos.fase === 'cuentaRegresiva') {
    ctx.fillStyle = COLOR_FONDO_OSCURO
    ctx.fillRect(0, 0, CANVAS_ANCHO, CANVAS_ALTO)
    ctx.font = FUENTE_CARTEL
    dibujarTextoConContorno(
      ctx,
      datos.cartel,
      CANVAS_ANCHO / 2,
      CARTEL_Y + anim.cartel.desplazamiento,
      'center'
    )
  }

  if (datos.fase === 'esperandoTurno') {
    ctx.font = FUENTE_CARTEL_ESPERA
    dibujarTextoConContorno(
      ctx,
      datos.cartel,
      CANVAS_ANCHO / 2,
      CARTEL_ESPERA_Y + anim.cartel.desplazamiento,
      'center'
    )
  }

  ctx.restore()
}

function dibujarCuentaRegresiva(
  ctx: CanvasRenderingContext2D,
  datos: DatosDibujo,
  anim: Animaciones
) {
  if (datos.cuentaRegresiva === null) return

  ctx.save()
  ctx.translate(CANVAS_ANCHO / 2, CUENTA_Y)
  ctx.scale(anim.cuenta.escala, anim.cuenta.escala)
  ctx.font = FUENTE_CUENTA
  dibujarTextoConContorno(ctx, String(datos.cuentaRegresiva), 0, 0, 'center')
  ctx.restore()
}

function dibujarResultados(
  ctx: CanvasRenderingContext2D,
  datos: DatosDibujo,
  anim: Animaciones
) {
  ctx.fillStyle = COLOR_FONDO_RESULTADOS
  ctx.fillRect(0, 0, CANVAS_ANCHO, CANVAS_ALTO)

  ctx.font = 'bold 76px sans-serif'
  dibujarTextoConContorno(ctx, 'Resultados', CANVAS_ANCHO / 2, RESULTADOS_TITULO_Y, 'center')

  const resultados = datos.resultados
  if (!resultados) return

  resultados.filas.forEach((fila, indice) => {
    const y = RESULTADOS_INICIO_Y + indice * RESULTADOS_ALTO_LINEA
    const destacado = !resultados.empate && fila.nombre === resultados.ganador
    const color = destacado ? COLOR_DESTACADO : COLOR_TEXTO

    ctx.save()
    ctx.globalAlpha = anim.resultados.alfaFilas[indice] ?? 1

    ctx.font = 'bold 44px sans-serif'
    dibujarTextoConContorno(
      ctx,
      `${indice + 1}. ${fila.nombre}`,
      RESULTADOS_NOMBRE_X,
      y,
      'left',
      color
    )
    dibujarTextoConContorno(
      ctx,
      `${fila.aciertos} aciertos`,
      RESULTADOS_ACIERTOS_X,
      y,
      'left',
      color
    )
    dibujarTextoConContorno(
      ctx,
      `${fila.errores} errores`,
      RESULTADOS_ERRORES_X,
      y,
      'left',
      color
    )
    dibujarTextoConContorno(
      ctx,
      formatearReloj(Math.ceil(fila.tiempoRestanteMs / 1000)),
      RESULTADOS_TIEMPO_X,
      y,
      'right',
      color
    )

    ctx.restore()
  })

  const mensaje =
    resultados.filas.length === 0
      ? 'Sin jugadores'
      : resultados.empate
        ? 'Empate'
        : `Gana ${resultados.ganador}`

  ctx.font = 'bold 72px sans-serif'
  dibujarTextoConContorno(
    ctx,
    mensaje,
    CANVAS_ANCHO / 2,
    RESULTADOS_MENSAJE_Y,
    'center',
    resultados.empate ? COLOR_TEXTO : COLOR_DESTACADO
  )
}

export function dibujarFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  datos: DatosDibujo
) {
  const anim = actualizarAnimaciones(datos)

  ctx.clearRect(0, 0, CANVAS_ANCHO, CANVAS_ALTO)
  dibujarVideoCover(ctx, video)

  if (datos.fase !== 'fin') {
    dibujarRosco(ctx, anim)
    dibujarTextos(ctx, datos, anim)
    dibujarCartel(ctx, datos, anim)
    dibujarCuentaRegresiva(ctx, datos, anim)
  } else {
    dibujarResultados(ctx, datos, anim)
  }

  ctx.shadowBlur = 0
  ctx.shadowColor = 'transparent'
}
