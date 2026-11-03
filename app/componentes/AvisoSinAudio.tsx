'use client'

import { ESTILO_AVISO_SIN_AUDIO } from './estilos'

export function AvisoSinAudio() {
  return (
    <div style={ESTILO_AVISO_SIN_AUDIO}>
      Grabando sin micrófono: el video no tendrá audio.
    </div>
  )
}
