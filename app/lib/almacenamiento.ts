import type { EntradaBanco } from './banco'

export type GrabacionGuardada = {
  blob: Blob
  mimeType: string
  duracionMs: number
  creadoEn: number
  nombre: string
}

const NOMBRE_BASE = 'rosco'
const VERSION_BASE = 2
const NOMBRE_STORE = 'grabaciones'
const NOMBRE_STORE_BANCO = 'banco'
const CLAVE = 'ultima'

function indexedDBDisponible() {
  return typeof indexedDB !== 'undefined'
}

function abrirBase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const solicitud = indexedDB.open(NOMBRE_BASE, VERSION_BASE)

    solicitud.onupgradeneeded = () => {
      const base = solicitud.result

      // Se conserva el store existente con las grabaciones guardadas.
      if (!base.objectStoreNames.contains(NOMBRE_STORE)) {
        base.createObjectStore(NOMBRE_STORE)
      }

      if (!base.objectStoreNames.contains(NOMBRE_STORE_BANCO)) {
        base.createObjectStore(NOMBRE_STORE_BANCO, { keyPath: 'id' })
      }
    }

    solicitud.onsuccess = () => resolve(solicitud.result)
    solicitud.onerror = () =>
      reject(solicitud.error ?? new Error('No se pudo abrir la base de datos.'))
    solicitud.onblocked = () =>
      reject(new Error('La base de datos está bloqueada por otra pestaña.'))
  })
}

function ejecutar<T>(
  nombreStore: string,
  modo: IDBTransactionMode,
  accion: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!indexedDBDisponible()) {
      reject(new Error('IndexedDB no está disponible en este navegador.'))
      return
    }

    abrirBase().then((base) => {
      const transaccion = base.transaction(nombreStore, modo)
      const store = transaccion.objectStore(nombreStore)
      const solicitud = accion(store)

      solicitud.onsuccess = () => resolve(solicitud.result)
      solicitud.onerror = () =>
        reject(solicitud.error ?? new Error('Error al acceder a la base de datos.'))

      transaccion.oncomplete = () => base.close()
      transaccion.onabort = () => {
        base.close()
        reject(transaccion.error ?? new Error('Se canceló la transacción.'))
      }
    }, reject)
  })
}

function ejecutarLote(
  nombreStore: string,
  accion: (store: IDBObjectStore) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!indexedDBDisponible()) {
      reject(new Error('IndexedDB no está disponible en este navegador.'))
      return
    }

    abrirBase().then((base) => {
      const transaccion = base.transaction(nombreStore, 'readwrite')
      const store = transaccion.objectStore(nombreStore)
      accion(store)

      transaccion.oncomplete = () => {
        base.close()
        resolve()
      }
      transaccion.onabort = () => {
        base.close()
        reject(transaccion.error ?? new Error('Se canceló la transacción.'))
      }
    }, reject)
  })
}

export async function guardarGrabacion(registro: GrabacionGuardada): Promise<boolean> {
  try {
    await ejecutar(NOMBRE_STORE, 'readwrite', (store) => store.put(registro, CLAVE))
    return true
  } catch {
    return false
  }
}

export async function cargarGrabacion(): Promise<GrabacionGuardada | null> {
  try {
    const registro = await ejecutar<GrabacionGuardada | undefined>(
      NOMBRE_STORE,
      'readonly',
      (store) => store.get(CLAVE)
    )

    if (!registro || !(registro.blob instanceof Blob)) return null
    return registro
  } catch {
    return null
  }
}

export async function borrarGrabacion(): Promise<boolean> {
  try {
    await ejecutar(NOMBRE_STORE, 'readwrite', (store) => store.delete(CLAVE))
    return true
  } catch {
    return false
  }
}

export async function cargarBanco(): Promise<EntradaBanco[]> {
  try {
    const registros = await ejecutar<EntradaBanco[]>(
      NOMBRE_STORE_BANCO,
      'readonly',
      (store) => store.getAll()
    )

    return Array.isArray(registros) ? registros : []
  } catch {
    return []
  }
}

export async function guardarEntrada(entrada: EntradaBanco): Promise<boolean> {
  try {
    await ejecutar(NOMBRE_STORE_BANCO, 'readwrite', (store) => store.put(entrada))
    return true
  } catch {
    return false
  }
}

export async function borrarEntrada(id: string): Promise<boolean> {
  try {
    await ejecutar(NOMBRE_STORE_BANCO, 'readwrite', (store) => store.delete(id))
    return true
  } catch {
    return false
  }
}

export async function reemplazarBanco(entradas: EntradaBanco[]): Promise<boolean> {
  try {
    await ejecutarLote(NOMBRE_STORE_BANCO, (store) => {
      store.clear()
      for (const entrada of entradas) store.put(entrada)
    })
    return true
  } catch {
    return false
  }
}
