'use client'

import { ESTILO_ERRORES } from './estilos'

export function MensajesError({
  errorCamara,
  errorAudio,
  errorGrabacion,
}: {
  errorCamara: string | null
  errorAudio: string | null
  errorGrabacion: string | null
}) {
  return (
    <div role="alert" style={ESTILO_ERRORES}>
      {errorCamara && <p style={{ margin: 0 }}>{errorCamara}</p>}
      {errorAudio && <p style={{ margin: errorCamara ? '8px 0 0' : 0 }}>{errorAudio}</p>}
      {errorGrabacion && (
        <p style={{ margin: errorCamara || errorAudio ? '8px 0 0' : 0 }}>{errorGrabacion}</p>
      )}
    </div>
  )
}
