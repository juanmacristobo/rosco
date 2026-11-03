'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

import {
  borrarGrabacion,
  cargarGrabacion,
  guardarGrabacion,
} from '../lib/almacenamiento'
import {
  AUDIO_CONSTRAINTS,
  BITRATE_AUDIO,
  BITRATE_VIDEO,
  FPS_GRABACION,
  RESULTADOS_GRABADOS_MS,
} from '../lib/config'
import {
  crearMezclaAudio,
  elegirMimeType,
  establecerTipoSesionAudio,
  leerTipoSesionAudio,
  type MezclaAudio,
} from '../lib/grabacion'
import type { AccionJuego } from '../lib/juego'
import { crearSonidos, type Sonidos } from '../lib/sonidos'
import { ahoraMs, detenerStream, mensajeError } from './camaraUtils'

export type EstadoGrabacion = 'inactivo' | 'grabando' | 'revisando'

export type InfoGrabacion = {
  mimeType: string
  tamanoMB: string
  duracion: number
}

export type ResolucionGrabacion = {
  ancho: number
  alto: number
}

export type EstadoRespaldo = 'guardando' | 'ok' | 'error' | null

export type InfoPersistencia = {
  persistido: string
  usoMB: string
  cuotaMB: string
}

export type InfoAudio = {
  sampleRate: number
  channelCount: number
  echoCancellation: boolean
  noiseSuppression: boolean
  autoGainControl: boolean
}

function crearNombreArchivo(mimeType: string) {
  const ahora = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const fecha = `${ahora.getFullYear()}${pad(ahora.getMonth() + 1)}${pad(ahora.getDate())}`
  const hora = `${pad(ahora.getHours())}${pad(ahora.getMinutes())}`
  const extension = mimeType.includes('mp4') ? 'mp4' : 'webm'
  return `rosco-${fecha}-${hora}.${extension}`
}

