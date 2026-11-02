import {
  COLA_TURNO_MS,
  CUENTA_REGRESIVA_MS,
  DELTA_MAX_TICK_MS,
  TIEMPO_POR_JUGADOR_MS,
} from './config'

export type EstadoLetra = 'pendiente' | 'correcta' | 'error' | 'pasapalabra'
export type TipoPista = 'empieza' | 'contiene'

export type LetraRosco = {
  letra: string
  tipo: TipoPista
  pista: string
  respuesta: string
  estado: EstadoLetra
}

export type Jugador = {
  nombre: string
  rosco: LetraRosco[]
  tiempoRestanteMs: number
  letraActual: number
  terminado: boolean
}

export type FaseJuego =
  | 'listo'
  | 'cuentaRegresiva'
  | 'jugando'
  | 'cola'
  | 'esperandoTurno'
  | 'fin'

export type Juego = {
  fase: FaseJuego
  jugadores: Jugador[]
  turno: number
  proximoTurno: number | null
  ultimoTs: number | null
  finFaseTs: number | null
}

export type AccionJuego =
  | { tipo: 'INICIAR'; ahora: number }
  | { tipo: 'CORRECTA'; ahora: number }
  | { tipo: 'ERROR'; ahora: number }
  | { tipo: 'PASAPALABRA'; ahora: number }
  | { tipo: 'TICK'; ahora: number }
  | { tipo: 'SIGUIENTE_TURNO'; ahora: number }
  | { tipo: 'REINICIAR' }

export type FilaResultado = {
  nombre: string
  aciertos: number
  errores: number
  tiempoRestanteMs: number
}

export type ResultadoJuego = {
  filas: FilaResultado[]
  ganador: string | null
  empate: boolean
}

export type JugadorInicial = {
  nombre: string
  rosco: LetraRosco[]
}

export function contarAciertos(jugador: Jugador): number {
  return jugador.rosco.filter((letra) => letra.estado === 'correcta').length
}

function contarErrores(jugador: Jugador): number {
  return jugador.rosco.filter((letra) => letra.estado === 'error').length
}

export function crearJuego(jugadores: JugadorInicial[]): Juego {
  return {
    fase: 'listo',
    jugadores: jugadores.map(({ nombre, rosco }) => ({
      nombre,
      rosco: rosco.map((letra) => ({ ...letra, estado: 'pendiente' as const })),
      tiempoRestanteMs: TIEMPO_POR_JUGADOR_MS,
      letraActual: 0,
      terminado: false,
    })),
    turno: 0,
    proximoTurno: null,
    ultimoTs: null,
    finFaseTs: null,
  }
}

function proximaLetra(rosco: LetraRosco[], desde: number): number {
  const total = rosco.length
  if (total === 0) return -1

  for (let salto = 0; salto < total; salto += 1) {
    const indice = (desde + salto) % total
    const estado = rosco[indice].estado
    if (estado === 'pendiente' || estado === 'pasapalabra') return indice
  }

  return -1
}

function avanzar(jugador: Jugador): Jugador {
  const siguiente = proximaLetra(jugador.rosco, jugador.letraActual + 1)
  if (siguiente === -1) return { ...jugador, terminado: true }
  return { ...jugador, letraActual: siguiente }
}

function buscarProximoTurno(jugadores: Jugador[], turno: number): number | null {
  const total = jugadores.length
  if (total === 0) return null

  for (let salto = 1; salto <= total; salto += 1) {
    const indice = (turno + salto) % total
    if (!jugadores[indice].terminado) return indice
  }

  return null
}

function cerrarTurno(juego: Juego, ahora: number): Juego {
  return {
    ...juego,
    fase: 'cola',
    proximoTurno: buscarProximoTurno(juego.jugadores, juego.turno),
    finFaseTs: ahora + COLA_TURNO_MS,
    ultimoTs: null,
  }
}

function descontarReloj(
  juego: Juego,
  ahora: number
): { juego: Juego; agotado: boolean } {
  const jugador = juego.jugadores[juego.turno]
  if (!jugador) return { juego, agotado: false }

  const delta =
    juego.ultimoTs === null
      ? 0
      : Math.min(Math.max(0, ahora - juego.ultimoTs), DELTA_MAX_TICK_MS)
  const tiempoRestanteMs = Math.max(0, jugador.tiempoRestanteMs - delta)

  const jugadores = juego.jugadores.map((actual, indice) => {
    if (indice !== juego.turno) return actual
    if (tiempoRestanteMs <= 0) {
      return { ...actual, tiempoRestanteMs: 0, terminado: true }
    }
    return { ...actual, tiempoRestanteMs }
  })

  return {
    juego: { ...juego, jugadores, ultimoTs: ahora },
    agotado: tiempoRestanteMs <= 0,
  }
}

