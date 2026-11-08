'use client'

import { useState, type CSSProperties } from 'react'

import { BotonFlotante } from './componentes/BotonFlotante'
import { cargarBanco } from './lib/almacenamiento'
import {
  cargarConfiguracion,
  guardarConfiguracion,
  limitarSegundos,
  nombrePorDefecto,
} from './lib/configuracion'
import {
  MAX_JUGADORES,
  TIEMPO_MAX_SEGUNDOS,
  TIEMPO_MIN_SEGUNDOS,
} from './lib/config'
import type { Jugador, LetraRosco } from './lib/juego'
import { mezclar, sortearRoscos, type LetraFaltante } from './lib/sorteo'

const ESTILO_BOTON: CSSProperties = {
  minHeight: 48,
  padding: '0 16px',
  border: 'none',
  borderRadius: 10,
  background: '#f5f5f7',
  color: '#111',
  fontFamily: 'inherit',
  fontSize: 16,
  fontWeight: 700,
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
  cursor: 'pointer',
}

const ESTILO_BOTON_SECUNDARIO: CSSProperties = {
  ...ESTILO_BOTON,
  background: 'rgba(255, 255, 255, 0.12)',
  color: '#f5f5f7',
}

const ESTILO_BOTON_PELIGRO: CSSProperties = {
  ...ESTILO_BOTON_SECUNDARIO,
  color: '#ff6961',
}

const ESTILO_CAMPO: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  minHeight: 48,
  padding: '12px 14px',
  border: '1px solid rgba(255, 255, 255, 0.25)',
  borderRadius: 10,
  background: '#1c1c1e',
  color: '#ffffff',
  fontFamily: 'inherit',
  fontSize: 16,
  lineHeight: 1.4,
}

const ESTILO_ETIQUETA: CSSProperties = {
  display: 'block',
  marginBottom: 6,
  color: '#c7c7cc',
  fontSize: 15,
  fontWeight: 600,
}

const ESTILO_TARJETA: CSSProperties = {
  padding: 14,
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: 12,
  background: '#1c1c1e',
}

const ESTILO_AVISO_ERROR: CSSProperties = {
  margin: 0,
  padding: '10px 14px',
  borderRadius: 10,
  background: 'rgba(214, 40, 57, 0.9)',
  color: '#fff',
  fontSize: 15,
  lineHeight: 1.4,
}

type ErrorSorteo =
  | { tipo: 'vacio' }
  | { tipo: 'faltantes'; faltantes: LetraFaltante[] }

function textoTipo(tipo: LetraRosco['tipo']): string {
  return tipo === 'empieza' ? 'Empieza con' : 'Contiene'
}