function formatearFecha(ms: number) {
  return new Date(ms).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function useGrabacion({
  activa,
  canvasRef,
  videoStreamRef,
  desmontadoRef,
  dispatchRef,
  sonidosRef,
  ultimoNumeroCuentaRef,
  ultimoSegundoAvisoRef,
  mimeTypeElegido,
  setMimeTypeElegido,
  setTipoSesionAudioActual,
  setErrorAudio,
  debug,
  rafRef,
}: {
  activa: boolean
  canvasRef: RefObject<HTMLCanvasElement | null>
  videoStreamRef: RefObject<MediaStream | null>
  desmontadoRef: RefObject<boolean>
  dispatchRef: RefObject<(accion: AccionJuego) => void>
  sonidosRef: RefObject<Sonidos | null>
  ultimoNumeroCuentaRef: RefObject<number | null>
  ultimoSegundoAvisoRef: RefObject<number | null>
  mimeTypeElegido: string
  setMimeTypeElegido: (valor: string) => void
  setTipoSesionAudioActual: (valor: string) => void
  setErrorAudio: (valor: string | null) => void
  debug: boolean
  rafRef: RefObject<number | null>
}) {
  const audioStreamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamGrabacionRef = useRef<MediaStream | null>(null)
  const mezclaRef = useRef<MezclaAudio | null>(null)
  const tramoInicioRef = useRef(0)
  const acumuladoGrabadoRef = useRef(0)
  const pausadoRef = useRef(false)
  const duracionGrabacionRef = useRef(0)
  const intervaloRecRef = useRef<number | null>(null)
  const timeoutFinRef = useRef<number | null>(null)
  const urlGrabacionRef = useRef<string | null>(null)
  const preparandoGrabacionRef = useRef(false)
  const fileRef = useRef<File | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const wakeLockPendienteRef = useRef(false)

  const [estadoGrabacion, setEstadoGrabacion] = useState<EstadoGrabacion>('inactivo')
  const [estadoRecorder, setEstadoRecorder] =
    useState<MediaRecorder['state']>('inactive')
  const [recPausado, setRecPausado] = useState(false)
  const [avisoPausa, setAvisoPausa] = useState<string | null>(null)
  const [segundosGrabacion, setSegundosGrabacion] = useState(0)
  const [urlGrabacion, setUrlGrabacion] = useState<string | null>(null)
  const [infoGrabacion, setInfoGrabacion] = useState<InfoGrabacion | null>(null)
  const [errorGrabacion, setErrorGrabacion] = useState<string | null>(null)
  const [avisoSinAudio, setAvisoSinAudio] = useState(false)
  const [resolucionGrabacion, setResolucionGrabacion] =
    useState<ResolucionGrabacion | null>(null)
  const [puedeCompartir, setPuedeCompartir] = useState(false)
  const [errorCompartir, setErrorCompartir] = useState<string | null>(null)
  const [wakeLockActivo, setWakeLockActivo] = useState(false)
  const [cargandoRespaldo, setCargandoRespaldo] = useState(true)
  const [estadoRespaldo, setEstadoRespaldo] = useState<EstadoRespaldo>(null)
  const [avisoRecuperada, setAvisoRecuperada] = useState<string | null>(null)
  const [infoPersistencia, setInfoPersistencia] =
    useState<InfoPersistencia | null>(null)

  // DEBUG TEMPORAL: datos del micrófono y del AudioContext.
  const [infoAudio, setInfoAudio] = useState<InfoAudio>({
    sampleRate: 0,
    channelCount: 0,
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  })
  const [sampleRateContexto, setSampleRateContexto] = useState<number | null>(null)

  const actualizarInfoPersistencia = useCallback(async (pedirPersist: boolean) => {
    let persistido = pedirPersist ? 'no soportado' : '—'

    if (pedirPersist) {
      try {
        if (typeof navigator.storage?.persist === 'function') {
          persistido = (await navigator.storage.persist()) ? 'true' : 'false'
        }
      } catch {
        persistido = 'error'
      }
    }

    let usoMB = '—'
    let cuotaMB = '—'
    try {
      const estimacion = await navigator.storage?.estimate?.()
      if (estimacion) {
        usoMB = ((estimacion.usage ?? 0) / (1024 * 1024)).toFixed(1)
        cuotaMB = ((estimacion.quota ?? 0) / (1024 * 1024)).toFixed(1)
      }
    } catch {
      // Sin estimate: se deja el valor por defecto.
    }

    if (desmontadoRef.current) return

    setInfoPersistencia((prev) => ({
      persistido: pedirPersist ? persistido : (prev?.persistido ?? persistido),
      usoMB,
      cuotaMB,
    }))
  }, [desmontadoRef])

  const pedirWakeLock = useCallback(async () => {
    if (!navigator.wakeLock || wakeLockRef.current || wakeLockPendienteRef.current) return

    wakeLockPendienteRef.current = true
    try {
      const sentinel = await navigator.wakeLock.request('screen')
      if (desmontadoRef.current) {
        void sentinel.release().catch(() => undefined)
        return
      }

      wakeLockRef.current = sentinel
      setWakeLockActivo(true)

      sentinel.addEventListener('release', () => {
        if (wakeLockRef.current === sentinel) wakeLockRef.current = null
        if (!desmontadoRef.current) setWakeLockActivo(false)
      })
    } catch {
      // Sin Wake Lock disponible: la grabación sigue igual.
    } finally {
      wakeLockPendienteRef.current = false
    }
  }, [desmontadoRef])

  const soltarWakeLock = useCallback(() => {
    const sentinel = wakeLockRef.current
    wakeLockRef.current = null
    if (sentinel) void sentinel.release().catch(() => undefined)
    if (!desmontadoRef.current) setWakeLockActivo(false)
  }, [desmontadoRef])

  // DEBUG TEMPORAL: datos de la pista de audio del micrófono.
  function actualizarInfoAudio(stream: MediaStream) {
    const pista = stream.getAudioTracks()[0]
    const ajustes = pista?.getSettings()

    setInfoAudio({
      sampleRate: ajustes?.sampleRate ?? 0,
      channelCount: ajustes?.channelCount ?? 0,
      echoCancellation: ajustes?.echoCancellation ?? false,
      noiseSuppression: ajustes?.noiseSuppression ?? false,
      autoGainControl: ajustes?.autoGainControl ?? false,
    })
  }

  function liberarGrabacion() {
    soltarWakeLock()

    if (intervaloRecRef.current !== null) {
      clearInterval(intervaloRecRef.current)
      intervaloRecRef.current = null
    }

    acumuladoGrabadoRef.current = 0
    pausadoRef.current = false
    duracionGrabacionRef.current = 0
    tramoInicioRef.current = 0

    detenerStream(audioStreamRef.current)
    audioStreamRef.current = null

    streamGrabacionRef.current?.getTracks().forEach((track) => track.stop())
    streamGrabacionRef.current = null

    const mezcla = mezclaRef.current
    mezclaRef.current = null
    sonidosRef.current = null
    ultimoNumeroCuentaRef.current = null
    ultimoSegundoAvisoRef.current = null
    if (mezcla) void mezcla.ctx.close().catch(() => undefined)

    recorderRef.current = null
  }

  async function empezarGrabacion() {
    if (preparandoGrabacionRef.current || estadoGrabacion !== 'inactivo' || !activa) return

    const canvas = canvasRef.current
    if (!canvas) {
      setErrorGrabacion('No se encontró el canvas para grabar.')
      return
    }

    preparandoGrabacionRef.current = true
    setErrorGrabacion(null)
    setErrorAudio(null)
    setAvisoSinAudio(false)

    try {
      establecerTipoSesionAudio('play-and-record')
      setTipoSesionAudioActual(leerTipoSesionAudio())

      const mezcla = crearMezclaAudio(null)
      mezclaRef.current = mezcla
      sonidosRef.current = crearSonidos(mezcla.ctx, mezcla.destino)
      setSampleRateContexto(mezcla.ctx.sampleRate)
      await mezcla.ctx.resume()

      let tieneMicrofono = false
      try {
        const mic = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS })
        if (desmontadoRef.current) {
          detenerStream(mic)
          liberarGrabacion()
          return
        }

        audioStreamRef.current = mic
        actualizarInfoAudio(mic)
        const fuente = mezcla.ctx.createMediaStreamSource(mic)
        mezcla.conectar(fuente)
        tieneMicrofono = true
      } catch (e) {
        if (!desmontadoRef.current) setErrorAudio(mensajeError(e, 'micrófono'))
      }

      if (desmontadoRef.current) {
        liberarGrabacion()
        return
      }

      const stream = canvas.captureStream(FPS_GRABACION)
      if (tieneMicrofono) {
        const pistaAudio = mezcla.destino.stream.getAudioTracks()[0]
        if (pistaAudio) stream.addTrack(pistaAudio)
      }
      streamGrabacionRef.current = stream

      const mimeType = mimeTypeElegido || elegirMimeType()
      setMimeTypeElegido(mimeType)
      const opciones: MediaRecorderOptions = {
        videoBitsPerSecond: BITRATE_VIDEO,
        audioBitsPerSecond: BITRATE_AUDIO,
      }
      if (mimeType) opciones.mimeType = mimeType

      const recorder = new MediaRecorder(stream, opciones)
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      recorder.onstart = () => {
        if (!desmontadoRef.current) setEstadoRecorder('recording')
      }

      recorder.onerror = () => {
        if (desmontadoRef.current) return
        setErrorGrabacion('Ocurrió un error al grabar el video.')
        setEstadoRecorder('inactive')
      }

      recorder.onstop = () => {
        if (intervaloRecRef.current !== null) {
          clearInterval(intervaloRecRef.current)
          intervaloRecRef.current = null
        }

        const tipo = recorder.mimeType || mimeType || 'video/webm'
        const blob = new Blob(chunksRef.current, { type: tipo })
        const duracion =
          duracionGrabacionRef.current || tiempoGrabadoMs() / 1000
        chunksRef.current = []

        if (!desmontadoRef.current) {
          establecerTipoSesionAudio('playback')
          setTipoSesionAudioActual(leerTipoSesionAudio())
          const url = URL.createObjectURL(blob)
          urlGrabacionRef.current = url
          const archivo = new File([blob], crearNombreArchivo(tipo), {
            type: tipo.split(';')[0],
          })
          fileRef.current = archivo
          setPuedeCompartir(navigator.canShare?.({ files: [archivo] }) ?? false)
          setErrorCompartir(null)
          setResolucionGrabacion(null)
          setUrlGrabacion(url)
          setInfoGrabacion({
            mimeType: tipo,
            tamanoMB: (blob.size / (1024 * 1024)).toFixed(2),
            duracion,
          })
          setAvisoRecuperada(null)
          setEstadoRecorder('inactive')
          setRecPausado(false)
          setAvisoPausa(null)
          setEstadoGrabacion('revisando')
          setEstadoRespaldo('guardando')

          void (async () => {
            await actualizarInfoPersistencia(true)
            const ok = await guardarGrabacion({
              blob,
              mimeType: tipo,
              duracionMs: Math.round(duracion * 1000),
              creadoEn: Date.now(),
              nombre: archivo.name,
            })
            await actualizarInfoPersistencia(false)
            if (desmontadoRef.current) return
            setEstadoRespaldo(ok ? 'ok' : 'error')
          })()
        }

        liberarGrabacion()
      }

      acumuladoGrabadoRef.current = 0
      tramoInicioRef.current = ahoraMs()
      pausadoRef.current = false
      duracionGrabacionRef.current = 0
      setSegundosGrabacion(0)
      setRecPausado(false)
      setAvisoPausa(null)
      setAvisoSinAudio(!tieneMicrofono)
      setEstadoRecorder('recording')
      setEstadoGrabacion('grabando')

      recorder.start(1000)
      void pedirWakeLock()

      intervaloRecRef.current = window.setInterval(() => {
        setSegundosGrabacion(tiempoGrabadoMs() / 1000)
      }, 250)
    } catch (e) {
      const recorder = recorderRef.current
      if (recorder) {
        recorder.onstop = null
        recorder.ondataavailable = null
        recorder.onerror = null
        if (recorder.state !== 'inactive') {
          try {
            recorder.stop()
          } catch {
            // Ignorar: la grabación ya falló.
          }
        }
      }

      liberarGrabacion()

      if (!desmontadoRef.current) {
        setEstadoGrabacion('inactivo')
        setEstadoRecorder('inactive')
        setAvisoSinAudio(false)
        setErrorGrabacion(
          e instanceof Error
            ? `No se pudo iniciar la grabación: ${e.message}`
            : 'No se pudo iniciar la grabación.'
        )
        void pedirWakeLock()
      }
    } finally {
      preparandoGrabacionRef.current = false
    }
  }

  function detenerGrabacion() {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') return

    duracionGrabacionRef.current = tiempoGrabadoMs() / 1000
    setSegundosGrabacion(duracionGrabacionRef.current)
    soltarWakeLock()

    if (intervaloRecRef.current !== null) {
      clearInterval(intervaloRecRef.current)
      intervaloRecRef.current = null
    }

    try {
      recorder.stop()
    } catch {
      liberarGrabacion()
      if (!desmontadoRef.current) {
        setEstadoGrabacion('inactivo')
        setEstadoRecorder('inactive')
        setErrorGrabacion('No se pudo detener la grabación.')
      }
    }
  }

  function tiempoGrabadoMs() {
    if (pausadoRef.current) return acumuladoGrabadoRef.current
    return acumuladoGrabadoRef.current + (performance.now() - tramoInicioRef.current)
  }

  function pausarGrabacionPorTurno() {
    const recorder = recorderRef.current
    if (!recorder || recorder.state !== 'recording') return

    try {
      if (typeof recorder.pause !== 'function') {
        throw new Error('MediaRecorder.pause no está disponible')
      }

      recorder.pause()
      if (!pausadoRef.current) {
        acumuladoGrabadoRef.current += performance.now() - tramoInicioRef.current
        pausadoRef.current = true
      }
      if (!desmontadoRef.current) {
        setRecPausado(true)
        setEstadoRecorder('paused')
        setAvisoPausa(null)
      }
    } catch {
      if (!desmontadoRef.current) {
        setAvisoPausa('pausa no disponible: sigue grabando')
      }
    }
  }

  function reanudarGrabacionPorTurno() {
    const recorder = recorderRef.current
    if (!recorder || recorder.state !== 'paused') return

    try {
      recorder.resume()
      tramoInicioRef.current = performance.now()
      pausadoRef.current = false
      if (!desmontadoRef.current) {
        setRecPausado(false)
        setEstadoRecorder('recording')
        setAvisoPausa(null)
      }
    } catch {
      if (!desmontadoRef.current) {
        setAvisoPausa('no se pudo reanudar la grabación')
      }
    }
  }

  function cancelarFinGrabacion() {
    if (timeoutFinRef.current !== null) {
      clearTimeout(timeoutFinRef.current)
      timeoutFinRef.current = null
    }
  }

  function programarFinGrabacion() {
    cancelarFinGrabacion()
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') {
      liberarGrabacion()
      if (!desmontadoRef.current) {
        setEstadoGrabacion('inactivo')
        setEstadoRecorder('inactive')
        setRecPausado(false)
      }
      return
    }

    timeoutFinRef.current = window.setTimeout(() => {
      timeoutFinRef.current = null
      detenerGrabacion()
    }, RESULTADOS_GRABADOS_MS)
  }

  function detenerYReiniciar() {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      detenerGrabacion()
    } else {
      liberarGrabacion()
      if (!desmontadoRef.current) {
        setEstadoGrabacion('inactivo')
        setEstadoRecorder('inactive')
        setRecPausado(false)
      }
    }

    dispatchRef.current({ tipo: 'REINICIAR' })
  }

  function grabarDeNuevo() {
    if (!window.confirm('¿Descartar este video? Si no lo guardaste, se pierde.')) return

    if (urlGrabacionRef.current) {
      URL.revokeObjectURL(urlGrabacionRef.current)
      urlGrabacionRef.current = null
    }

    void borrarGrabacion()

    setUrlGrabacion(null)
    setInfoGrabacion(null)
    setErrorGrabacion(null)
    setAvisoSinAudio(false)
    setSegundosGrabacion(0)
    setResolucionGrabacion(null)
    fileRef.current = null
    setPuedeCompartir(false)
    setErrorCompartir(null)
    setEstadoRespaldo(null)
    setAvisoRecuperada(null)
    setEstadoGrabacion('inactivo')
    setRecPausado(false)
    setAvisoPausa(null)
    duracionGrabacionRef.current = 0
    acumuladoGrabadoRef.current = 0
    pausadoRef.current = false
    dispatchRef.current({ tipo: 'REINICIAR' })
  }

  function compartir() {
    const archivo = fileRef.current
    if (!archivo) return

    // Sin await ni trabajo previo: la activación del usuario se pierde si no.
    navigator.share({ files: [archivo], title: 'Rosco' }).catch((e: unknown) => {
      if (e instanceof Error && e.name === 'AbortError') return
      if (desmontadoRef.current) return
      setErrorCompartir(
        e instanceof Error
          ? `No se pudo compartir el video: ${e.message}`
          : 'No se pudo compartir el video.'
      )
    })
  }

  function descargar() {
    const archivo = fileRef.current
    const url = urlGrabacionRef.current
    if (!archivo || !url) return

    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = archivo.name
    document.body.appendChild(enlace)
    enlace.click()
    document.body.removeChild(enlace)
  }

  useEffect(() => {
    desmontadoRef.current = false

    return () => {
      desmontadoRef.current = true
      soltarWakeLock()

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }

      if (intervaloRecRef.current !== null) {
        clearInterval(intervaloRecRef.current)
        intervaloRecRef.current = null
      }

      if (timeoutFinRef.current !== null) {
        clearTimeout(timeoutFinRef.current)
        timeoutFinRef.current = null
      }

      const recorder = recorderRef.current
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop()
        } catch {
          // Ignorar: el componente ya se está desmontando.
        }
      }
      recorderRef.current = null

      streamGrabacionRef.current?.getTracks().forEach((track) => track.stop())
      streamGrabacionRef.current = null

      const mezcla = mezclaRef.current
      mezclaRef.current = null
      sonidosRef.current = null
      if (mezcla) void mezcla.ctx.close().catch(() => undefined)

      if (urlGrabacionRef.current) {
        URL.revokeObjectURL(urlGrabacionRef.current)
        urlGrabacionRef.current = null
      }

      detenerStream(videoStreamRef.current)
      detenerStream(audioStreamRef.current)
      videoStreamRef.current = null
      audioStreamRef.current = null
    }
  }, [soltarWakeLock])

  useEffect(() => {
    let cancelado = false

    void (async () => {
      const registro = await cargarGrabacion()
      if (cancelado || desmontadoRef.current) return

      if (registro) {
        const tipo = registro.mimeType || registro.blob.type || 'video/webm'
        const archivo = new File([registro.blob], registro.nombre, {
          type: tipo.split(';')[0],
        })
        const url = URL.createObjectURL(archivo)
        urlGrabacionRef.current = url
        fileRef.current = archivo
        setPuedeCompartir(navigator.canShare?.({ files: [archivo] }) ?? false)
        setErrorCompartir(null)
        setUrlGrabacion(url)
        setInfoGrabacion({
          mimeType: tipo,
          tamanoMB: (registro.blob.size / (1024 * 1024)).toFixed(2),
          duracion: registro.duracionMs / 1000,
        })
        setAvisoRecuperada(
          `Recuperamos tu última grabación (${formatearFecha(registro.creadoEn)})`
        )
        setEstadoGrabacion('revisando')
      }

      setCargandoRespaldo(false)
    })()

    return () => {
      cancelado = true
    }
  }, [desmontadoRef])

  useEffect(() => {
    if (!debug) return
    void actualizarInfoPersistencia(false)
  }, [debug, actualizarInfoPersistencia])

  // Wake Lock: al volver a la pestaña, si se sigue grabando, se pide de nuevo.
  useEffect(() => {
    const alCambiarVisibilidad = () => {
      if (document.visibilityState !== 'visible') return
      if (estadoGrabacion !== 'grabando') return
      if (wakeLockRef.current) return
      void pedirWakeLock()
    }

    document.addEventListener('visibilitychange', alCambiarVisibilidad)

    return () => document.removeEventListener('visibilitychange', alCambiarVisibilidad)
  }, [estadoGrabacion, pedirWakeLock])

  return {
    estadoGrabacion,
    estadoRecorder,
    recPausado,
    avisoPausa,
    segundosGrabacion,
    urlGrabacion,
    infoGrabacion,
    errorGrabacion,
    avisoSinAudio,
    resolucionGrabacion,
    setResolucionGrabacion,
    puedeCompartir,
    errorCompartir,
    wakeLockActivo,
    cargandoRespaldo,
    estadoRespaldo,
    avisoRecuperada,
    infoPersistencia,
    infoAudio,
    sampleRateContexto,
    empezarGrabacion,
    detenerGrabacion,
    pausarGrabacionPorTurno,
    reanudarGrabacionPorTurno,
    programarFinGrabacion,
    cancelarFinGrabacion,
    detenerYReiniciar,
    grabarDeNuevo,
    compartir,
    descargar,
    pedirWakeLock,
    soltarWakeLock,
  }
}
