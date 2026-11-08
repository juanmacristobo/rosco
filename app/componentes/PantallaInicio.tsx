'use client'

import { BotonFlotante } from './BotonFlotante'
import {
  ESTILO_PANTALLA_INICIO,
  TAMANO_EMPEZAR,
} from './estilos'

export function PantallaInicio({
  iniciando,
  onEmpezar,
  onAbrirBanco,
  onAbrirPreparacion,
}: {
  iniciando: boolean
  onEmpezar: () => void
  onAbrirBanco: () => void
  onAbrirPreparacion: () => void
}) {
  return (
    <div style={ESTILO_PANTALLA_INICIO}>
      <BotonFlotante
        variante="nativo"
        tamano={TAMANO_EMPEZAR}
        onClick={onEmpezar}
        disabled={iniciando}
      >
        {iniciando ? 'Abriendo…' : 'Empezar'}
      </BotonFlotante>

      <BotonFlotante
        variante="banco"
        onClick={onAbrirBanco}
        disabled={iniciando}
      >
        Banco de palabras
      </BotonFlotante>

      <BotonFlotante
        variante="banco"
        onClick={onAbrirPreparacion}
        disabled={iniciando}
      >
        Preparar partida
      </BotonFlotante>
    </div>
  )
}
