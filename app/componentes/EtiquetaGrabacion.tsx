'use client'

import { formatearTiempo } from './formato'
import {
  ESTILO_ETIQUETA_GRABACION,
  ESTILO_PUNTO_REC,
} from './estilos'

export function EtiquetaGrabacion({
  recPausado,
  segundosGrabacion,
}: {
  recPausado: boolean
  segundosGrabacion: number
}) {
  return (
    <div style={ESTILO_ETIQUETA_GRABACION}>
      {recPausado ? (
        <>⏸ PAUSA</>
      ) : (
        <>
          <span style={ESTILO_PUNTO_REC}>●</span> REC{' '}
          {formatearTiempo(segundosGrabacion)}
        </>
      )}
    </div>
  )
}
