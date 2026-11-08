'use client'

import { useEffect, useRef, useState } from 'react'

import Banco from './Banco'
import Preparacion from './Preparacion'
import { AvisoOrientacion } from './componentes/AvisoOrientacion'
import { AvisoSinAudio } from './componentes/AvisoSinAudio'
import { BotonFlotante } from './componentes/BotonFlotante'
import {
  BotonEmpezarTurno,
  BotonIniciarPartida,
  BotonReiniciar,
  BotonesJugando,
} from './componentes/BotonesJuego'
import { CartelRespuestaOperador } from './componentes/CartelRespuestaOperador'
import { ControlesGrabacion } from './componentes/ControlesGrabacion'
import {
  ESTILO_BOTONES_JUEGO_COLUMNA,
  ESTILO_CANVAS,
  ESTILO_MAIN,
} from './componentes/estilos'
import { EtiquetaDebug } from './componentes/EtiquetaDebug'
import { EtiquetaGrabacion } from './componentes/EtiquetaGrabacion'
import { MensajesError } from './componentes/MensajesError'
import { PantallaInicio } from './componentes/PantallaInicio'
import { PantallaRevision } from './componentes/PantallaRevision'
import { VideoInvisible } from './componentes/VideoInvisible'
import { useCamara } from './hooks/useCamara'
import { useDebug } from './hooks/useDebug'
import { useGrabacion } from './hooks/useGrabacion'
import { useJuego, type GrabacionParaJuego } from './hooks/useJuego'
import { useOrientacion } from './hooks/useOrientacion'
import { useRenderLoop } from './hooks/useRenderLoop'
import { CANVAS_ALTO, CANVAS_ANCHO } from './lib/config'

