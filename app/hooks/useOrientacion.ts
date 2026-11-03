'use client'

import { useEffect, useState } from 'react'

export function useOrientacion() {
  const [vertical, setVertical] = useState(false)
  const [yaHorizontal, setYaHorizontal] = useState(false)

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

  return { vertical, yaHorizontal }
}
