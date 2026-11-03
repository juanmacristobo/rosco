'use client'

import { BotonFlotante } from './BotonFlotante'
import {
  ESTILO_BOTONES_JUEGO_COLUMNA,
  POSICION_CENTRO_ABAJO_96,
  POSICION_CORRECTA,
  TAMANO_CORRECTA,
  TAMANO_EMPEZAR_TURNO,
  TAMANO_ERROR,
  TAMANO_INICIAR_PARTIDA,
  TAMANO_REINICIAR,
} from './estilos'

export function BotonIniciarPartida({ onClick }: { onClick: () => void }) {
  return (
    <BotonFlotante
      variante="pantalla"
      posicion={POSICION_CENTRO_ABAJO_96}
      tamano={TAMANO_INICIAR_PARTIDA}
      onClick={onClick}
    >
      Iniciar partida
    </BotonFlotante>
  )
}

export function BotonesJugando({
  onError,
  onPasapalabra,
  onCorrecta,
}: {
  onError: () => void
  onPasapalabra: () => void
  onCorrecta: () => void
}) {
  return (
    <>
      <div style={ESTILO_BOTONES_JUEGO_COLUMNA}>
        <BotonFlotante variante="error" tamano={TAMANO_ERROR} onClick={onError}>
          Error
        </BotonFlotante>

        <BotonFlotante
          variante="pasapalabra"
          tamano={TAMANO_ERROR}
          onClick={onPasapalabra}
        >
          Pasapalabra
        </BotonFlotante>
      </div>

      <BotonFlotante
        variante="correcta"
        posicion={POSICION_CORRECTA}
        tamano={TAMANO_CORRECTA}
        onClick={onCorrecta}
      >
        Correcta
      </BotonFlotante>
    </>
  )
}

export function BotonEmpezarTurno({
  nombreTurno,
  onClick,
}: {
  nombreTurno: string
  onClick: () => void
}) {
  return (
    <BotonFlotante
      variante="pantalla"
      posicion={POSICION_CENTRO_ABAJO_96}
      tamano={TAMANO_EMPEZAR_TURNO}
      onClick={onClick}
    >
      Empezar turno de {nombreTurno}
    </BotonFlotante>
  )
}

export function BotonReiniciar({ onClick }: { onClick: () => void }) {
  return (
    <BotonFlotante
      variante="pantalla"
      posicion={POSICION_CENTRO_ABAJO_96}
      tamano={TAMANO_REINICIAR}
      onClick={onClick}
    >
      Reiniciar
    </BotonFlotante>
  )
}
