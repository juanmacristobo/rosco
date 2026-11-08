'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'

import { SEGUNDOS_ALERTA_FINAL } from '../lib/config'
import { crearJugadoresDemo } from '../lib/datosDemo'
import {
  crearJuego,
  reducirJuego,
  type AccionJuego,
  type FaseJuego,
  type Juego,
} from '../lib/juego'
import type { NombreSonido, Sonidos } from '../lib/sonidos'

export type GrabacionParaJuego = {
  pedirWakeLock: () => Promise<void>
  empezarGrabacion: () => Promise<void>
  pausarGrabacionPorTurno: () => void
  reanudarGrabacionPorTurno: () => void
  programarFinGrabacion: () => void
  cancelarFinGrabacion: () => void
}

function textoRespuestaOperador(juego: Juego): string | null {
  if (juego.fase !== 'cuentaRegresiva' && juego.fase !== 'jugando') return null
  const jugador = juego.jugadores[juego.turno]
  if (!jugador || jugador.terminado) return null
  const letra = jugador.rosco[jugador.letraActual]
  if (!letra) return null
  return `${letra.letra} · ${letra.respuesta}`.toUpperCase()
}

function sonidoDeAccion(accion: AccionJuego): NombreSonido | null {
  switch (accion.tipo) {
    case 'CORRECTA':
      return 'acierto'
    case 'ERROR':
      return 'error'
    case 'PASAPALABRA':
      return 'pasapalabra'
    default:
      return null
  }
}

export function useJuego({
  grabacionRef,
}: {
  grabacionRef: RefObject<GrabacionParaJuego | null>
}) {
  const juegoRef = useRef<Juego>(crearJuego(crearJugadoresDemo()))
  const dispatchRef = useRef<(accion: AccionJuego) => void>(() => {})
  const sonidosRef = useRef<Sonidos | null>(null)
  const ultimoNumeroCuentaRef = useRef<number | null>(null)
  const ultimoSegundoAvisoRef = useRef<number | null>(null)
  const respuestaOperadorRef = useRef<string | null>(null)

  const [faseJuego, setFaseJuego] = useState<FaseJuego>('listo')
  const [turnoJuego, setTurnoJuego] = useState(0)
  const [respuestaOperador, setRespuestaOperador] = useState<string | null>(null)

  function manejarTransicion(anterior: Juego, siguiente: Juego) {
    if (anterior.fase === siguiente.fase) return

    if (anterior.fase === 'listo' && siguiente.fase === 'cuentaRegresiva') {
      void grabacionRef.current?.pedirWakeLock()
      void grabacionRef.current?.empezarGrabacion()
      return
    }

    if (anterior.fase === 'cola' && siguiente.fase === 'esperandoTurno') {
      grabacionRef.current?.pausarGrabacionPorTurno()
      return
    }

    if (anterior.fase === 'esperandoTurno' && siguiente.fase === 'cuentaRegresiva') {
      grabacionRef.current?.reanudarGrabacionPorTurno()
      return
    }

    if (anterior.fase === 'cola' && siguiente.fase === 'fin') {
      grabacionRef.current?.programarFinGrabacion()
      return
    }

    if (siguiente.fase === 'listo') {
      grabacionRef.current?.cancelarFinGrabacion()
    }
  }

  // Capa de efectos de sonido: reacciona a las acciones aceptadas y a los
  // cambios de fase, sin usar estado de React por frame.
  function reproducirEfectosSonido(
    anterior: Juego,
    siguiente: Juego,
    accion: AccionJuego
  ) {
    const sonidos = sonidosRef.current
    if (
      !sonidos ||
      accion.tipo === 'REINICIAR' ||
      accion.tipo === 'CONFIGURAR'
    )
      return

    const ahora = accion.ahora

    if (anterior.fase === 'jugando') {
      const sonido = sonidoDeAccion(accion)
      if (sonido) {
        const jugadorAntes = anterior.jugadores[anterior.turno]
        const jugadorDespues = siguiente.jugadores[anterior.turno]
        const indice = jugadorAntes?.letraActual ?? -1
        const letraAntes = jugadorAntes?.rosco[indice]
        const letraDespues = jugadorDespues?.rosco[indice]
        if (
          letraAntes &&
          letraDespues &&
          letraAntes.estado !== letraDespues.estado
        ) {
          sonidos.reproducir(sonido)
        }
      }
    }

    if (anterior.fase === 'jugando' && siguiente.fase !== 'jugando') {
      const antes = anterior.jugadores[anterior.turno]
      const despues = siguiente.jugadores[anterior.turno]
      if (
        antes &&
        despues &&
        antes.tiempoRestanteMs > 0 &&
        despues.tiempoRestanteMs <= 0
      ) {
        ultimoSegundoAvisoRef.current = null
        sonidos.reproducir('tiempoAgotado')
      }
    }

    if (siguiente.fase !== anterior.fase) {
      if (siguiente.fase === 'cuentaRegresiva') {
        ultimoNumeroCuentaRef.current = null
      }

      if (anterior.fase === 'cuentaRegresiva' && siguiente.fase === 'jugando') {
        ultimoSegundoAvisoRef.current = null
        sonidos.reproducir('ya')
      }

      if (siguiente.fase === 'fin') {
        sonidos.reproducir('fin')
      }
    }

    if (siguiente.fase === 'cuentaRegresiva' && siguiente.finFaseTs !== null) {
      const numero = Math.max(
        1,
        Math.ceil((siguiente.finFaseTs - ahora) / 1000)
      )
      if (numero !== ultimoNumeroCuentaRef.current) {
        ultimoNumeroCuentaRef.current = numero
        sonidos.reproducir('tic')
      }
    }

    if (siguiente.fase === 'jugando') {
      if (anterior.fase !== 'jugando' || anterior.turno !== siguiente.turno) {
        ultimoSegundoAvisoRef.current = null
      }

      const jugador = siguiente.jugadores[siguiente.turno]
      const segundos = Math.ceil((jugador?.tiempoRestanteMs ?? 0) / 1000)
      if (
        segundos > 0 &&
        segundos <= SEGUNDOS_ALERTA_FINAL &&
        segundos !== ultimoSegundoAvisoRef.current
      ) {
        ultimoSegundoAvisoRef.current = segundos
        sonidos.reproducir('tic')
      }
    }
  }

  function dispatch(accion: AccionJuego) {
    const anterior = juegoRef.current
    const siguiente = reducirJuego(anterior, accion)
    juegoRef.current = siguiente

    if (siguiente.fase !== anterior.fase || siguiente.turno !== anterior.turno) {
      setFaseJuego(siguiente.fase)
      setTurnoJuego(siguiente.turno)
    }

    const respuesta = textoRespuestaOperador(siguiente)
    if (respuesta !== respuestaOperadorRef.current) {
      respuestaOperadorRef.current = respuesta
      setRespuestaOperador(respuesta)
    }

    manejarTransicion(anterior, siguiente)
    reproducirEfectosSonido(anterior, siguiente, accion)
  }

  useEffect(() => {
    dispatchRef.current = dispatch
  })

  return {
    dispatch,
    dispatchRef,
    juegoRef,
    faseJuego,
    turnoJuego,
    respuestaOperador,
    sonidosRef,
    ultimoNumeroCuentaRef,
    ultimoSegundoAvisoRef,
  }
}
