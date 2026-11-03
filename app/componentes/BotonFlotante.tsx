'use client'

import type { CSSProperties, ReactNode } from 'react'

import { VARIANTES_BOTON, type VarianteBoton } from './estilos'

export function BotonFlotante({
  variante,
  posicion,
  tamano,
  estilo,
  onClick,
  disabled,
  ariaBusy,
  children,
}: {
  variante: VarianteBoton
  posicion?: CSSProperties
  tamano?: CSSProperties
  estilo?: CSSProperties
  onClick?: () => void
  disabled?: boolean
  ariaBusy?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={ariaBusy}
      style={{
        ...VARIANTES_BOTON[variante],
        ...posicion,
        ...tamano,
        ...estilo,
      }}
    >
      {children}
    </button>
  )
}
