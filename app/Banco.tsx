'use client'

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
} from 'react'

import {
  cargarBanco,
  borrarEntrada,
  guardarEntrada,
  reemplazarBanco,
} from './lib/almacenamiento'
import {
  claveDuplicado,
  crearEntrada,
  fusionarEntradas,
  validarEntrada,
  type EntradaBanco,
} from './lib/banco'
import { exportarBanco, importarArchivosBanco } from './lib/bancoArchivos'
import { ALFABETO, MIN_OPCIONES_POR_LETRA } from './lib/config'
import { BANCO_DEMO } from './lib/datosDemo'
import type { TipoPista } from './lib/juego'

type Formulario = {
  id: string | null
  letra: string
  tipo: TipoPista
  pista: string
  respuesta: string
}

type Aviso = {
  tipo: 'ok' | 'error'
  lineas: string[]
}

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

function estiloTipo(activo: boolean): CSSProperties {
  return {
    flex: 1,
    minHeight: 44,
    padding: '0 10px',
    border: activo
      ? '2px solid #0a84ff'
      : '1px solid rgba(255, 255, 255, 0.25)',
    borderRadius: 8,
    background: activo ? 'rgba(10, 132, 255, 0.25)' : 'transparent',
    color: '#ffffff',
    fontFamily: 'inherit',
    fontSize: 16,
    fontWeight: activo ? 700 : 500,
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
    cursor: 'pointer',
  }
}

function textoCantidad(cantidad: number) {
  return cantidad === 1 ? '1 opción' : `${cantidad} opciones`
}

