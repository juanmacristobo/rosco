import {
  GANANCIA_SONIDOS_GRABACION,
  GANANCIA_SONIDOS_PARLANTE,
} from './config'

export const NOMBRES_SONIDOS = [
  'acierto',
  'error',
  'pasapalabra',
  'tic',
  'ya',
  'tiempoAgotado',
  'fin',
] as const

export type NombreSonido = (typeof NOMBRES_SONIDOS)[number]
export type OrigenSonido = 'archivo' | 'sintetico'

export type Sonidos = {
  reproducir: (nombre: NombreSonido) => void
  cargados: Record<NombreSonido, OrigenSonido>
}

type Nota = {
  frecuencia: number
  frecuenciaFinal?: number
  inicio: number
  duracion: number
  tipo: OscillatorType
  volumen: number
}

// Sin archivo en /sonidos, cada efecto se genera con osciladores.
const DEFINICIONES: Record<NombreSonido, Nota[]> = {
  acierto: [
    { frecuencia: 660, inicio: 0, duracion: 0.09, tipo: 'triangle', volumen: 0.35 },
    { frecuencia: 880, inicio: 0.1, duracion: 0.12, tipo: 'triangle', volumen: 0.35 },
  ],
  error: [
    {
      frecuencia: 165,
      frecuenciaFinal: 90,
      inicio: 0,
      duracion: 0.4,
      tipo: 'sawtooth',
      volumen: 0.3,
    },
  ],
  pasapalabra: [
    { frecuencia: 440, inicio: 0, duracion: 0.1, tipo: 'triangle', volumen: 0.3 },
    { frecuencia: 440, inicio: 0.12, duracion: 0.1, tipo: 'triangle', volumen: 0.3 },
  ],
  tic: [{ frecuencia: 1400, inicio: 0, duracion: 0.035, tipo: 'square', volumen: 0.25 }],
  ya: [{ frecuencia: 880, inicio: 0, duracion: 0.3, tipo: 'triangle', volumen: 0.3 }],
  tiempoAgotado: [
    {
      frecuencia: 150,
      frecuenciaFinal: 85,
      inicio: 0,
      duracion: 0.8,
      tipo: 'sawtooth',
      volumen: 0.3,
    },
  ],
  fin: [
    { frecuencia: 523.25, inicio: 0, duracion: 0.12, tipo: 'triangle', volumen: 0.32 },
    { frecuencia: 659.25, inicio: 0.13, duracion: 0.12, tipo: 'triangle', volumen: 0.32 },
    { frecuencia: 783.99, inicio: 0.26, duracion: 0.12, tipo: 'triangle', volumen: 0.32 },
    { frecuencia: 1046.5, inicio: 0.39, duracion: 0.2, tipo: 'triangle', volumen: 0.32 },
  ],
}

function crearNota(
  ctx: AudioContext,
  nota: Nota,
  destinos: AudioNode[],
  cuando: number
) {
  const inicio = cuando + nota.inicio
  const fin = inicio + nota.duracion
  const ataque = Math.min(0.01, nota.duracion / 4)
  const osc = ctx.createOscillator()
  const envolvente = ctx.createGain()

  osc.type = nota.tipo
  osc.frequency.setValueAtTime(nota.frecuencia, inicio)
  if (nota.frecuenciaFinal !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(1, nota.frecuenciaFinal),
      fin
    )
  }

  envolvente.gain.setValueAtTime(0, inicio)
  envolvente.gain.linearRampToValueAtTime(nota.volumen, inicio + ataque)
  envolvente.gain.setValueAtTime(
    nota.volumen,
    Math.max(inicio + ataque, fin - ataque)
  )
  envolvente.gain.linearRampToValueAtTime(0, fin)

  osc.connect(envolvente)
  for (const destino of destinos) envolvente.connect(destino)

  osc.onended = () => {
    osc.disconnect()
    envolvente.disconnect()
  }

  osc.start(inicio)
  osc.stop(fin + 0.02)
}

export function crearSonidos(
  ctx: AudioContext,
  destinoGrabacion: AudioNode
): Sonidos {
  const buffers = new Map<NombreSonido, AudioBuffer>()
  const cargados = Object.fromEntries(
    NOMBRES_SONIDOS.map((nombre) => [nombre, 'sintetico'])
  ) as Record<NombreSonido, OrigenSonido>

  const gananciaGrabacion = ctx.createGain()
  gananciaGrabacion.gain.value = GANANCIA_SONIDOS_GRABACION
  gananciaGrabacion.connect(destinoGrabacion)

  const gananciaParlante = ctx.createGain()
  gananciaParlante.gain.value = GANANCIA_SONIDOS_PARLANTE
  gananciaParlante.connect(ctx.destination)

  const destinos = [gananciaGrabacion, gananciaParlante]

  for (const nombre of NOMBRES_SONIDOS) {
    void (async () => {
      try {
        const respuesta = await fetch(`/sonidos/${nombre}.mp3`)
        if (!respuesta.ok) return

        const datos = await respuesta.arrayBuffer()
        const buffer = await ctx.decodeAudioData(datos)
        if (ctx.state === 'closed') return

        buffers.set(nombre, buffer)
        cargados[nombre] = 'archivo'
      } catch {
        // Sin archivo: se sigue usando el sonido sintético.
      }
    })()
  }

  function reproducir(nombre: NombreSonido) {
    if (ctx.state === 'closed') return

    try {
      const buffer = buffers.get(nombre)
      if (buffer) {
        const fuente = ctx.createBufferSource()
        fuente.buffer = buffer
        for (const destino of destinos) fuente.connect(destino)
        fuente.onended = () => fuente.disconnect()
        fuente.start()
        return
      }

      const cuando = ctx.currentTime + 0.005
      for (const nota of DEFINICIONES[nombre]) {
        crearNota(ctx, nota, destinos, cuando)
      }
    } catch {
      // Un fallo de audio nunca debe cortar el juego.
    }
  }

  return { reproducir, cargados }
}
