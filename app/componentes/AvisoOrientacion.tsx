'use client'

import { BotonFlotante } from './BotonFlotante'
import {
  ESTILO_AVISO_ORIENTACION,
  ESTILO_AVISO_ORIENTACION_CONTENIDO,
} from './estilos'

export function AvisoOrientacion({ onAbrirBanco }: { onAbrirBanco: () => void }) {
  return (
    <div style={ESTILO_AVISO_ORIENTACION}>
      <div style={ESTILO_AVISO_ORIENTACION_CONTENIDO}>
        <p style={{ margin: 0 }}>Girá el teléfono a horizontal</p>
        <BotonFlotante variante="banco" onClick={onAbrirBanco}>
          Banco de palabras
        </BotonFlotante>
      </div>
    </div>
  )
}
