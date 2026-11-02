import {
  crearEntrada,
  fusionarEntradas,
  nombreArchivoBanco,
  serializarBanco,
  validarEntrada,
  type EntradaBanco,
} from './banco'
import type { TipoPista } from './juego'

export type ResultadoImportacion = {
  entradas: EntradaBanco[]
  importadas: number
  duplicadas: number
  invalidas: number
  motivosInvalidos: string[]
  erroresArchivos: string[]
}

const MAX_MOTIVOS = 5

function leerTipo(valor: unknown): TipoPista | null {
  return valor === 'empieza' || valor === 'contiene' ? valor : null
}

function leerTexto(valor: unknown): string {
  return typeof valor === 'string' ? valor : ''
}

export async function importarArchivosBanco(
  archivos: File[],
  existentes: EntradaBanco[]
): Promise<ResultadoImportacion> {
  const candidatas: EntradaBanco[] = []
  const motivosInvalidos: string[] = []
  const erroresArchivos: string[] = []
  let invalidas = 0

  const registrarInvalida = (mensaje: string) => {
    invalidas += 1
    if (motivosInvalidos.length < MAX_MOTIVOS) motivosInvalidos.push(mensaje)
  }

  for (const archivo of archivos) {
    let contenido: unknown

    try {
      contenido = JSON.parse(await archivo.text())
    } catch {
      erroresArchivos.push(`${archivo.name}: no es un archivo JSON válido.`)
      continue
    }

    if (!Array.isArray(contenido)) {
      erroresArchivos.push(
        `${archivo.name}: el JSON debe ser una lista de entradas.`
      )
      continue
    }

    contenido.forEach((crudo, indice) => {
      const posicion = `${archivo.name}, entrada ${indice + 1}`

      if (!crudo || typeof crudo !== 'object') {
        registrarInvalida(`${posicion}: la entrada no es un objeto.`)
        return
      }

      const datos = crudo as Record<string, unknown>
      const tipo = leerTipo(datos.tipo)
      if (!tipo) {
        registrarInvalida(
          `${posicion}: el tipo debe ser "empieza" o "contiene".`
        )
        return
      }

      const letra = leerTexto(datos.letra)
      const pista = leerTexto(datos.pista)
      const respuesta = leerTexto(datos.respuesta)
      const error = validarEntrada(letra, tipo, pista, respuesta)

      if (error) {
        registrarInvalida(`${posicion}: ${error}`)
        return
      }

      // El id se genera acá porque la importación siempre corre en un evento
      // del cliente, nunca durante el render.
      candidatas.push(crearEntrada({ letra, tipo, pista, respuesta }, crypto.randomUUID()))
    })
  }

  const { entradas, duplicadas } = fusionarEntradas(existentes, candidatas)

  return {
    entradas,
    importadas: candidatas.length - duplicadas,
    duplicadas,
    invalidas,
    motivosInvalidos,
    erroresArchivos,
  }
}

export function exportarBanco(entradas: EntradaBanco[]): void {
  const archivo = new File([serializarBanco(entradas)], nombreArchivoBanco(), {
    type: 'application/json',
  })

  // navigator.share se llama sin awaits previos para no perder la activación
  // del toque del usuario.
  const puedeCompartir =
    typeof navigator.share === 'function' &&
    navigator.canShare?.({ files: [archivo] }) === true

  if (puedeCompartir) {
    navigator
      .share({ files: [archivo], title: 'Banco de palabras' })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return
        descargarArchivo(archivo)
      })
    return
  }

  descargarArchivo(archivo)
}

function descargarArchivo(archivo: File) {
  const url = URL.createObjectURL(archivo)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = archivo.name
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
