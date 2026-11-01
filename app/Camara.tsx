'use client'
import { useEffect, useRef, useState } from 'react'

import { CANVAS_ALTO, CANVAS_ANCHO } from './lib/config'
import { datosDemo } from './lib/datosDemo'
import { dibujarFrame } from './lib/dibujo'

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
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
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
  const [vertical, setVertical] = useState(false)

  // DEBUG TEMPORAL: datos del stream para diagnosticar el encuadre.
  const [infoVideo, setInfoVideo] = useState({
    ancho: 0,
    alto: 0,
    relacion: '0.00',
    facingMode: '—',
  })

  useEffect(() => {
    desmontadoRef.current = false

    return () => {
      desmontadoRef.current = true
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      detenerStream(videoStreamRef.current)
      detenerStream(audioStreamRef.current)
      videoStreamRef.current = null
      audioStreamRef.current = null
    }
  }, [])

  useEffect(() => {
    const consulta = window.matchMedia('(orientation: portrait)')
    const actualizar = () => setVertical(consulta.matches)

    actualizar()
    consulta.addEventListener('change', actualizar)

    return () => consulta.removeEventListener('change', actualizar)
  }, [])

  useEffect(() => {
    if (!activa) return

    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dibujar = () => {
      dibujarFrame(ctx, video, datosDemo)
      rafRef.current = requestAnimationFrame(dibujar)
    }

    rafRef.current = requestAnimationFrame(dibujar)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [activa])

  // DEBUG TEMPORAL: actualiza los datos del stream en loadedmetadata y resize.
  function actualizarInfoVideo(video: HTMLVideoElement) {
    const stream = video.srcObject
    const track = stream instanceof MediaStream ? stream.getVideoTracks()[0] : null
    const facingModeReal = track?.getSettings().facingMode

    setInfoVideo({
      ancho: video.videoWidth,
      alto: video.videoHeight,
      relacion: video.videoHeight ? (video.videoWidth / video.videoHeight).toFixed(2) : '0.00',
      facingMode: facingModeReal ?? '—',
    })
  }

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
      video.srcObject = null
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
        position: 'relative',
        width: '100%',
        height: '100dvh',
        background: '#000',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_ANCHO}
        height={CANVAS_ALTO}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          background: '#000',
          zIndex: 0,
        }}
      />

      <video
        ref={videoRef}
        playsInline
        muted
        onLoadedMetadata={(event) => actualizarInfoVideo(event.currentTarget)}
        onResize={(event) => actualizarInfoVideo(event.currentTarget)}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />

      {/* DEBUG TEMPORAL: borrar este bloque cuando termine el diagnóstico. */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          zIndex: 2,
          padding: '4px 6px',
          borderRadius: 4,
          background: 'rgba(0, 0, 0, 0.55)',
          color: '#fff',
          fontFamily: 'monospace',
          fontSize: 11,
          lineHeight: 1.3,
          pointerEvents: 'none',
        }}
      >
        {infoVideo.ancho} x {infoVideo.alto} · AR {infoVideo.relacion} · {infoVideo.facingMode}
      </div>

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
            zIndex: 1,
          }}
        >
          {iniciando ? 'Abriendo…' : 'Empezar'}
        </button>
      )}

      {activa && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1,
            display: 'flex',
            justifyContent: 'flex-end',
            paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 16px)',
            paddingRight: 'calc(env(safe-area-inset-right, 0px) + 16px)',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
            pointerEvents: 'none',
          }}
        >
          <button
            type="button"
            onClick={cambiarCamara}
            disabled={cambiando || iniciando}
            aria-busy={cambiando}
            style={{
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
              pointerEvents: 'auto',
            }}
          >
            {cambiando ? 'Cambiando…' : 'Cambiar cámara'}
          </button>
        </div>
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

      {vertical && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            background: 'rgba(0, 0, 0, 0.9)',
            color: '#fff',
            fontSize: 24,
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          Girá el teléfono a horizontal
        </div>
      )}
    </main>
  )
}
