import { ALFABETO } from './config'
import type { TipoPista } from './juego'

export type EntradaBanco = {
  id: string
  letra: string
  tipo: TipoPista
  pista: string
  respuesta: string
  respuestaNorm: string
}

export type EntradaNueva = {
  letra: string
  tipo: TipoPista
  pista: string
  respuesta: string
}

export type ResultadoFusion = {
  entradas: EntradaBanco[]
  duplicadas: number
}

// Minúsculas, sin tildes (incluida la ñ) y sin espacios en los extremos.
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function validarEntrada(
  letra: string,
  tipo: TipoPista,
  pista: string,
  respuesta: string
): string | null {
  const letraMayuscula = letra.trim().toUpperCase()

  if (!ALFABETO.includes(letraMayuscula)) {
    return 'La letra debe ser una letra del rosco (A-Z).'
  }

  if (tipo !== 'empieza' && tipo !== 'contiene') {
    return 'El tipo debe ser "empieza" o "contiene".'
  }

  if (!pista.trim()) {
    return 'La pista no puede estar vacía.'
  }

  if (!respuesta.trim()) {
    return 'La respuesta no puede estar vacía.'
  }

  const letraNormalizada = normalizar(letraMayuscula)
  const respuestaNormalizada = normalizar(respuesta)

  if (
    tipo === 'empieza' &&
    !respuestaNormalizada.startsWith(letraNormalizada)
  ) {
    return `La respuesta debe empezar con la letra ${letraMayuscula}.`
  }

  if (tipo === 'contiene' && !respuestaNormalizada.includes(letraNormalizada)) {
    return `La respuesta debe contener la letra ${letraMayuscula}.`
  }

  return null
}

export function claveDuplicado(
  entrada: Pick<EntradaBanco, 'letra' | 'tipo' | 'respuestaNorm'>
): string {
  return `${entrada.letra}|${entrada.tipo}|${entrada.respuestaNorm}`
}

// Fusiona sin duplicar por letra + tipo + respuesta normalizada. Ante un
// duplicado se conserva la entrada que ya existía.
export function fusionarEntradas(
  existentes: EntradaBanco[],
  nuevas: EntradaBanco[]
): ResultadoFusion {
  const entradas = existentes.slice()
  const claves = new Set(entradas.map(claveDuplicado))
  let duplicadas = 0

  for (const entrada of nuevas) {
    const clave = claveDuplicado(entrada)
    if (claves.has(clave)) {
      duplicadas += 1
      continue
    }

    claves.add(clave)
    entradas.push(entrada)
  }

  return { entradas, duplicadas }
}

// El id se recibe desde afuera para que la función siga siendo pura y para
// generar los crypto.randomUUID() únicamente en eventos del cliente.
export function crearEntrada(datos: EntradaNueva, id: string): EntradaBanco {
  const respuesta = datos.respuesta.trim()

  return {
    id,
    letra: datos.letra.trim().toUpperCase(),
    tipo: datos.tipo,
    pista: datos.pista.trim(),
    respuesta,
    respuestaNorm: normalizar(respuesta),
  }
}

// Formato de exportación/importación: sin id ni respuestaNorm.
export function serializarBanco(entradas: EntradaBanco[]): string {
  const planas = entradas.map(({ letra, tipo, pista, respuesta }) => ({
    letra,
    tipo,
    pista,
    respuesta,
  }))

  return JSON.stringify(planas, null, 2)
}

export function nombreArchivoBanco(fecha: Date = new Date()): string {
  const pad = (numero: number) => String(numero).padStart(2, '0')
  const dia = `${fecha.getFullYear()}${pad(fecha.getMonth() + 1)}${pad(
    fecha.getDate()
  )}`

  return `banco-rosco-${dia}.json`
}
