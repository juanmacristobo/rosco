'use client'

import type { RefObject } from 'react'

import { ESTILO_VIDEO_INVISIBLE } from './estilos'

export function VideoInvisible({
  videoRef,
  onInfoVideo,
}: {
  videoRef: RefObject<HTMLVideoElement | null>
  onInfoVideo: (video: HTMLVideoElement) => void
}) {
  return (
    <video
      ref={videoRef}
      playsInline
      muted
      onLoadedMetadata={(event) => onInfoVideo(event.currentTarget)}
      onResize={(event) => onInfoVideo(event.currentTarget)}
      style={ESTILO_VIDEO_INVISIBLE}
    />
  )
}