function jugarAccion(juego: Juego, accion: AccionJuego): Juego {
  if (
    accion.tipo !== 'CORRECTA' &&
    accion.tipo !== 'ERROR' &&
    accion.tipo !== 'PASAPALABRA'
  ) {
    return juego
  }

  const jugador = juego.jugadores[juego.turno]
  if (!jugador) return juego

  const estado: EstadoLetra =
    accion.tipo === 'CORRECTA'
      ? 'correcta'
      : accion.tipo === 'ERROR'
        ? 'error'
        : 'pasapalabra'

  const rosco = jugador.rosco.map((letra, indice) =>
    indice === jugador.letraActual ? { ...letra, estado } : letra
  )

  const actualizado = avanzar({ ...jugador, rosco })
  const jugadores = juego.jugadores.map((actual, indice) =>
    indice === juego.turno ? actualizado : actual
  )
  const siguiente: Juego = { ...juego, jugadores }

  if (accion.tipo === 'CORRECTA' && !actualizado.terminado) {
    return { ...siguiente, fase: 'jugando', ultimoTs: accion.ahora }
  }

  return cerrarTurno(siguiente, accion.ahora)
}

function avanzarFaseAutomatica(juego: Juego, ahora: number): Juego {
  if (juego.fase === 'cuentaRegresiva') {
    if (juego.finFaseTs !== null && ahora >= juego.finFaseTs) {
      return { ...juego, fase: 'jugando', ultimoTs: ahora, finFaseTs: null }
    }
    return juego
  }

  if (juego.fase === 'cola') {
    if (juego.finFaseTs !== null && ahora >= juego.finFaseTs) {
      if (juego.proximoTurno !== null) {
        return {
          ...juego,
          fase: 'esperandoTurno',
          turno: juego.proximoTurno,
          proximoTurno: null,
          finFaseTs: null,
          ultimoTs: null,
        }
      }

      return {
        ...juego,
        fase: 'fin',
        proximoTurno: null,
        finFaseTs: null,
        ultimoTs: null,
      }
    }
  }

  return juego
}

export function reducirJuego(juego: Juego, accion: AccionJuego): Juego {
  if (accion.tipo === 'REINICIAR') {
    return crearJuego(
      juego.jugadores.map(({ nombre, rosco }) => ({ nombre, rosco }))
    )
  }

  if (juego.fase === 'jugando') {
    const { juego: conReloj, agotado } = descontarReloj(juego, accion.ahora)
    if (agotado) return cerrarTurno(conReloj, accion.ahora)
    return jugarAccion(conReloj, accion)
  }

  switch (accion.tipo) {
    case 'INICIAR':
      if (juego.fase !== 'listo') return juego
      return {
        ...juego,
        fase: 'cuentaRegresiva',
        turno: 0,
        proximoTurno: null,
        ultimoTs: null,
        finFaseTs: accion.ahora + CUENTA_REGRESIVA_MS,
      }

    case 'TICK':
      return avanzarFaseAutomatica(juego, accion.ahora)

    case 'SIGUIENTE_TURNO':
      if (juego.fase !== 'esperandoTurno') return juego
      return {
        ...juego,
        fase: 'cuentaRegresiva',
        proximoTurno: null,
        ultimoTs: null,
        finFaseTs: accion.ahora + CUENTA_REGRESIVA_MS,
      }

    default:
      return juego
  }
}

export function resultados(juego: Juego): ResultadoJuego {
  const filas = juego.jugadores
    .map((jugador) => ({
      nombre: jugador.nombre,
      aciertos: contarAciertos(jugador),
      errores: contarErrores(jugador),
      tiempoRestanteMs: jugador.tiempoRestanteMs,
    }))
    .sort(
      (a, b) =>
        b.aciertos - a.aciertos || b.tiempoRestanteMs - a.tiempoRestanteMs
    )

  const [primero, segundo] = filas
  const empate =
    primero !== undefined &&
    segundo !== undefined &&
    primero.aciertos === segundo.aciertos &&
    primero.tiempoRestanteMs === segundo.tiempoRestanteMs

  return {
    filas,
    ganador: empate || !primero ? null : primero.nombre,
    empate,
  }
}