export default function Preparacion({
  onVolver,
  onAbrirBanco,
  onConfirmar,
}: {
  onVolver: () => void
  onAbrirBanco: () => void
  onConfirmar: (jugadores: Jugador[]) => void
}) {
  const [configInicial] = useState(cargarConfiguracion)
  const [nombres, setNombres] = useState<string[]>(configInicial.nombres)
  const [segundosTexto, setSegundosTexto] = useState<string>(() =>
    String(configInicial.segundos)
  )
  const [roscos, setRoscos] = useState<LetraRosco[][] | null>(null)
  const [indicePreview, setIndicePreview] = useState(0)
  const [sorteando, setSorteando] = useState(false)
  const [errorSorteo, setErrorSorteo] = useState<ErrorSorteo | null>(null)

  const segundosNumero = Number(segundosTexto)
  const segundosValidos =
    Number.isInteger(segundosNumero) &&
    segundosNumero >= TIEMPO_MIN_SEGUNDOS &&
    segundosNumero <= TIEMPO_MAX_SEGUNDOS

  const nombresValidos = nombres.every((nombre) => nombre.trim().length > 0)
  const roscosListos =
    roscos !== null && roscos.length === nombres.length && nombres.length > 0
  const puedeConfirmar = nombresValidos && roscosListos && segundosValidos

  function invalidarRoscos() {
    setRoscos(null)
    setErrorSorteo(null)
  }

  function cambiarNombre(indice: number, valor: string) {
    setNombres((actuales) =>
      actuales.map((nombre, posicion) => (posicion === indice ? valor : nombre))
    )
  }

  function mover(indice: number, destino: number) {
    if (destino < 0 || destino >= nombres.length) return
    setNombres((actuales) => {
      const copia = [...actuales]
      const [movido] = copia.splice(indice, 1)
      copia.splice(destino, 0, movido)
      return copia
    })
    invalidarRoscos()
  }

  function quitar(indice: number) {
    if (nombres.length <= 1) return
    setNombres((actuales) =>
      actuales.filter((_, posicion) => posicion !== indice)
    )
    setIndicePreview((actual) => Math.max(0, Math.min(actual, nombres.length - 2)))
    invalidarRoscos()
  }

  function agregar() {
    if (nombres.length >= MAX_JUGADORES) return
    setNombres((actuales) => [...actuales, nombrePorDefecto(actuales.length)])
    invalidarRoscos()
  }

  function sortearOrden() {
    setNombres((actuales) => mezclar(actuales))
    invalidarRoscos()
  }

  function ajustarSegundos() {
    const ajustado = limitarSegundos(Number(segundosTexto))
    setSegundosTexto(String(ajustado))
  }

  async function sortear() {
    setSorteando(true)
    setErrorSorteo(null)
    setRoscos(null)

    try {
      const banco = await cargarBanco()

      if (banco.length === 0) {
        setErrorSorteo({ tipo: 'vacio' })
        return
      }

      const resultado = sortearRoscos(banco, nombres.length)

      if (!resultado.ok) {
        setErrorSorteo({ tipo: 'faltantes', faltantes: resultado.faltantes })
        return
      }

      setRoscos(resultado.roscos)
      setIndicePreview(0)
    } finally {
      setSorteando(false)
    }
  }

  function confirmar() {
    if (!puedeConfirmar || !roscos) return

    const nombresLimpios = nombres.map((nombre) => nombre.trim())
    const segundos = limitarSegundos(segundosNumero)

    guardarConfiguracion({ nombres: nombresLimpios, segundos })

    onConfirmar(
      nombresLimpios.map((nombre, indice) => ({
        nombre,
        rosco: roscos[indice],
        tiempoRestanteMs: segundos * 1000,
        letraActual: 0,
        terminado: false,
      }))
    )
  }

  const indiceActivo = Math.min(indicePreview, nombres.length - 1)
  const roscoActivo = roscos ? roscos[indiceActivo] : null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Preparar partida"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 25,
        display: 'flex',
        flexDirection: 'column',
        background: '#0d0d0f',
        color: '#f5f5f7',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        overscrollBehavior: 'contain',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          flexShrink: 0,
        }}
      >
        <span style={{ width: 72 }} />

        <h1
          style={{
            flex: 1,
            margin: 0,
            fontSize: 20,
            textAlign: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          Preparar partida
        </h1>

        <button
          type="button"
          onClick={onVolver}
          style={{ ...ESTILO_BOTON_SECUNDARIO, minHeight: 40, fontSize: 15 }}
        >
          Volver
        </button>
      </header>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: 14,
          display: 'grid',
          gap: 14,
          alignContent: 'start',
        }}
      >
        <section style={ESTILO_TARJETA}>
          <h2 style={{ margin: '0 0 10px', fontSize: 17 }}>Jugadores</h2>

          <div style={{ display: 'grid', gap: 10 }}>
            {nombres.map((nombre, indice) => (
              <div
                key={indice}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <input
                  type="text"
                  value={nombre}
                  maxLength={20}
                  aria-label={`Nombre del jugador ${indice + 1}`}
                  onChange={(event) => cambiarNombre(indice, event.target.value)}
                  style={{ ...ESTILO_CAMPO, flex: 1, minWidth: 0 }}
                />

                <button
                  type="button"
                  aria-label={`Subir a ${nombre || `jugador ${indice + 1}`}`}
                  onClick={() => mover(indice, indice - 1)}
                  disabled={indice === 0}
                  style={{
                    ...ESTILO_BOTON_SECUNDARIO,
                    minHeight: 44,
                    minWidth: 44,
                    padding: 0,
                    fontSize: 18,
                  }}
                >
                  ↑
                </button>

                <button
                  type="button"
                  aria-label={`Bajar a ${nombre || `jugador ${indice + 1}`}`}
                  onClick={() => mover(indice, indice + 1)}
                  disabled={indice === nombres.length - 1}
                  style={{
                    ...ESTILO_BOTON_SECUNDARIO,
                    minHeight: 44,
                    minWidth: 44,
                    padding: 0,
                    fontSize: 18,
                  }}
                >
                  ↓
                </button>

                <button
                  type="button"
                  aria-label={`Quitar a ${nombre || `jugador ${indice + 1}`}`}
                  onClick={() => quitar(indice)}
                  disabled={nombres.length <= 1}
                  style={{
                    ...ESTILO_BOTON_PELIGRO,
                    minHeight: 44,
                    minWidth: 44,
                    padding: 0,
                    fontSize: 18,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {!nombresValidos && (
            <p style={{ margin: '10px 0 0', color: '#ff6961', fontSize: 14 }}>
              Completá el nombre de todos los jugadores.
            </p>
          )}

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              marginTop: 12,
            }}
          >
            <button
              type="button"
              onClick={agregar}
              disabled={nombres.length >= MAX_JUGADORES}
              style={{ ...ESTILO_BOTON_SECUNDARIO, flex: '1 1 150px' }}
            >
              Agregar jugador
            </button>

            <button
              type="button"
              onClick={sortearOrden}
              disabled={nombres.length < 2}
              style={{ ...ESTILO_BOTON_SECUNDARIO, flex: '1 1 150px' }}
            >
              Sortear orden
            </button>
          </div>
        </section>

        <section style={ESTILO_TARJETA}>
          <label style={ESTILO_ETIQUETA} htmlFor="segundos">
            Tiempo por jugador (segundos)
          </label>
          <input
            id="segundos"
            type="number"
            inputMode="numeric"
            min={TIEMPO_MIN_SEGUNDOS}
            max={TIEMPO_MAX_SEGUNDOS}
            step={1}
            value={segundosTexto}
            onChange={(event) => setSegundosTexto(event.target.value)}
            onBlur={ajustarSegundos}
            style={{ ...ESTILO_CAMPO, maxWidth: 220 }}
          />
          <p style={{ margin: '8px 0 0', color: '#c7c7cc', fontSize: 14 }}>
            Entre {TIEMPO_MIN_SEGUNDOS} y {TIEMPO_MAX_SEGUNDOS} segundos. Se usa
            el mismo tiempo para todos.
          </p>
          {!segundosValidos && (
            <p style={{ margin: '6px 0 0', color: '#ff6961', fontSize: 14 }}>
              Ingresá un tiempo entre {TIEMPO_MIN_SEGUNDOS} y{' '}
              {TIEMPO_MAX_SEGUNDOS} segundos.
            </p>
          )}
        </section>

        <section style={ESTILO_TARJETA}>
          <h2 style={{ margin: '0 0 10px', fontSize: 17 }}>Roscos</h2>

          {errorSorteo?.tipo === 'vacio' && (
            <p style={ESTILO_AVISO_ERROR}>
              El banco de palabras está vacío. Cargá opciones antes de sortear.
            </p>
          )}

          {errorSorteo?.tipo === 'faltantes' && (
            <div style={{ display: 'grid', gap: 10 }}>
              <p style={ESTILO_AVISO_ERROR}>
                No alcanzan las opciones para sortear. Se necesitan{' '}
                {nombres.length}{' '}
                {nombres.length === 1 ? 'opción' : 'opciones'} por letra:
              </p>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 20,
                  color: '#ffb3b3',
                  fontSize: 15,
                  lineHeight: 1.5,
                }}
              >
                {errorSorteo.faltantes.map((falta) => (
                  <li key={falta.letra}>
                    {falta.letra}: {falta.disponibles}{' '}
                    {falta.disponibles === 1 ? 'opción' : 'opciones'}{' '}
                    (se necesitan {nombres.length})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {errorSorteo && (
            <button
              type="button"
              onClick={onAbrirBanco}
              style={{ ...ESTILO_BOTON, marginTop: 10, width: '100%' }}
            >
              Ir al banco de palabras
            </button>
          )}

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              marginTop: errorSorteo ? 12 : 0,
            }}
          >
            <button
              type="button"
              onClick={() => {
                void sortear()
              }}
              disabled={sorteando}
              style={{ ...ESTILO_BOTON, flex: '1 1 160px' }}
            >
              {sorteando
                ? 'Sorteando…'
                : roscos
                  ? 'Volver a sortear'
                  : 'Sortear roscos'}
            </button>
          </div>

          {!roscos && !errorSorteo && (
            <p style={{ margin: '10px 0 0', color: '#c7c7cc', fontSize: 14 }}>
              Se reparte una respuesta distinta por letra a cada jugador.
            </p>
          )}

          {roscos && roscoActivo && (
            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                }}
              >
                {nombres.map((nombre, indice) => {
                  const activo = indice === indiceActivo
                  return (
                    <button
                      key={indice}
                      type="button"
                      onClick={() => setIndicePreview(indice)}
                      style={{
                        minHeight: 40,
                        padding: '0 12px',
                        border: activo
                          ? '2px solid #0a84ff'
                          : '1px solid rgba(255, 255, 255, 0.25)',
                        borderRadius: 999,
                        background: activo
                          ? 'rgba(10, 132, 255, 0.25)'
                          : 'transparent',
                        color: '#ffffff',
                        fontFamily: 'inherit',
                        fontSize: 15,
                        fontWeight: activo ? 700 : 500,
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      {nombre.trim() || `Jugador ${indice + 1}`}
                    </button>
                  )
                })}
              </div>

              <div
                style={{
                  maxHeight: 320,
                  overflowY: 'auto',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 10,
                }}
              >
                {roscoActivo.map((letra) => (
                  <div
                    key={letra.letra}
                    style={{
                      display: 'flex',
                      gap: 10,
                      padding: '8px 12px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      fontSize: 14,
                      lineHeight: 1.35,
                    }}
                  >
                    <span
                      style={{
                        minWidth: 22,
                        fontWeight: 800,
                        color: '#8ab4f8',
                      }}
                    >
                      {letra.letra}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ color: '#c7c7cc' }}>
                        {textoTipo(letra.tipo)}:
                      </span>{' '}
                      {letra.pista}
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        textAlign: 'right',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {letra.respuesta}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <footer
        style={{
          display: 'flex',
          gap: 10,
          padding: 14,
          borderTop: '1px solid rgba(255, 255, 255, 0.12)',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={onVolver}
          style={{ ...ESTILO_BOTON_SECUNDARIO, flex: 1 }}
        >
          Cancelar
        </button>

        <BotonFlotante
          variante="pantalla"
          onClick={confirmar}
          disabled={!puedeConfirmar}
          estilo={{
            flex: 1,
            minHeight: 48,
            borderRadius: 10,
            fontSize: 16,
            opacity: puedeConfirmar ? 1 : 0.5,
          }}
        >
          Listo
        </BotonFlotante>
      </footer>
    </div>
  )
}
