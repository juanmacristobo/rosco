export type GrabacionGuardada = {
  blob: Blob
  mimeType: string
  duracionMs: number
  creadoEn: number
  nombre: string
}

const NOMBRE_BASE = 'rosco'
const VERSION_BASE = 1
const NOMBRE_STORE = 'grabaciones'
const CLAVE = 'ultima'

function indexedDBDisponible() {
  return typeof indexedDB !== 'undefined'
}

function abrirBase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const solicitud = indexedDB.open(NOMBRE_BASE, VERSION_BASE)

    solicitud.onupgradeneeded = () => {
      const base = solicitud.result
      if (!base.objectStoreNames.contains(NOMBRE_STORE)) {
        base.createObjectStore(NOMBRE_STORE)
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
  modo: IDBTransactionMode,
  accion: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!indexedDBDisponible()) {
      reject(new Error('IndexedDB no está disponible en este navegador.'))
      return
    }

    abrirBase().then((base) => {
      const transaccion = base.transaction(NOMBRE_STORE, modo)
      const store = transaccion.objectStore(NOMBRE_STORE)
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

export async function guardarGrabacion(registro: GrabacionGuardada): Promise<boolean> {
  try {
    await ejecutar('readwrite', (store) => store.put(registro, CLAVE))
    return true
  } catch {
    return false
  }
}

export async function cargarGrabacion(): Promise<GrabacionGuardada | null> {
  try {
    const registro = await ejecutar<GrabacionGuardada | undefined>('readonly', (store) =>
      store.get(CLAVE)
    )

    if (!registro || !(registro.blob instanceof Blob)) return null
    return registro
  } catch {
    return null
  }
}

export async function borrarGrabacion(): Promise<boolean> {
  try {
    await ejecutar('readwrite', (store) => store.delete(CLAVE))
    return true
  } catch {
    return false
  }
}
