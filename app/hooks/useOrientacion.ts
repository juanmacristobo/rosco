'use client'

import { useEffect, useRef, useState } from 'react'

export function useOrientacion() {
  const [vertical, setVertical] = useState(() =>
    typeof window === 'undefined'
      ? false
      : window.matchMedia('(orientation: portrait)').matches
  )
  const ultimoCambioOrientacionRef = useRef(0)
  const verticalAnteriorRef = useRef<boolean | null>(null)

  useEffect(() => {
    const consulta = window.matchMedia('(orientation: portrait)')
    const actualizar = () => {
      const esVertical = consulta.matches
      if (verticalAnteriorRef.current === esVertical) return

      verticalAnteriorRef.current = esVertical
      ultimoCambioOrientacionRef.current = performance.now()
      setVertical(esVertical)
    }

    actualizar()
    consulta.addEventListener('change', actualizar)

    return () => consulta.removeEventListener('change', actualizar)
  }, [])

  return { vertical, ultimoCambioOrientacionRef }
}
