'use client'

import type { FaseJuego } from '../lib/juego'
import { NOMBRES_SONIDOS, type Sonidos } from '../lib/sonidos'
import type { InfoVideo } from '../hooks/useCamara'
import type { InfoAudio, InfoPersistencia } from '../hooks/useGrabacion'
import { ESTILO_DEBUG } from './estilos'

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
}) {
  return (
    <div style={ESTILO_DEBUG}>
      {infoVideo.ancho} x {infoVideo.alto} · AR {infoVideo.relacion} · {infoVideo.facingMode} ·{' '}
      {mimeTypeElegido || 'sin mime'} · rec:{estadoRecorder} · fase:{faseJuego}
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
