import { ALFABETO, CANVAS_ALTO, CANVAS_ANCHO } from './config'

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
const CENTRO_X = 540
const CENTRO_Y = 960
const RADIO_X = 440
const RADIO_Y = 760
const RADIO_LETRA = 44
const ESCALA_LETRA_ACTIVA = 1.25
const BORDE_LETRA_ACTIVA = 6

const COLOR_PENDIENTE = '#1e4fd8'
const COLOR_CORRECTA = '#22a845'
const COLOR_ERROR = '#d62839'
const COLOR_PASAPALABRA = '#f4b400'

// Textos
const COLOR_TEXTO = '#ffffff'
const COLOR_CONTORNO = 'rgba(0, 0, 0, 0.85)'
const GROSOR_CONTORNO = 8
const FUENTE_JUGADOR = 'bold 52px sans-serif'
const FUENTE_RELOJ = 'bold 46px sans-serif'
const FUENTE_ACIERTOS = 'bold 46px sans-serif'
const FUENTE_PISTA = 'bold 40px sans-serif'
const MARGEN_TEXTO = 48
const ALTO_TEXTO_SUPERIOR = 96
const PISTA_ANCHO_MAX = 760
const PISTA_LINEAS_MAX = 3
const PISTA_ALTO_LINEA = 50

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

  const escala = Math.max(ancho / video.videoWidth, alto / video.videoHeight)
  const dibujoAncho = video.videoWidth * escala
  const dibujoAlto = video.videoHeight * escala
  const x = (ancho - dibujoAncho) / 2
  const y = (alto - dibujoAlto) / 2

  ctx.drawImage(video, x, y, dibujoAncho, dibujoAlto)
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
    const x = CENTRO_X + RADIO_X * Math.cos(angulo)
    const y = CENTRO_Y + RADIO_Y * Math.sin(angulo)

    const activa = i === letraActiva
    const radio = activa ? RADIO_LETRA * ESCALA_LETRA_ACTIVA : RADIO_LETRA

    ctx.beginPath()
    ctx.arc(x, y, radio, 0, Math.PI * 2)
    ctx.fillStyle = colorDeEstado(estados[i])
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
    ctx.fillText(ALFABETO[i], x, y)
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

function envolverTexto(
  ctx: CanvasRenderingContext2D,
  texto: string,
  anchoMax: number,
  lineasMax: number
) {
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

  if (lineas.length <= lineasMax) return lineas

  const recortadas = lineas.slice(0, lineasMax)
  let ultima = recortadas[lineasMax - 1]
  while (ultima.length > 0 && ctx.measureText(`${ultima}…`).width > anchoMax) {
    ultima = ultima.slice(0, -1)
  }
  recortadas[lineasMax - 1] = `${ultima.trimEnd()}…`
  return recortadas
}

function dibujarTextos(ctx: CanvasRenderingContext2D, datos: DatosDibujo) {
  const ancho = CANVAS_ANCHO

  ctx.font = FUENTE_JUGADOR
  dibujarTextoConContorno(ctx, datos.jugador, ancho / 2, ALTO_TEXTO_SUPERIOR, 'center')

  ctx.font = FUENTE_RELOJ
  dibujarTextoConContorno(ctx, formatearReloj(datos.segundos), MARGEN_TEXTO, ALTO_TEXTO_SUPERIOR, 'left')

  ctx.font = FUENTE_ACIERTOS
  dibujarTextoConContorno(
    ctx,
    String(datos.aciertos),
    ancho - MARGEN_TEXTO,
    ALTO_TEXTO_SUPERIOR,
    'right'
  )

  ctx.font = FUENTE_PISTA
  const lineas = envolverTexto(ctx, datos.pista, PISTA_ANCHO_MAX, PISTA_LINEAS_MAX)
  const yBase = CENTRO_Y + RADIO_Y - 170
  const yInicio = yBase - ((lineas.length - 1) * PISTA_ALTO_LINEA) / 2

  lineas.forEach((linea, indice) => {
    dibujarTextoConContorno(
      ctx,
      linea,
      CENTRO_X,
      yInicio + indice * PISTA_ALTO_LINEA,
      'center'
    )
  })
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