export default function Banco({ onVolver }: { onVolver: () => void }) {
  const [entradas, setEntradas] = useState<EntradaBanco[]>([])
  const [cargando, setCargando] = useState(true)
  const [letraSeleccionada, setLetraSeleccionada] = useState<string | null>(null)
  const [formulario, setFormulario] = useState<Formulario | null>(null)
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null)
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const inputArchivoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelado = false

    void cargarBanco().then((guardadas) => {
      if (cancelado) return
      setEntradas(guardadas)
      setCargando(false)
    })

    return () => {
      cancelado = true
    }
  }, [])

  const conteos = new Map<string, number>()
  for (const entrada of entradas) {
    conteos.set(entrada.letra, (conteos.get(entrada.letra) ?? 0) + 1)
  }

  const entradasLetra = letraSeleccionada
    ? entradas
        .filter((entrada) => entrada.letra === letraSeleccionada)
        .sort(
          (a, b) =>
            a.tipo.localeCompare(b.tipo) ||
            a.respuesta.localeCompare(b.respuesta, 'es')
        )
    : []

  function seleccionarLetra(letra: string | null) {
    setLetraSeleccionada(letra)
    setFormulario(null)
    setErrorFormulario(null)
    setAviso(null)
  }

  function abrirAlta() {
    if (!letraSeleccionada) return
    setFormulario({
      id: null,
      letra: letraSeleccionada,
      tipo: 'empieza',
      pista: '',
      respuesta: '',
    })
    setErrorFormulario(null)
    setAviso(null)
  }

  function abrirEdicion(entrada: EntradaBanco) {
    setFormulario({
      id: entrada.id,
      letra: entrada.letra,
      tipo: entrada.tipo,
      pista: entrada.pista,
      respuesta: entrada.respuesta,
    })
    setErrorFormulario(null)
    setAviso(null)
  }

  function cerrarFormulario() {
    setFormulario(null)
    setErrorFormulario(null)
  }

  async function guardarFormulario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!formulario || guardando) return

    const error = validarEntrada(
      formulario.letra,
      formulario.tipo,
      formulario.pista,
      formulario.respuesta
    )

    if (error) {
      setErrorFormulario(error)
      return
    }

    const entrada = crearEntrada(
      {
        letra: formulario.letra,
        tipo: formulario.tipo,
        pista: formulario.pista,
        respuesta: formulario.respuesta,
      },
      formulario.id ?? crypto.randomUUID()
    )

    const duplicada = entradas.some(
      (existente) =>
        existente.id !== entrada.id &&
        claveDuplicado(existente) === claveDuplicado(entrada)
    )

    if (duplicada) {
      setErrorFormulario(
        'Ya hay una entrada con la misma letra, tipo y respuesta.'
      )
      return
    }

    setGuardando(true)
    const guardado = await guardarEntrada(entrada)
    setGuardando(false)

    if (!guardado) {
      setErrorFormulario('No se pudo guardar la entrada en este dispositivo.')
      return
    }

    setEntradas((previas) => {
      const indice = previas.findIndex((previa) => previa.id === entrada.id)
      if (indice === -1) return [...previas, entrada]

      const copia = previas.slice()
      copia[indice] = entrada
      return copia
    })
    setFormulario(null)
    setErrorFormulario(null)
    setAviso({
      tipo: 'ok',
      lineas: [
        formulario.id === null ? 'Entrada agregada.' : 'Entrada actualizada.',
      ],
    })
  }

  async function confirmarBorrado(entrada: EntradaBanco) {
    const confirmado = window.confirm(
      `¿Borrar la entrada "${entrada.respuesta}" de la letra ${entrada.letra}?`
    )
    if (!confirmado) return

    const borrado = await borrarEntrada(entrada.id)
    if (!borrado) {
      setAviso({
        tipo: 'error',
        lineas: ['No se pudo borrar la entrada de este dispositivo.'],
      })
      return
    }

    setEntradas((previas) =>
      previas.filter((previa) => previa.id !== entrada.id)
    )
    if (formulario?.id === entrada.id) setFormulario(null)
    setAviso({ tipo: 'ok', lineas: ['Entrada borrada.'] })
  }

  async function manejarArchivos(event: ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (archivos.length === 0) return

    setOcupado(true)
    setAviso(null)

    const resultado = await importarArchivosBanco(archivos, entradas)
    const guardado = await reemplazarBanco(resultado.entradas)
    setOcupado(false)

    if (!guardado) {
      setAviso({
        tipo: 'error',
        lineas: ['No se pudieron guardar los cambios en este dispositivo.'],
      })
      return
    }

    setEntradas(resultado.entradas)

    const lineas = [
      resultado.importadas === 1
        ? 'Se importó 1 entrada.'
        : `Se importaron ${resultado.importadas} entradas.`,
    ]

    if (resultado.duplicadas > 0) {
      lineas.push(
        resultado.duplicadas === 1
          ? '1 entrada duplicada ignorada.'
          : `${resultado.duplicadas} entradas duplicadas ignoradas.`
      )
    }

    if (resultado.invalidas > 0) {
      lineas.push(
        resultado.invalidas === 1
          ? '1 entrada inválida.'
          : `${resultado.invalidas} entradas inválidas.`
      )
    }

    lineas.push(...resultado.motivosInvalidos)
    lineas.push(...resultado.erroresArchivos)

    setAviso({
      tipo:
        resultado.importadas === 0 || resultado.erroresArchivos.length > 0
          ? 'error'
          : 'ok',
      lineas,
    })
  }

  async function cargarEjemplo() {
    setOcupado(true)
    setAviso(null)

    // El rosco no incluye la Ñ, así que sus entradas de ejemplo no se cargan.
    const candidatas = BANCO_DEMO.filter((entrada) =>
      ALFABETO.includes(entrada.letra)
    ).map((entrada) => crearEntrada(entrada, crypto.randomUUID()))

    const { entradas: fusionadas, duplicadas } = fusionarEntradas(
      entradas,
      candidatas
    )
    const agregadas = candidatas.length - duplicadas
    const guardado = await reemplazarBanco(fusionadas)
    setOcupado(false)

    if (!guardado) {
      setAviso({
        tipo: 'error',
        lineas: ['No se pudieron guardar los cambios en este dispositivo.'],
      })
      return
    }

    setEntradas(fusionadas)

    const lineas: string[] =
      agregadas > 0
        ? [
            agregadas === 1
              ? 'Se agregó 1 entrada de ejemplo.'
              : `Se agregaron ${agregadas} entradas de ejemplo.`,
          ]
        : ['El banco de ejemplo ya estaba cargado.']

    if (agregadas > 0 && duplicadas > 0) {
      lineas.push(
        duplicadas === 1
          ? '1 entrada ya estaba en el banco.'
          : `${duplicadas} entradas ya estaban en el banco.`
      )
    }

    setAviso({ tipo: 'ok', lineas })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Banco de palabras"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 30,
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
        {letraSeleccionada ? (
          <button
            type="button"
            onClick={() => seleccionarLetra(null)}
            style={{ ...ESTILO_BOTON_SECUNDARIO, minHeight: 40, fontSize: 15 }}
          >
            ← Letras
          </button>
        ) : (
          <span style={{ width: 72 }} />
        )}

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
          {letraSeleccionada
            ? `Letra ${letraSeleccionada}`
            : 'Banco de palabras'}
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
        }}
      >
        {cargando ? (
          <p style={{ margin: 0, color: '#c7c7cc', fontSize: 16 }}>
            Cargando banco…
          </p>
        ) : letraSeleccionada === null ? (
          <div style={{ display: 'grid', gap: 14 }}>
            <p style={{ margin: 0, color: '#c7c7cc', fontSize: 15, lineHeight: 1.4 }}>
              Elegí una letra para ver y editar sus opciones. Las letras en
              rojo tienen menos de {MIN_OPCIONES_POR_LETRA} opciones.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))',
                gap: 8,
              }}
            >
              {ALFABETO.map((letra) => {
                const cantidad = conteos.get(letra) ?? 0
                const faltan = cantidad < MIN_OPCIONES_POR_LETRA

                return (
                  <button
                    key={letra}
                    type="button"
                    onClick={() => seleccionarLetra(letra)}
                    aria-label={`Letra ${letra}, ${textoCantidad(cantidad)}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                      minHeight: 54,
                      padding: '6px 2px',
                      border: faltan
                        ? '1px solid #ff453a'
                        : '1px solid rgba(255, 255, 255, 0.18)',
                      borderRadius: 10,
                      background: faltan
                        ? 'rgba(255, 69, 58, 0.16)'
                        : '#1c1c1e',
                      color: faltan ? '#ff6961' : '#f5f5f7',
                      fontFamily: 'inherit',
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 20, fontWeight: 800 }}>
                      {letra}
                    </span>
                    <span style={{ fontSize: 12, opacity: 0.85 }}>
                      {cantidad}
                    </span>
                  </button>
                )
              })}
            </div>

            {aviso && <AvisoBanco aviso={aviso} />}

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <input
                ref={inputArchivoRef}
                type="file"
                accept=".json,application/json"
                multiple
                onChange={(event) => {
                  void manejarArchivos(event)
                }}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => inputArchivoRef.current?.click()}
                disabled={ocupado}
                style={{ ...ESTILO_BOTON_SECUNDARIO, flex: '1 1 150px' }}
              >
                Importar JSON
              </button>
              <button
                type="button"
                onClick={() => exportarBanco(entradas)}
                disabled={ocupado}
                style={{ ...ESTILO_BOTON_SECUNDARIO, flex: '1 1 150px' }}
              >
                Exportar JSON
              </button>
              <button
                type="button"
                onClick={() => {
                  void cargarEjemplo()
                }}
                disabled={ocupado}
                style={{ ...ESTILO_BOTON_SECUNDARIO, flex: '1 1 100%' }}
              >
                Cargar banco de ejemplo
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            <p style={{ margin: 0, color: '#c7c7cc', fontSize: 15 }}>
              {textoCantidad(entradasLetra.length)} para la letra{' '}
              {letraSeleccionada}.
            </p>

            {aviso && <AvisoBanco aviso={aviso} />}

            {formulario ? (
              <FormularioBanco
                formulario={formulario}
                error={errorFormulario}
                guardando={guardando}
                onCambiar={setFormulario}
                onGuardar={guardarFormulario}
                onCancelar={cerrarFormulario}
              />
            ) : (
              <button type="button" onClick={abrirAlta} style={ESTILO_BOTON}>
                Agregar opción
              </button>
            )}

            {entradasLetra.length === 0 ? (
              <p
                style={{
                  ...ESTILO_TARJETA,
                  margin: 0,
                  color: '#c7c7cc',
                  fontSize: 16,
                }}
              >
                Todavía no hay entradas para la letra {letraSeleccionada}.
              </p>
            ) : (
              <ul
                style={{
                  display: 'grid',
                  gap: 10,
                  margin: 0,
                  padding: 0,
                  listStyle: 'none',
                }}
              >
                {entradasLetra.map((entrada) => (
                  <li key={entrada.id} style={ESTILO_TARJETA}>
                    <p
                      style={{
                        margin: 0,
                        color: '#8e8e93',
                        fontSize: 13,
                        fontWeight: 700,
                        letterSpacing: 0.4,
                        textTransform: 'uppercase',
                      }}
                    >
                      {entrada.tipo === 'empieza'
                        ? `Empieza con ${entrada.letra}`
                        : `Contiene la ${entrada.letra}`}
                    </p>
                    <p
                      style={{
                        margin: '6px 0 0',
                        fontSize: 16,
                        lineHeight: 1.35,
                      }}
                    >
                      {entrada.pista}
                    </p>
                    <p
                      style={{
                        margin: '4px 0 0',
                        color: '#30d158',
                        fontSize: 17,
                        fontWeight: 700,
                      }}
                    >
                      {entrada.respuesta}
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button
                        type="button"
                        onClick={() => abrirEdicion(entrada)}
                        style={{ ...ESTILO_BOTON_SECUNDARIO, flex: 1 }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void confirmarBorrado(entrada)
                        }}
                        style={{ ...ESTILO_BOTON_PELIGRO, flex: 1 }}
                      >
                        Borrar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function AvisoBanco({ aviso }: { aviso: Aviso }) {
  const esError = aviso.tipo === 'error'

  return (
    <div
      role={esError ? 'alert' : 'status'}
      aria-live="polite"
      style={{
        padding: '10px 14px',
        border: `1px solid ${esError ? 'rgba(255, 69, 58, 0.5)' : 'rgba(48, 209, 88, 0.5)'}`,
        borderRadius: 10,
        background: esError
          ? 'rgba(255, 69, 58, 0.14)'
          : 'rgba(48, 209, 88, 0.14)',
        color: '#f5f5f7',
        fontSize: 15,
        lineHeight: 1.4,
      }}
    >
      {aviso.lineas.map((linea, indice) => (
        <p key={indice} style={{ margin: indice === 0 ? 0 : '4px 0 0' }}>
          {linea}
        </p>
      ))}
    </div>
  )
}

function FormularioBanco({
  formulario,
  error,
  guardando,
  onCambiar,
  onGuardar,
  onCancelar,
}: {
  formulario: Formulario
  error: string | null
  guardando: boolean
  onCambiar: (formulario: Formulario) => void
  onGuardar: (event: FormEvent<HTMLFormElement>) => Promise<void>
  onCancelar: () => void
}) {
  const letra = formulario.letra

  return (
    <form
      onSubmit={(event) => {
        void onGuardar(event)
      }}
      style={{
        ...ESTILO_TARJETA,
        display: 'grid',
        gap: 10,
      }}
    >
      <h2 style={{ margin: 0, fontSize: 18 }}>
        {formulario.id === null
          ? `Nueva opción para la letra ${letra}`
          : `Editar opción de la letra ${letra}`}
      </h2>

      <div>
        <span style={ESTILO_ETIQUETA}>Tipo</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            aria-pressed={formulario.tipo === 'empieza'}
            onClick={() => onCambiar({ ...formulario, tipo: 'empieza' })}
            style={estiloTipo(formulario.tipo === 'empieza')}
          >
            Empieza con {letra}
          </button>
          <button
            type="button"
            aria-pressed={formulario.tipo === 'contiene'}
            onClick={() => onCambiar({ ...formulario, tipo: 'contiene' })}
            style={estiloTipo(formulario.tipo === 'contiene')}
          >
            Contiene la {letra}
          </button>
        </div>
      </div>

      <label>
        <span style={ESTILO_ETIQUETA}>Pista</span>
        <textarea
          value={formulario.pista}
          onChange={(event) =>
            onCambiar({ ...formulario, pista: event.target.value })
          }
          rows={2}
          autoComplete="off"
          style={{ ...ESTILO_CAMPO, resize: 'vertical' }}
        />
      </label>

      <label>
        <span style={ESTILO_ETIQUETA}>Respuesta</span>
        <input
          type="text"
          value={formulario.respuesta}
          onChange={(event) =>
            onCambiar({ ...formulario, respuesta: event.target.value })
          }
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          style={ESTILO_CAMPO}
        />
      </label>

      {error && (
        <p
          role="alert"
          style={{ margin: 0, color: '#ff6961', fontSize: 15, lineHeight: 1.35 }}
        >
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="submit"
          disabled={guardando}
          style={{ ...ESTILO_BOTON, flex: 1 }}
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          style={{ ...ESTILO_BOTON_SECUNDARIO, flex: 1 }}
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
