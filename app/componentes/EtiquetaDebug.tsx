'use client'

import { useEffect, useState, type RefObject } from 'react'

import type { FaseJuego } from '../lib/juego'
import { NOMBRES_SONIDOS, type Sonidos } from '../lib/sonidos'
import type { InfoVideo } from '../hooks/useCamara'
import type { InfoAudio, InfoPersistencia } from '../hooks/useGrabacion'
import { ESTILO_DEBUG } from './estilos'

type EstadoRotacion = {
  segundosOrientacion: number
  fps: number
  videoPausado: boolean
  videoReadyState: number
  pistaReadyState: MediaStreamTrackState | '—'
  pistaMuted: boolean
}

export function EtiquetaDebug({
  infoVideo,
  mimeTypeElegido,
  estadoRecorder,
  faseJuego,
  infoAudio,
  sampleRateContexto,
  tipoSesionAudioActual,
  wakeLockActivo,
  avisoPausa,
  infoPersistencia,
  sonidos,
  vertical,
  ultimoCambioOrientacionRef,
  videoRef,
  videoStreamRef,
  fpsRef,
}: {
  infoVideo: InfoVideo
  mimeTypeElegido: string
  estadoRecorder: MediaRecorder['state']
  faseJuego: FaseJuego
  infoAudio: InfoAudio
  sampleRateContexto: number | null
  tipoSesionAudioActual: string
  wakeLockActivo: boolean
  avisoPausa: string | null
  infoPersistencia: InfoPersistencia | null
  sonidos: Sonidos | null
  vertical: boolean
  ultimoCambioOrientacionRef: RefObject<number>
  videoRef: RefObject<HTMLVideoElement | null>
  videoStreamRef: RefObject<MediaStream | null>
  fpsRef: RefObject<number>
}) {
  const [rotacion, setRotacion] = useState<EstadoRotacion>({
    segundosOrientacion: 0,
    fps: 0,
    videoPausado: false,
    videoReadyState: 0,
    pistaReadyState: '—',
    pistaMuted: false,
  })

  // DEBUG TEMPORAL: lee refs y actualiza la etiqueta una vez por segundo.
  useEffect(() => {
    const actualizar = () => {
      const ultimoCambio = ultimoCambioOrientacionRef.current
      const video = videoRef.current
      const pista = videoStreamRef.current?.getVideoTracks()[0]

      setRotacion({
        segundosOrientacion:
          ultimoCambio > 0
            ? Math.max(0, (performance.now() - ultimoCambio) / 1000)
            : 0,
        fps: fpsRef.current,
        videoPausado: video?.paused ?? true,
        videoReadyState: video?.readyState ?? 0,
        pistaReadyState: pista?.readyState ?? '—',
        pistaMuted: pista?.muted ?? false,
      })
    }

    const id = window.setInterval(actualizar, 1000)
    return () => window.clearInterval(id)
  }, [ultimoCambioOrientacionRef, videoRef, videoStreamRef, fpsRef])

  return (
    <div style={ESTILO_DEBUG}>
      {infoVideo.ancho} x {infoVideo.alto} · AR {infoVideo.relacion} · {infoVideo.facingMode} ·{' '}
      {mimeTypeElegido || 'sin mime'} · rec:{estadoRecorder} · fase:{faseJuego}
      <br />
      rot: {vertical ? 'vertical' : 'horizontal'} · hace{' '}
      {rotacion.segundosOrientacion.toFixed(1)}s · fps:{rotacion.fps} · video:
      {rotacion.videoPausado ? 'pausa' : 'play'} rs:{rotacion.videoReadyState} ·
      pista:{rotacion.pistaReadyState}
      {rotacion.pistaMuted ? ' muted' : ''}
      <br />
      audio: {infoAudio.sampleRate}Hz · {infoAudio.channelCount}ch · ec:
      {infoAudio.echoCancellation ? 'on' : 'off'} · ns:
      {infoAudio.noiseSuppression ? 'on' : 'off'} · agc:
      {infoAudio.autoGainControl ? 'on' : 'off'} · ctx:
      {sampleRateContexto ?? '—'}Hz · sesión:{tipoSesionAudioActual}
      <br />
      wakeLock: {wakeLockActivo ? 'activo' : 'inactivo'}
      {avisoPausa ? ` · ${avisoPausa}` : ''}
      <br />
      persist: {infoPersistencia?.persistido ?? '—'} · uso:{' '}
      {infoPersistencia?.usoMB ?? '—'} MB / cuota: {infoPersistencia?.cuotaMB ?? '—'} MB
      <br />
      sonidos:{' '}
      {NOMBRES_SONIDOS.map(
        (nombre) => `${nombre}:${sonidos?.cargados[nombre] ?? '—'}`
      ).join(' · ')}
    </div>
  )
}
