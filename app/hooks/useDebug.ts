'use client'

import { useSyncExternalStore } from 'react'

function suscribirDebug() {
  return () => {}
}

function leerDebug() {
  return new URLSearchParams(window.location.search).get('debug') === '1'
}

function leerDebugServidor() {
  return false
}

export function useDebug() {
  return useSyncExternalStore(suscribirDebug, leerDebug, leerDebugServidor)
}
