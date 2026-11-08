import {
  MAX_JUGADORES,
  TIEMPO_MAX_SEGUNDOS,
  TIEMPO_MIN_SEGUNDOS,
  TIEMPO_POR_JUGADOR_MS,
} from './config'

export const CLAVE_CONFIGURACION = 'rosco-config'

export const SEGUNDOS_POR_DEFECTO = TIEMPO_POR_JUGADOR_MS / 1000
export const JUGADORES_POR_DEFECTO = Math.min(2, MAX_JUGADORES)

export type ConfiguracionGuardada = {
  nombres: string[]
  segundos: number
}

export function nombrePorDefecto(indice: number): string {
  return `Jugador ${indice + 1}`
}

export function nombresPorDefecto(cantidad: number): string[] {
  return Array.from({ length: cantidad }, (_, indice) => nombrePorDefecto(indice))
}

export function limitarSegundos(segundos: number): number {
  if (!Number.isFinite(segundos)) return SEGUNDOS_POR_DEFECTO
  return Math.min(
    TIEMPO_MAX_SEGUNDOS,
    Math.max(TIEMPO_MIN_SEGUNDOS, Math.round(segundos))
  )
}

export function configuracionPorDefecto(): ConfiguracionGuardada {
  return {
    nombres: nombresPorDefecto(JUGADORES_POR_DEFECTO),
    segundos: SEGUNDOS_POR_DEFECTO,
  }
}

export function cargarConfiguracion(): ConfiguracionGuardada {
  const porDefecto = configuracionPorDefecto()

  if (typeof window === 'undefined') return porDefecto

  try {
    const crudo = window.localStorage.getItem(CLAVE_CONFIGURACION)
    if (!crudo) return porDefecto

    const datos: unknown = JSON.parse(crudo)
    if (typeof datos !== 'object' || datos === null) return porDefecto

    const registro = datos as Record<string, unknown>
    const nombresCrudos = Array.isArray(registro.nombres)
      ? registro.nombres
      : []

    const nombres = nombresCrudos
      .filter((nombre): nombre is string => typeof nombre === 'string')
      .map((nombre) => nombre.trim())
      .filter((nombre) => nombre.length > 0)
      .slice(0, MAX_JUGADORES)

    const segundos =
      typeof registro.segundos === 'number'
        ? limitarSegundos(registro.segundos)
        : porDefecto.segundos

    return {
      nombres: nombres.length > 0 ? nombres : porDefecto.nombres,
      segundos,
    }
  } catch {
    return porDefecto
  }
}

export function guardarConfiguracion(configuracion: ConfiguracionGuardada): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(
      CLAVE_CONFIGURACION,
      JSON.stringify({
        nombres: configuracion.nombres.slice(0, MAX_JUGADORES),
        segundos: limitarSegundos(configuracion.segundos),
      })
    )
  } catch {
    // Si no se puede guardar (modo privado o cuota), la partida sigue igual.
  }
}
