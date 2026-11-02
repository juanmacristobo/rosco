'use client'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react'

import Banco from './Banco'
import {
  borrarGrabacion,
  cargarGrabacion,
  guardarGrabacion,
} from './lib/almacenamiento'
import {
  AUDIO_CONSTRAINTS,
  BITRATE_AUDIO,
  BITRATE_VIDEO,
  CANVAS_ALTO,
  CANVAS_ANCHO,
  FPS_GRABACION,
  RESULTADOS_GRABADOS_MS,
  SEGUNDOS_ALERTA_FINAL,
} from './lib/config'
import { crearJugadoresDemo } from './lib/datosDemo'
import { dibujarFrame, type DatosDibujo } from './lib/dibujo'
import {
  crearJuego,
  reducirJuego,
  resultados,
  type AccionJuego,
  type FaseJuego,
  type Juego,
} from './lib/juego'
import {
  crearMezclaAudio,
  elegirMimeType,
  establecerTipoSesionAudio,
  leerTipoSesionAudio,
  type MezclaAudio,
} from './lib/grabacion'
import {
  crearSonidos,
  NOMBRES_SONIDOS,
  type NombreSonido,
  type Sonidos,
} from './lib/sonidos'

type FacingMode = 'environment' | 'user'
type EstadoGrabacion = 'inactivo' | 'grabando' | 'revisando'

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

