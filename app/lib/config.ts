export const ALFABETO: string[] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export const CANVAS_ANCHO = 1920
export const CANVAS_ALTO = 1080

// Juego
export const TIEMPO_POR_JUGADOR_MS = 150_000
export const DELTA_MAX_TICK_MS = 1_000
export const CUENTA_REGRESIVA_MS = 3_000
export const COLA_TURNO_MS = 3_000
export const RESULTADOS_GRABADOS_MS = 3_000

// Grabación
export const FPS_GRABACION = 30
export const BITRATE_VIDEO = 5_000_000
export const BITRATE_AUDIO = 128_000
export const AUDIO_CONSTRAINTS = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  sampleRate: { ideal: 48000 },
}

// Rosco (círculo perfecto y centrado)
export const ROSCO_CENTRO_X = 960
export const ROSCO_CENTRO_Y = 450
export const ROSCO_RADIO = 360
export const LETRA_RADIO = 32
