import { SEGUNDOS_ALERTA_FINAL } from './config'
import type { EstadoLetra, FaseJuego, ResultadoJuego } from './juego'

// Animaciones visuales del rosco. No conocen el reducer: solo comparan los
// datos que se están mostrando contra el frame anterior.

const DURACION_CAMBIO_MS = 350
const DURACION_POP_MS = 350
const AMPLITUD_POP = 0.4
const DURACION_ENTRADA_MS = 300
const ESCALON_ENTRADA_MS = 20
const DURACION_CARTEL_MS = 350
const DESPLAZAMIENTO_CARTEL = 24
const DURACION_POP_CUENTA_MS = 300
const AMPLITUD_POP_CUENTA = 0.2
const DURACION_PULSO_RELOJ_MS = 300
const AMPLITUD_PULSO_RELOJ = 0.12
const ESCALON_FILAS_MS = 120
const DURACION_FILA_MS = 300
const PULSO_ACTIVO_BASE = 1.25
const PULSO_ACTIVO_AMPLITUD = 0.05
const FRECUENCIA_PULSO_HZ = 1.2

export type EntradaAnimaciones = {
  estados: EstadoLetra[]
  letraActiva: number
  jugador: string
  segundos: number
  fase: FaseJuego
  cartel: string | null
  cuentaRegresiva: number | null
  resultados: ResultadoJuego | null
}

export type LetraAnimada = {
  estado: EstadoLetra
  estadoAnterior: EstadoLetra | null
  // 0 = solo el estado anterior, 1 = solo el estado actual.
  mezcla: number
  // Multiplicador sobre el tamaño natural del sprite (entrada y pop).
  escala: number
  // Escala absoluta deseada para la letra activa (se mueve entre 1.2 y 1.3).
  pulso: number
  activa: boolean
  // 0..1 para el aro luminoso que respira junto al pulso.
  halo: number
}

export type Animaciones = {
  letras: LetraAnimada[]
  reloj: { alerta: boolean; escala: number }
  cartel: { alfa: number; desplazamiento: number }
  cuenta: { escala: number }
  resultados: { alfaFilas: number[] }
}

type TransicionLetra = {
  desde: EstadoLetra
  inicio: number
}

type Internas = {
  inicializado: boolean
  estados: EstadoLetra[]
  transiciones: (TransicionLetra | null)[]
  pops: number[]
  jugador: string
  fase: FaseJuego | null
  entradaEn: number | null
  cartelClave: string | null
  cartelEn: number
  cuenta: number | null
  cuentaEn: number
  segundos: number
  segundosEn: number
  finEn: number | null
}

const internas: Internas = {
  inicializado: false,
  estados: [],
  transiciones: [],
  pops: [],
  jugador: '',
  fase: null,
  entradaEn: null,
  cartelClave: null,
  cartelEn: 0,
  cuenta: null,
  cuentaEn: 0,
  segundos: 0,
  segundosEn: 0,
  finEn: null,
}

function easeOutCubic(progreso: number) {
  const restante = 1 - Math.min(1, Math.max(0, progreso))
  return 1 - restante * restante * restante
}

function claveCartel(datos: EntradaAnimaciones) {
  if (datos.cartel === null) return null
  return `${datos.fase}|${datos.cartel}`
}