function formatearTiempo(segundos: number) {
  const total = Math.max(0, Math.floor(segundos))
  const minutos = Math.floor(total / 60)
  const resto = total % 60
  return `${String(minutos).padStart(2, '0')}:${String(resto).padStart(2, '0')}`
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

function construirDatosDibujo(juego: Juego, ahora: number): DatosDibujo {
  const jugador = juego.jugadores[juego.turno]
  const letra = jugador && !jugador.terminado ? jugador.rosco[jugador.letraActual] : undefined
  const cuentaRegresiva =
    juego.fase === 'cuentaRegresiva' && juego.finFaseTs !== null
      ? Math.max(1, Math.ceil((juego.finFaseTs - ahora) / 1000))
      : null

  return {
    estados: jugador ? jugador.rosco.map((item) => item.estado) : [],
    letraActiva: jugador && !jugador.terminado ? jugador.letraActual : -1,
    jugador: jugador?.nombre ?? '',
    segundos: Math.ceil((jugador?.tiempoRestanteMs ?? 0) / 1000),
    pista: letra
      ? `${letra.tipo === 'empieza' ? 'Empieza' : 'Contiene'} con la ${letra.letra}: ${letra.pista}`
      : '',
    fase: juego.fase,
    marcador: juego.jugadores.map((actual, indice) => ({
      nombre: actual.nombre,
      segundos: Math.ceil(actual.tiempoRestanteMs / 1000),
      enTurno: indice === juego.turno,
    })),
    cartel:
      juego.fase === 'cuentaRegresiva' || juego.fase === 'esperandoTurno'
        ? `TURNO DE ${(jugador?.nombre ?? '').toUpperCase()}`
        : null,
    cuentaRegresiva,
    resultados: juego.fase === 'fin' ? resultados(juego) : null,
  }
}

function textoRespuestaOperador(juego: Juego): string | null {
  if (juego.fase !== 'cuentaRegresiva' && juego.fase !== 'jugando') return null
  const jugador = juego.jugadores[juego.turno]
  if (!jugador || jugador.terminado) return null
  const letra = jugador.rosco[jugador.letraActual]
  if (!letra) return null
  return `${letra.letra} · ${letra.respuesta}`.toUpperCase()
}

function sonidoDeAccion(accion: AccionJuego): NombreSonido | null {
  switch (accion.tipo) {
    case 'CORRECTA':
      return 'acierto'
    case 'ERROR':
      return 'error'
    case 'PASAPALABRA':
      return 'pasapalabra'
    default:
      return null
  }
}

function suscribirDebug() {
  return () => {}
}

function leerDebug() {
  return new URLSearchParams(window.location.search).get('debug') === '1'
}

function leerDebugServidor() {
  return false
}

const ESTILO_BOTON_BANCO: CSSProperties = {
  width: 200,
  height: 48,
  border: '1px solid rgba(255, 255, 255, 0.8)',
  borderRadius: 10,
  background: 'rgba(0, 0, 0, 0.55)',
  color: '#fff',
  fontSize: 17,
  fontWeight: 700,
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
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
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamGrabacionRef = useRef<MediaStream | null>(null)
  const mezclaRef = useRef<MezclaAudio | null>(null)
  const sonidosRef = useRef<Sonidos | null>(null)
  const ultimoNumeroCuentaRef = useRef<number | null>(null)
  const ultimoSegundoAvisoRef = useRef<number | null>(null)
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
  const juegoRef = useRef<Juego>(crearJuego(crearJugadoresDemo()))
  const dispatchRef = useRef<(accion: AccionJuego) => void>(() => {})
  const respuestaOperadorRef = useRef<string | null>(null)

  const [activa, setActiva] = useState(false)
  const [facingMode, setFacingMode] = useState<FacingMode>('environment')
  const [cambiando, setCambiando] = useState(false)
  const [iniciando, setIniciando] = useState(false)
  const [errorCamara, setErrorCamara] = useState<string | null>(null)
  const [errorAudio, setErrorAudio] = useState<string | null>(null)
  const [vertical, setVertical] = useState(false)
  const [yaHorizontal, setYaHorizontal] = useState(false)
  const [mostrarBanco, setMostrarBanco] = useState(false)

  const [estadoGrabacion, setEstadoGrabacion] = useState<EstadoGrabacion>('inactivo')
  const [estadoRecorder, setEstadoRecorder] = useState<MediaRecorder['state']>('inactive')
  const [faseJuego, setFaseJuego] = useState<FaseJuego>('listo')
  const [turnoJuego, setTurnoJuego] = useState(0)
  const [respuestaOperador, setRespuestaOperador] = useState<string | null>(null)
  const [recPausado, setRecPausado] = useState(false)
  const [avisoPausa, setAvisoPausa] = useState<string | null>(null)
  const [mimeTypeElegido, setMimeTypeElegido] = useState('')
  const [segundosGrabacion, setSegundosGrabacion] = useState(0)
  const [urlGrabacion, setUrlGrabacion] = useState<string | null>(null)
  const [infoGrabacion, setInfoGrabacion] = useState<{
    mimeType: string
    tamanoMB: string
    duracion: number
  } | null>(null)
  const [errorGrabacion, setErrorGrabacion] = useState<string | null>(null)
  const [avisoSinAudio, setAvisoSinAudio] = useState(false)
  const [resolucionGrabacion, setResolucionGrabacion] = useState<{
    ancho: number
    alto: number
  } | null>(null)
  const [puedeCompartir, setPuedeCompartir] = useState(false)
  const [errorCompartir, setErrorCompartir] = useState<string | null>(null)
  const [wakeLockActivo, setWakeLockActivo] = useState(false)
  const [cargandoRespaldo, setCargandoRespaldo] = useState(true)
  const [estadoRespaldo, setEstadoRespaldo] = useState<'guardando' | 'ok' | 'error' | null>(
    null
  )
  const [avisoRecuperada, setAvisoRecuperada] = useState<string | null>(null)
  const [infoPersistencia, setInfoPersistencia] = useState<{
    persistido: string
    usoMB: string
    cuotaMB: string
  } | null>(null)

  const debug = useSyncExternalStore(suscribirDebug, leerDebug, leerDebugServidor)
  const nombreTurno = juegoRef.current.jugadores[turnoJuego]?.nombre ?? ''

  function manejarTransicion(anterior: Juego, siguiente: Juego) {
    if (anterior.fase === siguiente.fase) return

    if (anterior.fase === 'listo' && siguiente.fase === 'cuentaRegresiva') {
      void pedirWakeLock()
      void empezarGrabacion()
      return
    }

    if (anterior.fase === 'cola' && siguiente.fase === 'esperandoTurno') {
      pausarGrabacionPorTurno()
      return
    }

    if (anterior.fase === 'esperandoTurno' && siguiente.fase === 'cuentaRegresiva') {
      reanudarGrabacionPorTurno()
      return
    }

    if (anterior.fase === 'cola' && siguiente.fase === 'fin') {
      programarFinGrabacion()
      return
    }

    if (siguiente.fase === 'listo') {
      cancelarFinGrabacion()
    }
  }

  // Capa de efectos de sonido: reacciona a las acciones aceptadas y a los
  // cambios de fase, sin usar estado de React por frame.
  function reproducirEfectosSonido(
    anterior: Juego,
    siguiente: Juego,
    accion: AccionJuego
  ) {
    const sonidos = sonidosRef.current
    if (!sonidos || accion.tipo === 'REINICIAR') return

    const ahora = accion.ahora

    if (anterior.fase === 'jugando') {
      const sonido = sonidoDeAccion(accion)
      if (sonido) {
        const jugadorAntes = anterior.jugadores[anterior.turno]
        const jugadorDespues = siguiente.jugadores[anterior.turno]
        const indice = jugadorAntes?.letraActual ?? -1
        const letraAntes = jugadorAntes?.rosco[indice]
        const letraDespues = jugadorDespues?.rosco[indice]
        if (
          letraAntes &&
          letraDespues &&
          letraAntes.estado !== letraDespues.estado
        ) {
          sonidos.reproducir(sonido)
        }
      }
    }

    if (anterior.fase === 'jugando' && siguiente.fase !== 'jugando') {
      const antes = anterior.jugadores[anterior.turno]
      const despues = siguiente.jugadores[anterior.turno]
      if (
        antes &&
        despues &&
        antes.tiempoRestanteMs > 0 &&
        despues.tiempoRestanteMs <= 0
      ) {
        ultimoSegundoAvisoRef.current = null
        sonidos.reproducir('tiempoAgotado')
      }
    }

    if (siguiente.fase !== anterior.fase) {
      if (siguiente.fase === 'cuentaRegresiva') {
        ultimoNumeroCuentaRef.current = null
      }

      if (anterior.fase === 'cuentaRegresiva' && siguiente.fase === 'jugando') {
        ultimoSegundoAvisoRef.current = null
        sonidos.reproducir('ya')
      }

      if (siguiente.fase === 'fin') {
        sonidos.reproducir('fin')
      }
    }

    if (siguiente.fase === 'cuentaRegresiva' && siguiente.finFaseTs !== null) {
      const numero = Math.max(
        1,
        Math.ceil((siguiente.finFaseTs - ahora) / 1000)
      )
      if (numero !== ultimoNumeroCuentaRef.current) {
        ultimoNumeroCuentaRef.current = numero
        sonidos.reproducir('tic')
      }
    }

    if (siguiente.fase === 'jugando') {
      if (anterior.fase !== 'jugando' || anterior.turno !== siguiente.turno) {
        ultimoSegundoAvisoRef.current = null
      }

      const jugador = siguiente.jugadores[siguiente.turno]
      const segundos = Math.ceil((jugador?.tiempoRestanteMs ?? 0) / 1000)
      if (
        segundos > 0 &&
        segundos <= SEGUNDOS_ALERTA_FINAL &&
        segundos !== ultimoSegundoAvisoRef.current
      ) {
        ultimoSegundoAvisoRef.current = segundos
        sonidos.reproducir('tic')
      }
    }
  }

  function dispatch(accion: AccionJuego) {
    const anterior = juegoRef.current
    const siguiente = reducirJuego(anterior, accion)
    juegoRef.current = siguiente

    if (siguiente.fase !== anterior.fase || siguiente.turno !== anterior.turno) {
      setFaseJuego(siguiente.fase)
      setTurnoJuego(siguiente.turno)
    }

    const respuesta = textoRespuestaOperador(siguiente)
    if (respuesta !== respuestaOperadorRef.current) {
      respuestaOperadorRef.current = respuesta
      setRespuestaOperador(respuesta)
    }

    manejarTransicion(anterior, siguiente)
    reproducirEfectosSonido(anterior, siguiente, accion)
  }

  useEffect(() => {
    dispatchRef.current = dispatch
  })

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
  }, [])

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
  }, [])

  const soltarWakeLock = useCallback(() => {
    const sentinel = wakeLockRef.current
    wakeLockRef.current = null
    if (sentinel) void sentinel.release().catch(() => undefined)
    if (!desmontadoRef.current) setWakeLockActivo(false)
  }, [])

  // DEBUG TEMPORAL: datos del stream para diagnosticar el encuadre.
  const [infoVideo, setInfoVideo] = useState({
    ancho: 0,
    alto: 0,
    relacion: '0.00',
    facingMode: '—',
  })

  // DEBUG TEMPORAL: datos del micrófono y del AudioContext.
  const [infoAudio, setInfoAudio] = useState({
    sampleRate: 0,
    channelCount: 0,
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  })
  const [sampleRateContexto, setSampleRateContexto] = useState<number | null>(null)
  const [tipoSesionAudioActual, setTipoSesionAudioActual] = useState('no soportado')

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
  }, [])

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

  useEffect(() => {
    const consulta = window.matchMedia('(orientation: portrait)')
    const actualizar = () => {
      setVertical(consulta.matches)
      // El aviso es solo para el primer ingreso: una vez que se llegó a
      // horizontal, no vuelve a mostrarse aunque el teléfono se gire.
      if (!consulta.matches) setYaHorizontal(true)
    }

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
      const ahora = performance.now()
      dispatchRef.current({ tipo: 'TICK', ahora })
      dibujarFrame(ctx, video, construirDatosDibujo(juegoRef.current, ahora))
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
      tramoInicioRef.current = performance.now()
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

    dispatch({ tipo: 'REINICIAR' })
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
    dispatch({ tipo: 'REINICIAR' })
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

  const mbPorMinuto =
    infoGrabacion && infoGrabacion.duracion > 0
      ? ((parseFloat(infoGrabacion.tamanoMB) * 60) / infoGrabacion.duracion).toFixed(2)
      : '—'

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

      {/* DEBUG TEMPORAL: solo con ?debug=1. Borrar este bloque cuando termine el diagnóstico. */}
      {debug && (
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
            (nombre) => `${nombre}:${sonidosRef.current?.cargados[nombre] ?? '—'}`
          ).join(' · ')}
        </div>
      )}

      {respuestaOperador && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 0px) + 56px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 5,
            padding: '6px 12px',
            borderRadius: 8,
            background: 'rgba(0, 0, 0, 0.68)',
            color: '#fff',
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: 0.5,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {respuestaOperador}
        </div>
      )}

      {estadoGrabacion === 'grabando' && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            borderRadius: 999,
            background: 'rgba(0, 0, 0, 0.6)',
            color: '#fff',
            fontFamily: 'monospace',
            fontSize: 18,
            fontWeight: 700,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {recPausado ? (
            <>⏸ PAUSA</>
          ) : (
            <>
              <span style={{ color: '#ff3b30' }}>●</span> REC{' '}
              {formatearTiempo(segundosGrabacion)}
            </>
          )}
        </div>
      )}

      {estadoGrabacion === 'grabando' && avisoSinAudio && (
        <div
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 100px)',
            zIndex: 2,
            padding: '8px 12px',
            borderRadius: 10,
            background: 'rgba(0, 0, 0, 0.7)',
            color: '#fff',
            fontSize: 14,
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          Grabando sin micrófono: el video no tendrá audio.
        </div>
      )}

      {!activa && estadoGrabacion !== 'revisando' && !cargandoRespaldo && !mostrarBanco && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: 16,
            boxSizing: 'border-box',
          }}
        >
          <button
            type="button"
            onClick={empezar}
            disabled={iniciando}
            style={{
              width: 200,
              height: 70,
              fontSize: 24,
              touchAction: 'manipulation',
            }}
          >
            {iniciando ? 'Abriendo…' : 'Empezar'}
          </button>

          <button
            type="button"
            onClick={() => setMostrarBanco(true)}
            disabled={iniciando}
            style={ESTILO_BOTON_BANCO}
          >
            Banco de palabras
          </button>
        </div>
      )}

      {activa && estadoGrabacion !== 'revisando' && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'flex-end',
            gap: 10,
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
              height: 32,
              padding: '0 10px',
              border: 'none',
              borderRadius: 999,
              background: 'rgba(255, 255, 255, 0.92)',
              color: '#000',
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
              opacity: cambiando || iniciando ? 0.6 : 1,
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              pointerEvents: 'auto',
            }}
          >
            {cambiando ? 'Cambiando…' : 'Cambiar cámara'}
          </button>

          {estadoGrabacion === 'grabando' && (
            <button
              type="button"
              onClick={detenerYReiniciar}
              style={{
                height: 32,
                padding: '0 10px',
                border: 'none',
                borderRadius: 999,
                background: '#ffffff',
                color: '#d62839',
                fontSize: 12,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                pointerEvents: 'auto',
              }}
            >
              Detener
            </button>
          )}
        </div>
      )}

      {activa && faseJuego === 'listo' && estadoGrabacion === 'inactivo' && (
        <button
          type="button"
          onClick={() => dispatch({ tipo: 'INICIAR', ahora: performance.now() })}
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)',
            zIndex: 4,
            minWidth: 300,
            minHeight: 78,
            padding: '0 32px',
            border: 'none',
            borderRadius: 24,
            background: '#ffffff',
            color: '#000',
            fontSize: 28,
            fontWeight: 800,
            boxShadow: '0 6px 24px rgba(0, 0, 0, 0.45)',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Iniciar partida
        </button>
      )}

      {faseJuego === 'jugando' && estadoGrabacion !== 'revisando' && (
        <>
          <div
            style={{
              position: 'absolute',
              left: 'calc(env(safe-area-inset-left, 0px) + 16px)',
              bottom: 'calc(env(safe-area-inset-bottom, 0px) + 104px)',
              zIndex: 4,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <button
              type="button"
              onClick={() => dispatch({ tipo: 'ERROR', ahora: performance.now() })}
              style={{
                minWidth: 150,
                minHeight: 72,
                padding: '0 16px',
                border: 'none',
                borderRadius: 24,
                background: 'rgba(214, 40, 57, 0.82)',
                color: '#ffffff',
                fontSize: 21,
                fontWeight: 800,
                boxShadow: '0 4px 18px rgba(0, 0, 0, 0.4)',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Error
            </button>

            <button
              type="button"
              onClick={() => dispatch({ tipo: 'PASAPALABRA', ahora: performance.now() })}
              style={{
                minWidth: 150,
                minHeight: 72,
                padding: '0 16px',
                border: 'none',
                borderRadius: 24,
                background: 'rgba(244, 180, 0, 0.85)',
                color: '#1a1a1a',
                fontSize: 21,
                fontWeight: 800,
                boxShadow: '0 4px 18px rgba(0, 0, 0, 0.4)',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Pasapalabra
            </button>
          </div>

          <button
            type="button"
            onClick={() => dispatch({ tipo: 'CORRECTA', ahora: performance.now() })}
            style={{
              position: 'absolute',
              right: 'calc(env(safe-area-inset-right, 0px) + 16px)',
              bottom: 'calc(env(safe-area-inset-bottom, 0px) + 104px)',
              zIndex: 4,
              minWidth: 188,
              minHeight: 112,
              padding: '0 20px',
              border: 'none',
              borderRadius: 28,
              background: 'rgba(34, 168, 69, 0.82)',
              color: '#ffffff',
              fontSize: 28,
              fontWeight: 800,
              boxShadow: '0 6px 24px rgba(0, 0, 0, 0.4)',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Correcta
          </button>
        </>
      )}

      {activa && faseJuego === 'esperandoTurno' && estadoGrabacion !== 'revisando' && (
        <button
          type="button"
          onClick={() => dispatch({ tipo: 'SIGUIENTE_TURNO', ahora: performance.now() })}
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)',
            zIndex: 4,
            minWidth: 360,
            minHeight: 84,
            padding: '0 28px',
            border: 'none',
            borderRadius: 24,
            background: '#ffffff',
            color: '#000',
            fontSize: 26,
            fontWeight: 800,
            boxShadow: '0 6px 24px rgba(0, 0, 0, 0.45)',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Empezar turno de {nombreTurno}
        </button>
      )}

      {faseJuego === 'fin' && estadoGrabacion === 'inactivo' && (
        <button
          type="button"
          onClick={() => dispatch({ tipo: 'REINICIAR' })}
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)',
            zIndex: 4,
            minWidth: 220,
            minHeight: 68,
            padding: '0 28px',
            border: 'none',
            borderRadius: 24,
            background: '#ffffff',
            color: '#000',
            fontSize: 24,
            fontWeight: 800,
            boxShadow: '0 6px 24px rgba(0, 0, 0, 0.45)',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Reiniciar
        </button>
      )}

      {(errorCamara || errorAudio || errorGrabacion) && (
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
          {errorGrabacion && (
            <p style={{ margin: errorCamara || errorAudio ? '8px 0 0' : 0 }}>{errorGrabacion}</p>
          )}
        </div>
      )}

      {vertical && !activa && !yaHorizontal && !mostrarBanco && (
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
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 20,
            }}
          >
            <p style={{ margin: 0 }}>Girá el teléfono a horizontal</p>
            <button
              type="button"
              onClick={() => setMostrarBanco(true)}
              style={ESTILO_BOTON_BANCO}
            >
              Banco de palabras
            </button>
          </div>
        </div>
      )}

      {estadoGrabacion === 'revisando' && urlGrabacion && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            paddingRight: 'calc(env(safe-area-inset-right, 0px) + 16px)',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
            paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 16px)',
            background: 'rgba(0, 0, 0, 0.95)',
          }}
        >
          {avisoRecuperada && (
            <p
              style={{
                margin: 0,
                padding: '10px 14px',
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#fff',
                fontSize: 15,
                lineHeight: 1.4,
              }}
            >
              {avisoRecuperada}
            </p>
          )}

          {estadoRespaldo && (
            <p
              style={{
                margin: 0,
                color: estadoRespaldo === 'error' ? '#ffd60a' : '#fff',
                fontSize: 14,
                lineHeight: 1.4,
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
              setResolucionGrabacion({
                ancho: video.videoWidth,
                alto: video.videoHeight,
              })
            }}
            style={{
              flex: 1,
              minHeight: 0,
              width: '100%',
              objectFit: 'contain',
              background: '#000',
              borderRadius: 12,
            }}
          />

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px 16px',
              color: '#fff',
              fontFamily: 'monospace',
              fontSize: 13,
            }}
          >
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
            <p
              role="alert"
              style={{
                margin: 0,
                padding: '10px 14px',
                borderRadius: 10,
                background: 'rgba(214, 40, 57, 0.9)',
                color: '#fff',
                fontSize: 15,
                lineHeight: 1.4,
              }}
            >
              {errorCompartir}
            </p>
          )}

          {puedeCompartir && (
            <button
              type="button"
              onClick={compartir}
              style={{
                minHeight: 64,
                border: 'none',
                borderRadius: 999,
                background: '#d62839',
                color: '#fff',
                fontSize: 20,
                fontWeight: 700,
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Compartir / Guardar
            </button>
          )}

          <button
            type="button"
            onClick={descargar}
            style={{
              minHeight: 60,
              border: 'none',
              borderRadius: 999,
              background: 'rgba(255, 255, 255, 0.92)',
              color: '#000',
              fontSize: 18,
              fontWeight: 700,
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Descargar
          </button>

          <button
            type="button"
            onClick={grabarDeNuevo}
            style={{
              minHeight: 60,
              border: 'none',
              borderRadius: 999,
              background: 'rgba(255, 255, 255, 0.92)',
              color: '#000',
              fontSize: 18,
              fontWeight: 700,
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Descartar y grabar de nuevo
          </button>
        </div>
      )}

      {mostrarBanco && <Banco onVolver={() => setMostrarBanco(false)} />}
    </main>
  )
}
