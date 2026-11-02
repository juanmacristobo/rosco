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
  aciertos: number
  enTurno: boolean
}

export type DatosDibujo = {
  estados: EstadoLetra[]
  letraActiva: number
  jugador: string
  segundos: number
  aciertos: number
  pista: string
  fase: FaseJuego
  marcador: MarcadorJugador[]
  cartel: string | null
  cuentaRegresiva: number | null
  resultados: ResultadoJuego | null
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
const COLOR_TEXTO_SECUNDARIO = 'rgba(255, 255, 255, 0.75)'
const COLOR_DESTACADO = '#ffd60a'
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

// Marcador
const MARCADOR_X = MARGEN_TEXTO
const MARCADOR_Y = 172
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
    const texto = `${prefijo}${jugador.nombre}  ${formatearReloj(jugador.segundos)}  ·  ${jugador.aciertos} aciertos`
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

function dibujarTextos(ctx: CanvasRenderingContext2D, datos: DatosDibujo) {
  ctx.font = FUENTE_JUGADOR
  dibujarTextoConContorno(ctx, datos.jugador, JUGADOR_X, JUGADOR_Y, 'left')

  ctx.font = FUENTE_ACIERTOS
  dibujarTextoConContorno(ctx, `Aciertos: ${datos.aciertos}`, ACIERTOS_X, ACIERTOS_Y, 'left')

  ctx.font = FUENTE_RELOJ
  dibujarTextoConContorno(ctx, formatearReloj(datos.segundos), RELOJ_X, RELOJ_Y, 'right')

  dibujarMarcador(ctx, datos.marcador)
  if (datos.pista) dibujarCuadroPista(ctx, datos.pista)
}

function dibujarCartel(ctx: CanvasRenderingContext2D, datos: DatosDibujo) {
  if (!datos.cartel) return

  if (datos.fase === 'cuentaRegresiva') {
    ctx.fillStyle = COLOR_FONDO_OSCURO
    ctx.fillRect(0, 0, CANVAS_ANCHO, CANVAS_ALTO)
    ctx.font = FUENTE_CARTEL
    dibujarTextoConContorno(ctx, datos.cartel, CANVAS_ANCHO / 2, CARTEL_Y, 'center')
  }

  if (datos.fase === 'esperandoTurno') {
    ctx.font = FUENTE_CARTEL_ESPERA
    dibujarTextoConContorno(
      ctx,
      datos.cartel,
      CANVAS_ANCHO / 2,
      CARTEL_ESPERA_Y,
      'center'
    )
  }
}

function dibujarCuentaRegresiva(ctx: CanvasRenderingContext2D, datos: DatosDibujo) {
  if (datos.cuentaRegresiva === null) return

  ctx.font = FUENTE_CUENTA
  dibujarTextoConContorno(
    ctx,
    String(datos.cuentaRegresiva),
    CANVAS_ANCHO / 2,
    CUENTA_Y,
    'center'
  )
}

function dibujarResultados(ctx: CanvasRenderingContext2D, datos: DatosDibujo) {
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
  ctx.clearRect(0, 0, CANVAS_ANCHO, CANVAS_ALTO)
  dibujarVideoCover(ctx, video)

  if (datos.fase !== 'fin') {
    dibujarRosco(ctx, datos.estados, datos.letraActiva)
    dibujarTextos(ctx, datos)
    dibujarCartel(ctx, datos)
    dibujarCuentaRegresiva(ctx, datos)
  } else {
    dibujarResultados(ctx, datos)
  }

  ctx.shadowBlur = 0
  ctx.shadowColor = 'transparent'
}
