'use client'

import type { InfoGrabacion, ResolucionGrabacion } from '../hooks/useGrabacion'
import { BotonFlotante } from './BotonFlotante'
import { formatearTiempo } from './formato'
import {
  ESTILO_AVISO_RECUPERADA,
  ESTILO_ERROR_COMPARTIR,
  ESTILO_ESTADO_RESPALDO,
  ESTILO_INFO_REVISION,
  ESTILO_PANTALLA_REVISION,
  ESTILO_VIDEO_REVISION,
} from './estilos'

export function PantallaRevision({
  urlGrabacion,
  avisoRecuperada,
  estadoRespaldo,
  infoGrabacion,
  resolucionGrabacion,
  errorCompartir,
  puedeCompartir,
  onResolucion,
  onCompartir,
  onDescargar,
  onGrabarDeNuevo,
}: {
  urlGrabacion: string
  avisoRecuperada: string | null
  estadoRespaldo: 'guardando' | 'ok' | 'error' | null
  infoGrabacion: InfoGrabacion | null
  resolucionGrabacion: ResolucionGrabacion | null
  errorCompartir: string | null
  puedeCompartir: boolean
  onResolucion: (ancho: number, alto: number) => void
  onCompartir: () => void
  onDescargar: () => void
  onGrabarDeNuevo: () => void
}) {
  const mbPorMinuto =
    infoGrabacion && infoGrabacion.duracion > 0
      ? ((parseFloat(infoGrabacion.tamanoMB) * 60) / infoGrabacion.duracion).toFixed(2)
      : '—'

  return (
    <div style={ESTILO_PANTALLA_REVISION}>
      {avisoRecuperada && <p style={ESTILO_AVISO_RECUPERADA}>{avisoRecuperada}</p>}

      {estadoRespaldo && (
        <p
          style={{
            ...ESTILO_ESTADO_RESPALDO,
            color: estadoRespaldo === 'error' ? '#ffd60a' : '#fff',
          }}
        >
          {estadoRespaldo === 'guardando' && 'Guardando copia de respaldo…'}
          {estadoRespaldo === 'ok' && '✓ Copia de respaldo guardada'}
          {estadoRespaldo === 'error' && '⚠ No se pudo guardar la copia de respaldo'}
        </p>
      )}

      <video
        controls
        playsInline
        src={urlGrabacion}
        onLoadedMetadata={(event) => {
          const video = event.currentTarget
          onResolucion(video.videoWidth, video.videoHeight)
        }}
        style={ESTILO_VIDEO_REVISION}
      />

      <div style={ESTILO_INFO_REVISION}>
        <span>Formato: {infoGrabacion?.mimeType || '—'}</span>
        <span>Tamaño: {infoGrabacion?.tamanoMB ?? '0.00'} MB</span>
        <span>Duración: {formatearTiempo(infoGrabacion?.duracion ?? 0)}</span>
        <span>
          Resolución:{' '}
          {resolucionGrabacion
            ? `${resolucionGrabacion.ancho} x ${resolucionGrabacion.alto}`
            : '—'}
        </span>
        <span>MB/min: {mbPorMinuto}</span>
      </div>

      {errorCompartir && (
        <p role="alert" style={ESTILO_ERROR_COMPARTIR}>
          {errorCompartir}
        </p>
      )}

      {puedeCompartir && (
        <BotonFlotante variante="revisionCompartir" onClick={onCompartir}>
          Compartir / Guardar
        </BotonFlotante>
      )}

      <BotonFlotante variante="revisionClaro" onClick={onDescargar}>
        Descargar
      </BotonFlotante>

      <BotonFlotante variante="revisionClaro" onClick={onGrabarDeNuevo}>
        Descartar y grabar de nuevo
      </BotonFlotante>
    </div>
  )
}
