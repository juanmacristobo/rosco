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
