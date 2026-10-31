'use client'
import { useRef, useState } from 'react'

export default function Camara() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [activa, setActiva] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function empezar() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: true,
      })
      const video = videoRef.current!
      video.srcObject = stream
      await video.play()
      setActiva(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir la cámara')
    }
  }

  return (
    <main style={{ height: '100dvh', background: '#000', position: 'relative' }}>
      <video
        ref={videoRef}
        playsInline
        muted
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      {!activa && (
        <button
          onClick={empezar}
          style={{
            position: 'absolute', inset: 0, margin: 'auto',
            width: 200, height: 70, fontSize: 24,
          }}
        >
          Empezar
        </button>
      )}
      {error && <p style={{ position: 'absolute', top: 20, color: 'red' }}>{error}</p>}
    </main>
  )
}