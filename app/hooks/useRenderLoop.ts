'use client'

import { useEffect, type RefObject } from 'react'

import { dibujarFrame, type DatosDibujo } from '../lib/dibujo'
import { resultados, type AccionJuego, type Juego } from '../lib/juego'

function construirDatosDibujo(juego: Juego, ahora: number): DatosDibujo {
  const jugador = juego.jugadores[juego.turno]
  const letra = jugador && !jugador.terminado ? jugador.rosco[jugador.letraActual] : undefined
  const cuentaRegresiva =
    juego.fase === 'cuentaRegresiva' && juego.finFaseTs !== null
      ? Math.max(1, Math.ceil((juego.finFaseTs - ahora) / 1000))
      : null

  return {
    estados: jugador ? jugador.rosco.map((item) => item.estado) : [],
    letraActiva: jugador && !jugador.terminado ? jugador.letraActual : -1,
    jugador: jugador?.nombre ?? '',
    segundos: Math.ceil((jugador?.tiempoRestanteMs ?? 0) / 1000),
    pista: letra
      ? `${letra.tipo === 'empieza' ? 'Empieza' : 'Contiene'} con la ${letra.letra}: ${letra.pista}`
      : '',
    fase: juego.fase,
    marcador: juego.jugadores.map((actual, indice) => ({
      nombre: actual.nombre,
      segundos: Math.ceil(actual.tiempoRestanteMs / 1000),
      enTurno: indice === juego.turno,
    })),
    cartel:
      juego.fase === 'cuentaRegresiva' || juego.fase === 'esperandoTurno'
        ? `TURNO DE ${(jugador?.nombre ?? '').toUpperCase()}`
        : null,
    cuentaRegresiva,
    resultados: juego.fase === 'fin' ? resultados(juego) : null,
  }
}

export function useRenderLoop({
  activa,
  canvasRef,
  videoRef,
  rafRef,
  dispatchRef,
  juegoRef,
}: {
  activa: boolean
  canvasRef: RefObject<HTMLCanvasElement | null>
  videoRef: RefObject<HTMLVideoElement | null>
  rafRef: RefObject<number | null>
  dispatchRef: RefObject<(accion: AccionJuego) => void>
  juegoRef: RefObject<Juego>
}) {
  useEffect(() => {
    if (!activa) return

    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dibujar = () => {
      const ahora = performance.now()
      dispatchRef.current({ tipo: 'TICK', ahora })
      dibujarFrame(ctx, video, construirDatosDibujo(juegoRef.current, ahora))
      rafRef.current = requestAnimationFrame(dibujar)
    }

    rafRef.current = requestAnimationFrame(dibujar)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [activa])
}