export default function Camara() {
  const desmontadoRef = useRef(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const videoStreamRef = useRef<MediaStream | null>(null)
  const grabacionRef = useRef<GrabacionParaJuego | null>(null)

  const [mimeTypeElegido, setMimeTypeElegido] = useState('')
  const [tipoSesionAudioActual, setTipoSesionAudioActual] = useState('no soportado')
  const [errorAudio, setErrorAudio] = useState<string | null>(null)
  const [mostrarBanco, setMostrarBanco] = useState(false)
  const [mostrarPreparacion, setMostrarPreparacion] = useState(false)

  const debug = useDebug()

  const {
    videoRef,
    activa,
    cambiando,
    iniciando,
    errorCamara,
    infoVideo,
    actualizarInfoVideo,
    empezar,
    cambiarCamara,
  } = useCamara({
    videoStreamRef,
    desmontadoRef,
    setMimeTypeElegido,
    setTipoSesionAudioActual,
    setErrorAudio,
  })

  const {
    dispatch,
    dispatchRef,
    juegoRef,
    faseJuego,
    turnoJuego,
    respuestaOperador,
    sonidosRef,
    ultimoNumeroCuentaRef,
    ultimoSegundoAvisoRef,
  } = useJuego({ grabacionRef })

  const {
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
    pedirWakeLock,
    empezarGrabacion,
    pausarGrabacionPorTurno,
    reanudarGrabacionPorTurno,
    programarFinGrabacion,
    cancelarFinGrabacion,
    detenerYReiniciar,
    grabarDeNuevo,
    compartir,
    descargar,
  } = useGrabacion({
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
  })

  useEffect(() => {
    grabacionRef.current = {
      pedirWakeLock,
      empezarGrabacion,
      pausarGrabacionPorTurno,
      reanudarGrabacionPorTurno,
      programarFinGrabacion,
      cancelarFinGrabacion,
    }
  })

  const { vertical, yaHorizontal } = useOrientacion()

  useRenderLoop({
    activa,
    canvasRef,
    videoRef,
    rafRef,
    dispatchRef,
    juegoRef,
  })

  // El nombre se lee del ref del juego, igual que en el original: solo cambia
  // cuando dispatch actualiza turnoJuego.
  // eslint-disable-next-line react-hooks/refs
  const nombreTurno = juegoRef.current.jugadores[turnoJuego]?.nombre ?? ''

  return (
    <main style={ESTILO_MAIN}>
      <canvas
        ref={canvasRef}
        width={CANVAS_ANCHO}
        height={CANVAS_ALTO}
        style={ESTILO_CANVAS}
      />

      <VideoInvisible videoRef={videoRef} onInfoVideo={actualizarInfoVideo} />

      {/* DEBUG TEMPORAL: solo con ?debug=1. Borrar este bloque cuando termine el diagnóstico. */}
      {debug && (
        <EtiquetaDebug
          infoVideo={infoVideo}
          mimeTypeElegido={mimeTypeElegido}
          estadoRecorder={estadoRecorder}
          faseJuego={faseJuego}
          infoAudio={infoAudio}
          sampleRateContexto={sampleRateContexto}
          tipoSesionAudioActual={tipoSesionAudioActual}
          wakeLockActivo={wakeLockActivo}
          avisoPausa={avisoPausa}
          infoPersistencia={infoPersistencia}
          // El overlay de debug muestra el estado de los sonidos leído del ref,
          // igual que en el original.
          // eslint-disable-next-line react-hooks/refs
          sonidos={sonidosRef.current}
        />
      )}

      {respuestaOperador && (
        <CartelRespuestaOperador respuesta={respuestaOperador} />
      )}

      {estadoGrabacion === 'grabando' && (
        <EtiquetaGrabacion
          recPausado={recPausado}
          segundosGrabacion={segundosGrabacion}
        />
      )}

      {estadoGrabacion === 'grabando' && avisoSinAudio && <AvisoSinAudio />}

      {!activa && estadoGrabacion !== 'revisando' && !cargandoRespaldo && !mostrarBanco && !mostrarPreparacion && (
        <PantallaInicio
          iniciando={iniciando}
          onEmpezar={empezar}
          onAbrirBanco={() => setMostrarBanco(true)}
          onAbrirPreparacion={() => setMostrarPreparacion(true)}
        />
      )}

      {activa && estadoGrabacion !== 'revisando' && (
        <ControlesGrabacion
          cambiando={cambiando}
          iniciando={iniciando}
          grabando={estadoGrabacion === 'grabando'}
          onCambiarCamara={cambiarCamara}
          onDetener={detenerYReiniciar}
        />
      )}

      {activa && faseJuego === 'listo' && estadoGrabacion === 'inactivo' && (
        <div style={ESTILO_BOTONES_JUEGO_COLUMNA}>
          <BotonFlotante
            variante="banco"
            onClick={() => setMostrarPreparacion(true)}
          >
            Preparar partida
          </BotonFlotante>
        </div>
      )}

      {activa && faseJuego === 'listo' && estadoGrabacion === 'inactivo' && (
        <BotonIniciarPartida
          onClick={() => dispatch({ tipo: 'INICIAR', ahora: performance.now() })}
        />
      )}

      {faseJuego === 'jugando' && estadoGrabacion !== 'revisando' && (
        <BotonesJugando
          onError={() => dispatch({ tipo: 'ERROR', ahora: performance.now() })}
          onPasapalabra={() =>
            dispatch({ tipo: 'PASAPALABRA', ahora: performance.now() })
          }
          onCorrecta={() => dispatch({ tipo: 'CORRECTA', ahora: performance.now() })}
        />
      )}

      {activa && faseJuego === 'esperandoTurno' && estadoGrabacion !== 'revisando' && (
        <BotonEmpezarTurno
          // eslint-disable-next-line react-hooks/refs
          nombreTurno={nombreTurno}
          onClick={() => dispatch({ tipo: 'SIGUIENTE_TURNO', ahora: performance.now() })}
        />
      )}

      {faseJuego === 'fin' && estadoGrabacion === 'inactivo' && (
        <BotonReiniciar onClick={() => dispatch({ tipo: 'REINICIAR' })} />
      )}

      {(errorCamara || errorAudio || errorGrabacion) && (
        <MensajesError
          errorCamara={errorCamara}
          errorAudio={errorAudio}
          errorGrabacion={errorGrabacion}
        />
      )}

      {vertical && !activa && !yaHorizontal && !mostrarBanco && !mostrarPreparacion && (
        <AvisoOrientacion
          onAbrirBanco={() => setMostrarBanco(true)}
          onAbrirPreparacion={() => setMostrarPreparacion(true)}
        />
      )}

      {estadoGrabacion === 'revisando' && urlGrabacion && (
        <PantallaRevision
          urlGrabacion={urlGrabacion}
          avisoRecuperada={avisoRecuperada}
          estadoRespaldo={estadoRespaldo}
          infoGrabacion={infoGrabacion}
          resolucionGrabacion={resolucionGrabacion}
          errorCompartir={errorCompartir}
          puedeCompartir={puedeCompartir}
          onResolucion={(ancho, alto) => setResolucionGrabacion({ ancho, alto })}
          onCompartir={compartir}
          onDescargar={descargar}
          onGrabarDeNuevo={grabarDeNuevo}
        />
      )}

      {mostrarPreparacion && (
        <Preparacion
          onVolver={() => setMostrarPreparacion(false)}
          onAbrirBanco={() => setMostrarBanco(true)}
          onConfirmar={(jugadores) => {
            dispatch({ tipo: 'CONFIGURAR', jugadores })
            setMostrarPreparacion(false)
          }}
        />
      )}

      {mostrarBanco && <Banco onVolver={() => setMostrarBanco(false)} />}
    </main>
  )
}
