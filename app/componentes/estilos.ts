import type { CSSProperties } from 'react'

// Layout principal
export const ESTILO_MAIN: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100dvh',
  background: '#000',
  overflow: 'hidden',
}

export const ESTILO_CANVAS: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  background: '#000',
  zIndex: 0,
}

export const ESTILO_VIDEO_INVISIBLE: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: 1,
  height: 1,
  opacity: 0,
  pointerEvents: 'none',
}

// Etiqueta ?debug=1
export const ESTILO_DEBUG: CSSProperties = {
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
}

// Cartel con la respuesta para el operador
export const ESTILO_RESPUESTA_OPERADOR: CSSProperties = {
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
}

// Indicador REC / PAUSA
export const ESTILO_ETIQUETA_GRABACION: CSSProperties = {
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
}

export const ESTILO_PUNTO_REC: CSSProperties = {
  color: '#ff3b30',
}

// Aviso de grabación sin micrófono
export const ESTILO_AVISO_SIN_AUDIO: CSSProperties = {
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
}

// Pantalla previa a la cámara
export const ESTILO_PANTALLA_INICIO: CSSProperties = {
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
}

// Controles de cámara y grabación
export const ESTILO_CONTROLES_GRABACION: CSSProperties = {
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
}

// Columna de Error / Pasapalabra
export const ESTILO_BOTONES_JUEGO_COLUMNA: CSSProperties = {
  position: 'absolute',
  left: 'calc(env(safe-area-inset-left, 0px) + 16px)',
  bottom: 'calc(env(safe-area-inset-bottom, 0px) + 104px)',
  zIndex: 4,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}

// Errores de cámara, micrófono y grabación
export const ESTILO_ERRORES: CSSProperties = {
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
}

// Aviso de orientación
export const ESTILO_AVISO_ORIENTACION: CSSProperties = {
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
}

export const ESTILO_AVISO_ORIENTACION_CONTENIDO: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 20,
}

// Pantalla de revisión
export const ESTILO_PANTALLA_REVISION: CSSProperties = {
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
}

export const ESTILO_AVISO_RECUPERADA: CSSProperties = {
  margin: 0,
  padding: '10px 14px',
  borderRadius: 10,
  background: 'rgba(255, 255, 255, 0.12)',
  color: '#fff',
  fontSize: 15,
  lineHeight: 1.4,
}

export const ESTILO_ESTADO_RESPALDO: CSSProperties = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.4,
}

export const ESTILO_VIDEO_REVISION: CSSProperties = {
  flex: 1,
  minHeight: 0,
  width: '100%',
  objectFit: 'contain',
  background: '#000',
  borderRadius: 12,
}

export const ESTILO_INFO_REVISION: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px 16px',
  color: '#fff',
  fontFamily: 'monospace',
  fontSize: 13,
}

export const ESTILO_ERROR_COMPARTIR: CSSProperties = {
  margin: 0,
  padding: '10px 14px',
  borderRadius: 10,
  background: 'rgba(214, 40, 57, 0.9)',
  color: '#fff',
  fontSize: 15,
  lineHeight: 1.4,
}

// Botones
const ESTILO_BOTON_NATIVO: CSSProperties = {
  touchAction: 'manipulation',
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

const ESTILO_BOTON_PANTALLA: CSSProperties = {
  border: 'none',
  background: '#ffffff',
  color: '#000',
  fontWeight: 800,
  boxShadow: '0 6px 24px rgba(0, 0, 0, 0.45)',
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
}

const ESTILO_BOTON_JUEGO: CSSProperties = {
  border: 'none',
  borderRadius: 24,
  fontWeight: 800,
  boxShadow: '0 4px 18px rgba(0, 0, 0, 0.4)',
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
}

const ESTILO_BOTON_CHICO: CSSProperties = {
  height: 32,
  padding: '0 10px',
  border: 'none',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: 'nowrap',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
  pointerEvents: 'auto',
}

const ESTILO_BOTON_REVISION: CSSProperties = {
  border: 'none',
  borderRadius: 999,
  fontWeight: 700,
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
}

export const VARIANTES_BOTON = {
  nativo: ESTILO_BOTON_NATIVO,
  banco: ESTILO_BOTON_BANCO,
  pantalla: ESTILO_BOTON_PANTALLA,
  error: {
    ...ESTILO_BOTON_JUEGO,
    background: 'rgba(214, 40, 57, 0.82)',
    color: '#ffffff',
  },
  pasapalabra: {
    ...ESTILO_BOTON_JUEGO,
    background: 'rgba(244, 180, 0, 0.85)',
    color: '#1a1a1a',
  },
  correcta: {
    ...ESTILO_BOTON_JUEGO,
    borderRadius: 28,
    background: 'rgba(34, 168, 69, 0.82)',
    color: '#ffffff',
    boxShadow: '0 6px 24px rgba(0, 0, 0, 0.4)',
  },
  chicoClaro: {
    ...ESTILO_BOTON_CHICO,
    background: 'rgba(255, 255, 255, 0.92)',
    color: '#000',
  },
  chicoDetener: {
    ...ESTILO_BOTON_CHICO,
    background: '#ffffff',
    color: '#d62839',
  },
  revisionCompartir: {
    ...ESTILO_BOTON_REVISION,
    minHeight: 64,
    background: '#d62839',
    color: '#fff',
    fontSize: 20,
  },
  revisionClaro: {
    ...ESTILO_BOTON_REVISION,
    minHeight: 60,
    background: 'rgba(255, 255, 255, 0.92)',
    color: '#000',
    fontSize: 18,
  },
} satisfies Record<string, CSSProperties>

export type VarianteBoton = keyof typeof VARIANTES_BOTON

export const POSICION_CENTRO_ABAJO_96: CSSProperties = {
  position: 'absolute',
  left: '50%',
  transform: 'translateX(-50%)',
  bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)',
  zIndex: 4,
}

export const POSICION_CORRECTA: CSSProperties = {
  position: 'absolute',
  right: 'calc(env(safe-area-inset-right, 0px) + 16px)',
  bottom: 'calc(env(safe-area-inset-bottom, 0px) + 104px)',
  zIndex: 4,
}

export const TAMANO_EMPEZAR: CSSProperties = {
  width: 200,
  height: 70,
  fontSize: 24,
}

export const TAMANO_INICIAR_PARTIDA: CSSProperties = {
  minWidth: 300,
  minHeight: 78,
  padding: '0 32px',
  borderRadius: 24,
  fontSize: 28,
}

export const TAMANO_ERROR: CSSProperties = {
  minWidth: 150,
  minHeight: 72,
  padding: '0 16px',
  fontSize: 21,
}

export const TAMANO_CORRECTA: CSSProperties = {
  minWidth: 188,
  minHeight: 112,
  padding: '0 20px',
  fontSize: 28,
}

export const TAMANO_EMPEZAR_TURNO: CSSProperties = {
  minWidth: 360,
  minHeight: 84,
  padding: '0 28px',
  borderRadius: 24,
  fontSize: 26,
}

export const TAMANO_REINICIAR: CSSProperties = {
  minWidth: 220,
  minHeight: 68,
  padding: '0 28px',
  borderRadius: 24,
  fontSize: 24,
}
