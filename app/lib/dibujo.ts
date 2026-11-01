import {
  ALFABETO,
  CANVAS_ALTO,
  CANVAS_ANCHO,
  LETRA_RADIO,
  ROSCO_CENTRO_X,
  ROSCO_CENTRO_Y,
  ROSCO_RADIO,
} from './config'

export type EstadoLetra = 'pendiente' | 'correcta' | 'error' | 'pasapalabra'

export type DatosDibujo = {
  estados: EstadoLetra[]
  letraActiva: number
  jugador: string
  segundos: number
  aciertos: number
  pista: string
}

// Rosco
const ESCALA_LETRA_ACTIVA = 1.25
const BORDE_LETRA_ACTIVA = 6

const COLOR_PENDIENTE = '#1e4fd8'
const COLOR_CORRECTA = '#22a845'
const COLOR_ERROR = '#d62839'
const COLOR_PASAPALABRA = '#f4b400'

// Textos superiores
const COLOR_TEXTO = '#ffffff'
const COLOR_CONTORNO = 'rgba(0, 0, 0, 0.85)'
const GROSOR_CONTORNO = 8
const MARGEN_TEXTO = 48
const JUGADOR_X = MARGEN_TEXTO
const JUGADOR_Y = 64
const ACIERTOS_X = MARGEN_TEXTO
const ACIERTOS_Y = 124
const RELOJ_X = CANVAS_ANCHO - MARGEN_TEXTO
const RELOJ_Y = 80
const FUENTE_JUGADOR = 'bold 52px sans-serif'
const FUENTE_ACIERTOS = 'bold 40px sans-serif'
const FUENTE_RELOJ = 'bold 84px sans-serif'

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

const COLORES: Record<EstadoLetra, string> = {
  pendiente: COLOR_PENDIENTE,
  correcta: COLOR_CORRECTA,
  error: COLOR_ERROR,
  pasapalabra: COLOR_PASAPALABRA,
}

function colorDeEstado(estado: EstadoLetra | undefined) {
  return COLORES[estado ?? 'pendiente'] ?? COLOR_PENDIENTE
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

function dibujarLetra(
  ctx: CanvasRenderingContext2D,
  letra: string,
  x: number,
  y: number,
  estado: EstadoLetra | undefined,
  activa: boolean
) {
  const radio = activa ? LETRA_RADIO * ESCALA_LETRA_ACTIVA : LETRA_RADIO

  ctx.beginPath()
  ctx.arc(x, y, radio, 0, Math.PI * 2)
  ctx.fillStyle = colorDeEstado(estado)
  ctx.fill()

  if (activa) {
    ctx.lineWidth = BORDE_LETRA_ACTIVA
    ctx.strokeStyle = COLOR_TEXTO
    ctx.stroke()
  }

  ctx.font = `bold ${Math.round(radio * 0.9)}px sans-serif`
  ctx.fillStyle = COLOR_TEXTO
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(letra, x, y)
}

function dibujarRosco(
  ctx: CanvasRenderingContext2D,
  estados: EstadoLetra[],
  letraActiva: number
) {
  const total = ALFABETO.length
  if (total === 0) return

  for (let i = 0; i < total; i += 1) {
    const angulo = -Math.PI / 2 + (Math.PI * 2 * i) / total
    const x = ROSCO_CENTRO_X + ROSCO_RADIO * Math.cos(angulo)
    const y = ROSCO_CENTRO_Y + ROSCO_RADIO * Math.sin(angulo)

    dibujarLetra(ctx, ALFABETO[i], x, y, estados[i], i === letraActiva)
  }
}

function dibujarTextoConContorno(
  ctx: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  alineacion: CanvasTextAlign
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
  ctx.fillStyle = COLOR_TEXTO
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

function dibujarTextos(ctx: CanvasRenderingContext2D, datos: DatosDibujo) {
  ctx.font = FUENTE_JUGADOR
  dibujarTextoConContorno(ctx, datos.jugador, JUGADOR_X, JUGADOR_Y, 'left')

  ctx.font = FUENTE_ACIERTOS
  dibujarTextoConContorno(ctx, `Aciertos: ${datos.aciertos}`, ACIERTOS_X, ACIERTOS_Y, 'left')

  ctx.font = FUENTE_RELOJ
  dibujarTextoConContorno(ctx, formatearReloj(datos.segundos), RELOJ_X, RELOJ_Y, 'right')

  dibujarCuadroPista(ctx, datos.pista)
}

export function dibujarFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  datos: DatosDibujo
) {
  ctx.clearRect(0, 0, CANVAS_ANCHO, CANVAS_ALTO)
  dibujarVideoCover(ctx, video)
  dibujarRosco(ctx, datos.estados, datos.letraActiva)
  dibujarTextos(ctx, datos)

  ctx.shadowBlur = 0
  ctx.shadowColor = 'transparent'
}
