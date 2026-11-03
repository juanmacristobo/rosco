'use client'

import { ESTILO_RESPUESTA_OPERADOR } from './estilos'

export function CartelRespuestaOperador({ respuesta }: { respuesta: string }) {
  return <div style={ESTILO_RESPUESTA_OPERADOR}>{respuesta}</div>
}
