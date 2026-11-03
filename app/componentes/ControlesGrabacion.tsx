'use client'

import { BotonFlotante } from './BotonFlotante'
import { ESTILO_CONTROLES_GRABACION } from './estilos'

export function ControlesGrabacion({
  cambiando,
  iniciando,
  grabando,
  onCambiarCamara,
  onDetener,
}: {
  cambiando: boolean
  iniciando: boolean
  grabando: boolean
  onCambiarCamara: () => void
  onDetener: () => void
}) {
  return (
    <div style={ESTILO_CONTROLES_GRABACION}>
      <BotonFlotante
        variante="chicoClaro"
        onClick={onCambiarCamara}
        disabled={cambiando || iniciando}
        ariaBusy={cambiando}
        estilo={{ opacity: cambiando || iniciando ? 0.6 : 1 }}
      >
        {cambiando ? 'Cambiando…' : 'Cambiar cámara'}
      </BotonFlotante>

      {grabando && (
        <BotonFlotante variante="chicoDetener" onClick={onDetener}>
          Detener
        </BotonFlotante>
      )}
    </div>
  )
}
