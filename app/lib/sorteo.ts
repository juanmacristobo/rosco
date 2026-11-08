import type { EntradaBanco } from './banco'
import { ALFABETO } from './config'
import type { LetraRosco } from './juego'

export type LetraFaltante = {
  letra: string
  disponibles: number
}

export type ResultadoSorteo =
  | { ok: true; roscos: LetraRosco[][] }
  | { ok: false; faltantes: LetraFaltante[] }

// Fisher-Yates sobre una copia: no modifica la lista original.
export function mezclar<T>(
  lista: readonly T[],
  aleatorio: () => number = Math.random
): T[] {
  const copia = [...lista]

  for (let indice = copia.length - 1; indice > 0; indice -= 1) {
    const destino = Math.floor(aleatorio() * (indice + 1))
    const temporal = copia[indice]
    copia[indice] = copia[destino]
    copia[destino] = temporal
  }

  return copia
}

function entradasUnicasPorLetra(
  banco: readonly EntradaBanco[],
  letra: string
): EntradaBanco[] {
  const vistas = new Set<string>()
  const unicas: EntradaBanco[] = []

  for (const entrada of banco) {
    if (entrada.letra.trim().toUpperCase() !== letra) continue

    const clave = entrada.respuestaNorm.trim()
    if (vistas.has(clave)) continue

    vistas.add(clave)
    unicas.push(entrada)
  }

  return unicas
}

// Un rosco por jugador, sin respuestas repetidas dentro de cada letra.
export function sortearRoscos(
  banco: readonly EntradaBanco[],
  cantidadJugadores: number,
  aleatorio: () => number = Math.random
): ResultadoSorteo {
  const cantidad = Math.max(0, Math.floor(cantidadJugadores))
  const roscos: LetraRosco[][] = Array.from({ length: cantidad }, () => [])
  const faltantes: LetraFaltante[] = []

  for (const letra of ALFABETO) {
    const unicas = entradasUnicasPorLetra(banco, letra)

    if (unicas.length < cantidad) {
      faltantes.push({ letra, disponibles: unicas.length })
      continue
    }

    const mezcladas = mezclar(unicas, aleatorio)

    for (let jugador = 0; jugador < cantidad; jugador += 1) {
      const entrada = mezcladas[jugador]
      roscos[jugador].push({
        letra,
        tipo: entrada.tipo,
        pista: entrada.pista,
        respuesta: entrada.respuesta,
        estado: 'pendiente',
      })
    }
  }

  if (faltantes.length > 0) return { ok: false, faltantes }

  return { ok: true, roscos }
}
