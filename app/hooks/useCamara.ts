'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'

import { elegirMimeType, leerTipoSesionAudio } from '../lib/grabacion'
import {
  detenerStream,
  mensajeError,
  pedirVideo,
  reproducir,
  type FacingMode,
} from './camaraUtils'

export type InfoVideo = {
  ancho: number
  alto: number
  relacion: string
  facingMode: string
}

export function useCamara({
  videoStreamRef,
  desmontadoRef,
  setMimeTypeElegido,
  setTipoSesionAudioActual,
  setErrorAudio,
}: {
  videoStreamRef: RefObject<MediaStream | null>
  desmontadoRef: RefObject<boolean>
  setMimeTypeElegido: (valor: string) => void
  setTipoSesionAudioActual: (valor: string) => void
  setErrorAudio: (valor: string | null) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const iniciandoRef = useRef(false)
  const cambiandoRef = useRef(false)

  const [activa, setActiva] = useState(false)
  const [facingMode, setFacingMode] = useState<FacingMode>('environment')
  const [cambiando, setCambiando] = useState(false)
  const [iniciando, setIniciando] = useState(false)
  const [errorCamara, setErrorCamara] = useState<string | null>(null)

  // DEBUG TEMPORAL: datos del stream para diagnosticar el encuadre.
  const [infoVideo, setInfoVideo] = useState<InfoVideo>({
    ancho: 0,
    alto: 0,
    relacion: '0.00',
    facingMode: '—',
  })

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

  // Defensa: iOS puede pausar el <video> al rotar el teléfono. Si la cámara
  // sigue activa y no se detuvo a propósito, se reintenta la reproducción.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const alPausar = () => {
      if (!activa || desmontadoRef.current) return
      if (iniciandoRef.current || cambiandoRef.current) return
      if (!videoStreamRef.current) return
      void video.play().catch(() => undefined)
    }

    video.addEventListener('pause', alPausar)
    return () => video.removeEventListener('pause', alPausar)
  }, [activa, videoStreamRef, desmontadoRef])

  // Defensa: al terminar un cambio de orientación, si el video quedó pausado
  // o sin datos suficientes, se reintenta play() con un debounce corto.
  useEffect(() => {
    let timeoutId: number | null = null

    const reintentar = () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId)

      timeoutId = window.setTimeout(() => {
        timeoutId = null
        if (!activa || desmontadoRef.current) return
        if (iniciandoRef.current || cambiandoRef.current) return

        const video = videoRef.current
        if (!video || !videoStreamRef.current) return
        if (video.paused || video.readyState < 2) {
          void video.play().catch(() => undefined)
        }
      }, 300)
    }

    window.addEventListener('orientationchange', reintentar)
    window.addEventListener('resize', reintentar)

    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId)
      window.removeEventListener('orientationchange', reintentar)
      window.removeEventListener('resize', reintentar)
    }
  }, [activa, videoStreamRef, desmontadoRef])

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
    setMimeTypeElegido(elegirMimeType())
    setTipoSesionAudioActual(leerTipoSesionAudio())

    try {
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
      } catch (e) {
        soltarVideo()
        if (!desmontadoRef.current) setErrorCamara(mensajeError(e, 'cámara'))
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

  return {
    videoRef,
    activa,
    facingMode,
    cambiando,
    iniciando,
    errorCamara,
    infoVideo,
    actualizarInfoVideo,
    soltarVideo,
    empezar,
    cambiarCamara,
  }
}
