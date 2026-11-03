'use client'

import { useRef, useState, type RefObject } from 'react'

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
