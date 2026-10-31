'use client'
import { useEffect, useRef, useState } from 'react'

type FacingMode = 'environment' | 'user'

function detenerStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

function mensajeError(error: unknown, dispositivo: 'cámara' | 'micrófono') {
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

async function pedirVideo(facingMode: FacingMode) {
  return navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: facingMode },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
    audio: false,
  })
}

async function reproducir(video: HTMLVideoElement) {
  try {
    await video.play()
  } catch {
    throw new Error('El navegador no pudo reproducir el video de la cámara.')
  }
}

export default function Camara() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const videoStreamRef = useRef<MediaStream | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const desmontadoRef = useRef(false)
  const iniciandoRef = useRef(false)
  const cambiandoRef = useRef(false)

  const [activa, setActiva] = useState(false)
  const [facingMode, setFacingMode] = useState<FacingMode>('environment')
  const [cambiando, setCambiando] = useState(false)
  const [iniciando, setIniciando] = useState(false)
  const [errorCamara, setErrorCamara] = useState<string | null>(null)
  const [errorAudio, setErrorAudio] = useState<string | null>(null)

  useEffect(() => {
    desmontadoRef.current = false

    return () => {
      desmontadoRef.current = true
      detenerStream(videoStreamRef.current)
      detenerStream(audioStreamRef.current)
      videoStreamRef.current = null
      audioStreamRef.current = null
    }
  }, [])

  function soltarVideo() {
    detenerStream(videoStreamRef.current)
    videoStreamRef.current = null

    const video = videoRef.current
    if (video) video.srcObject = null
  }

  async function empezar() {
    if (iniciandoRef.current || activa) return

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorCamara(
        'Tu navegador no permite acceder a la cámara. Abre la página con HTTPS o en localhost.'
      )
      return
    }

    iniciandoRef.current = true
    setIniciando(true)
    setErrorCamara(null)
    setErrorAudio(null)

    try {
      let camaraLista = false

      try {
        const stream = await pedirVideo(facingMode)
        if (desmontadoRef.current) {
          detenerStream(stream)
          return
        }

        const video = videoRef.current
        if (!video) {
          detenerStream(stream)
          throw new Error('No se encontró el elemento de video.')
        }

        videoStreamRef.current = stream
        video.srcObject = stream
        await reproducir(video)

        if (desmontadoRef.current) {
          detenerStream(stream)
          return
        }

        setActiva(true)
        camaraLista = true
      } catch (e) {
        soltarVideo()
        if (!desmontadoRef.current) setErrorCamara(mensajeError(e, 'cámara'))
      }

      if (camaraLista && !audioStreamRef.current) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
          if (desmontadoRef.current) {
            detenerStream(audioStream)
          } else {
            audioStreamRef.current = audioStream
          }
        } catch (e) {
          if (!desmontadoRef.current) setErrorAudio(mensajeError(e, 'micrófono'))
        }
      }
    } finally {
      iniciandoRef.current = false
      if (!desmontadoRef.current) setIniciando(false)
    }
  }

  async function cambiarCamara() {
    if (!activa || cambiandoRef.current || iniciandoRef.current) return

    const nuevoFacingMode: FacingMode = facingMode === 'environment' ? 'user' : 'environment'
    cambiandoRef.current = true
    setCambiando(true)
    setErrorCamara(null)

    try {
      soltarVideo()

      const stream = await pedirVideo(nuevoFacingMode)
      if (desmontadoRef.current) {
        detenerStream(stream)
        return
      }

      const video = videoRef.current
      if (!video) {
        detenerStream(stream)
        throw new Error('No se encontró el elemento de video.')
      }

      videoStreamRef.current = stream
      video.srcObject = stream
      await reproducir(video)

      if (desmontadoRef.current) {
        detenerStream(stream)
        return
      }

      setFacingMode(nuevoFacingMode)
    } catch (e) {
      soltarVideo()
      if (!desmontadoRef.current) {
        setErrorCamara(mensajeError(e, 'cámara'))
        setActiva(false)
      }
    } finally {
      cambiandoRef.current = false
      if (!desmontadoRef.current) setCambiando(false)
    }
  }

  return (
    <main
      style={{
        height: '100dvh',
        background: '#000',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <video
        ref={videoRef}
        playsInline
        muted
        style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {!activa && (
        <button
          type="button"
          onClick={empezar}
          disabled={iniciando}
          style={{
            position: 'absolute',
            inset: 0,
            margin: 'auto',
            width: 200,
            height: 70,
            fontSize: 24,
            touchAction: 'manipulation',
          }}
        >
          {iniciando ? 'Abriendo…' : 'Empezar'}
        </button>
      )}

      {activa && (
        <button
          type="button"
          onClick={cambiarCamara}
          disabled={cambiando || iniciando}
          aria-busy={cambiando}
          style={{
            position: 'absolute',
            right: 'calc(env(safe-area-inset-right, 0px) + 16px)',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
            minWidth: 180,
            minHeight: 60,
            padding: '0 24px',
            border: 'none',
            borderRadius: 999,
            background: 'rgba(255, 255, 255, 0.92)',
            color: '#000',
            fontSize: 18,
            fontWeight: 700,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
            opacity: cambiando || iniciando ? 0.6 : 1,
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            zIndex: 1,
          }}
        >
          {cambiando ? 'Cambiando…' : 'Cambiar cámara'}
        </button>
      )}

      {(errorCamara || errorAudio) && (
        <div
          role="alert"
          style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            left: 16,
            right: 16,
            padding: '12px 16px',
            borderRadius: 12,
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            fontSize: 16,
            lineHeight: 1.4,
            zIndex: 1,
          }}
        >
          {errorCamara && <p style={{ margin: 0 }}>{errorCamara}</p>}
          {errorAudio && <p style={{ margin: errorCamara ? '8px 0 0' : 0 }}>{errorAudio}</p>}
        </div>
      )}
    </main>
  )
}
