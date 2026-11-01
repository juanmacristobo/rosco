const MIME_TYPES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
]

export type MezclaAudio = {
  ctx: AudioContext
  destino: MediaStreamAudioDestinationNode
  conectar: (nodo: AudioNode) => void
}

type TipoSesionAudio = 'auto' | 'playback' | 'play-and-record'

type NavigatorConSesionAudio = Navigator & {
  audioSession?: { type: TipoSesionAudio }
}

export function leerTipoSesionAudio(): string {
  const nav = navigator as NavigatorConSesionAudio
  return nav.audioSession?.type ?? 'no soportado'
}

export function establecerTipoSesionAudio(tipo: TipoSesionAudio) {
  const nav = navigator as NavigatorConSesionAudio
  if (!nav.audioSession) return

  try {
    nav.audioSession.type = tipo
  } catch {
    // Algunos navegadores exponen la API pero no permiten cambiarla.
  }
}

export function elegirMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''

  for (const tipo of MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(tipo)) return tipo
  }

  return ''
}

export function crearMezclaAudio(micStream: MediaStream | null): MezclaAudio {
  const ctx = new AudioContext()
  const destino = ctx.createMediaStreamDestination()

  if (micStream && micStream.getAudioTracks().length > 0) {
    const fuente = ctx.createMediaStreamSource(micStream)
    fuente.connect(destino)
  }

  return {
    ctx,
    destino,
    conectar: (nodo: AudioNode) => {
      nodo.connect(destino)
    },
  }
}
