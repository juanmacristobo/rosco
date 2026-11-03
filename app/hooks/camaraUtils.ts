export type FacingMode = 'environment' | 'user'

export function detenerStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

export function mensajeError(
  error: unknown,
  dispositivo: 'cámara' | 'micrófono'
) {
  const nombre =
    error && typeof error === 'object' && 'name' in error ? String(error.name) : ''
  const detalle =
    error && typeof error === 'object' && 'message' in error ? String(error.message) : ''
  const conArticulo = dispositivo === 'cámara' ? 'la cámara' : 'el micrófono'
  const indefinido = dispositivo === 'cámara' ? 'una cámara' : 'un micrófono'

  switch (nombre) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return `Permiso de ${dispositivo} denegado. Revisa los permisos del navegador.`
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return `No se encontró ${indefinido} en este dispositivo.`
    case 'NotReadableError':
    case 'TrackStartError':
      return `No se pudo iniciar ${conArticulo}. Puede estar en uso por otra aplicación.`
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return `La configuración solicitada no es compatible con ${conArticulo}.`
    case 'AbortError':
      return `Se interrumpió el acceso a ${conArticulo}. Inténtalo de nuevo.`
    default:
      return detalle
        ? `No se pudo acceder a ${conArticulo}: ${detalle}`
        : `No se pudo acceder a ${conArticulo}.`
  }
}

export async function pedirVideo(facingMode: FacingMode) {
  return navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: facingMode },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
    audio: false,
  })
}

export async function reproducir(video: HTMLVideoElement) {
  try {
    await video.play()
  } catch {
    throw new Error('El navegador no pudo reproducir el video de la cámara.')
  }
}

export function ahoraMs() {
  return performance.now()
}