export function actualizarAnimaciones(
  datos: EntradaAnimaciones,
  ahora: number = performance.now()
): Animaciones {
  const total = datos.estados.length

  if (!internas.inicializado) {
    internas.inicializado = true
    internas.estados = datos.estados.slice()
    internas.transiciones = new Array(total).fill(null)
    internas.pops = new Array(total).fill(0)
    internas.jugador = datos.jugador
    internas.fase = datos.fase
    internas.cartelClave = claveCartel(datos)
    internas.cartelEn = ahora
    internas.cuenta = datos.cuentaRegresiva
    internas.cuentaEn = ahora
    internas.segundos = datos.segundos
    internas.segundosEn = ahora
    internas.finEn = datos.fase === 'fin' ? ahora : null
  } else {
    const cambioJugador = internas.jugador !== datos.jugador
    const entraCuentaDesdeListo =
      datos.fase === 'cuentaRegresiva' && internas.fase === 'listo'
    const reiniciarRosco = cambioJugador || entraCuentaDesdeListo

    if (reiniciarRosco) {
      // El rosco cambió de jugador: entrada escalonada sin transiciones de color.
      internas.entradaEn = ahora
      internas.transiciones = new Array(total).fill(null)
      internas.pops = new Array(total).fill(0)
    } else if (internas.estados.length !== total) {
      internas.transiciones = new Array(total).fill(null)
      internas.pops = new Array(total).fill(0)
    } else {
      for (let i = 0; i < total; i += 1) {
        const anterior = internas.estados[i]
        const actual = datos.estados[i]
        if (anterior === undefined || anterior === actual) continue

        internas.transiciones[i] = { desde: anterior, inicio: ahora }
        if (
          actual === 'correcta' ||
          actual === 'error' ||
          actual === 'pasapalabra'
        ) {
          internas.pops[i] = ahora
        }
      }
    }

    const claveActual = claveCartel(datos)
    if (claveActual !== null && claveActual !== internas.cartelClave) {
      internas.cartelClave = claveActual
      internas.cartelEn = ahora
    } else if (claveActual === null) {
      internas.cartelClave = null
    }

    if (datos.cuentaRegresiva !== internas.cuenta) {
      internas.cuenta = datos.cuentaRegresiva
      internas.cuentaEn = ahora
    }

    if (datos.segundos !== internas.segundos) {
      internas.segundos = datos.segundos
      internas.segundosEn = ahora
    }

    if (datos.fase === 'fin') {
      if (internas.finEn === null) internas.finEn = ahora
    } else {
      internas.finEn = null
    }
  }

  internas.estados = datos.estados.slice()
  internas.jugador = datos.jugador
  internas.fase = datos.fase

  if (internas.entradaEn !== null) {
    const duracionTotal =
      DURACION_ENTRADA_MS + Math.max(0, total - 1) * ESCALON_ENTRADA_MS
    if (ahora - internas.entradaEn > duracionTotal) {
      internas.entradaEn = null
    }
  }

  const segundosAnimacion = ahora / 1000
  const fasePulso = 2 * Math.PI * FRECUENCIA_PULSO_HZ * segundosAnimacion
  const pulsoActivo = PULSO_ACTIVO_BASE + PULSO_ACTIVO_AMPLITUD * Math.sin(fasePulso)
  const haloActivo = 0.5 + 0.5 * Math.sin(fasePulso)

  const letras: LetraAnimada[] = []

  for (let i = 0; i < total; i += 1) {
    const estado = datos.estados[i] ?? 'pendiente'

    let estadoAnterior: EstadoLetra | null = null
    let mezcla = 1
    const transicion = internas.transiciones[i]
    if (transicion) {
      const progreso = (ahora - transicion.inicio) / DURACION_CAMBIO_MS
      if (progreso >= 1) {
        internas.transiciones[i] = null
      } else {
        estadoAnterior = transicion.desde
        mezcla = Math.max(0, progreso)
      }
    }

    let pop = 1
    const popInicio = internas.pops[i] ?? 0
    if (popInicio > 0) {
      const progreso = (ahora - popInicio) / DURACION_POP_MS
      if (progreso >= 1) {
        internas.pops[i] = 0
      } else if (progreso >= 0) {
        pop = 1 + AMPLITUD_POP * Math.sin(Math.PI * progreso)
      }
    }

    let entrada = 1
    if (internas.entradaEn !== null) {
      const inicio = internas.entradaEn + i * ESCALON_ENTRADA_MS
      const progreso = (ahora - inicio) / DURACION_ENTRADA_MS
      if (progreso <= 0) {
        entrada = 0
      } else if (progreso < 1) {
        entrada = easeOutCubic(progreso)
      }
    }

    const activa = i === datos.letraActiva
    letras.push({
      estado,
      estadoAnterior,
      mezcla,
      escala: entrada * pop,
      pulso: activa ? pulsoActivo : 1,
      activa,
      halo: activa ? haloActivo : 0,
    })
  }

  const alerta =
    datos.fase === 'jugando' && datos.segundos <= SEGUNDOS_ALERTA_FINAL
  let escalaReloj = 1
  if (alerta) {
    const progreso = (ahora - internas.segundosEn) / DURACION_PULSO_RELOJ_MS
    if (progreso >= 0 && progreso < 1) {
      escalaReloj = 1 + AMPLITUD_PULSO_RELOJ * Math.sin(Math.PI * progreso)
    }
  }

  const progresoCartel = Math.min(
    1,
    Math.max(0, (ahora - internas.cartelEn) / DURACION_CARTEL_MS)
  )
  const alfaCartel = easeOutCubic(progresoCartel)

  let escalaCuenta = 1
  if (datos.cuentaRegresiva !== null) {
    const progreso = (ahora - internas.cuentaEn) / DURACION_POP_CUENTA_MS
    if (progreso >= 0 && progreso < 1) {
      escalaCuenta = 1 + AMPLITUD_POP_CUENTA * Math.sin(Math.PI * progreso)
    }
  }

  const alfaFilas: number[] = []
  if (internas.finEn !== null) {
    const filas = datos.resultados?.filas.length ?? 0
    for (let i = 0; i < filas; i += 1) {
      const inicio = internas.finEn + i * ESCALON_FILAS_MS
      alfaFilas.push(
        easeOutCubic((ahora - inicio) / DURACION_FILA_MS)
      )
    }
  }

  return {
    letras,
    reloj: { alerta, escala: escalaReloj },
    cartel: {
      alfa: alfaCartel,
      desplazamiento: (1 - alfaCartel) * DESPLAZAMIENTO_CARTEL,
    },
    cuenta: { escala: escalaCuenta },
    resultados: { alfaFilas },
  }
}
