import { ALFABETO } from './config'
import type { DatosDibujo, EstadoLetra } from './dibujo'

const estados: EstadoLetra[] = ALFABETO.map((_, indice) => {
  if (indice === 1) return 'correcta'
  if (indice === 2) return 'error'
  if (indice === 3) return 'pasapalabra'
  return 'pendiente'
})

export const datosDemo: DatosDibujo = {
  estados,
  letraActiva: 0,
  jugador: 'Jugador 1',
  segundos: 150,
  aciertos: 1,
  pista: 'Con la A: Primera letra del abecedario',
}
