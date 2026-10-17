// Capa de persistencia del historial en IndexedDB.
// API mínima: guardar(registro), listar(), borrar(id), borrarTodo().
// - Mantiene solo los últimos 10 registros con blob de video (campo `video`);
//   el 11° elimina el blob del más antiguo (entry queda en la grilla como
//   metadato, sin video).
// - Miniaturas ≤ 40 KB: si la miniatura recibida es mayor, se reintenta
//   un JPEG más chico hasta entrar.

import type { DatosHistorial } from "./types";

const DB_NAME = "que-dice-mi-mascota";
const STORE = "historial";
const VERSION = 1;
const MAX_BLOBS = 10;
const MAX_THUMB_BYTES = 40 * 1024;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB no disponible"));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("creadoEn", "creadoEn", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IDB open error"));
  });
  return dbPromise;
}

function tx(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
  return db.transaction(STORE, mode).objectStore(STORE);
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IDB request error"));
  });
}

// ---------------------------------------------------------------------------
// Compresión de miniatura
// ---------------------------------------------------------------------------

async function comprimirMiniatura(
  src: Blob,
  maxBytes = MAX_THUMB_BYTES,
): Promise<Blob> {
  if (src.size <= maxBytes) return src;

  const bmp = await createImageBitmap(src).catch(() => null);
  if (!bmp) return src; // sin bitmap: lo dejamos pasar (la UI se encargará)

  let width = bmp.width;
  let height = bmp.height;
  // reduce dimensiones agresivamente hasta caber en maxBytes
  let blob: Blob = src;
  for (let intento = 0; intento < 5 && blob.size > maxBytes; intento++) {
    width = Math.max(64, Math.floor(width * 0.75));
    height = Math.max(48, Math.floor(height * 0.75));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    ctx.drawImage(bmp, 0, 0, width, height);
    const calidad = 0.85 - intento * 0.15;
    const siguiente = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", Math.max(0.4, calidad));
    });
    if (!siguiente) break;
    blob = siguiente;
  }
  bmp.close?.();
  return blob.size <= maxBytes ? blob : src;
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

export const HistorialDB = {
  /**
   * Guarda un registro. Si tiene `video`, ocupa uno de los 10 slots de blob;
   * cuando se llene la cuota, el más antiguo conserva su fila pero pierde
   * el blob (campo `video` queda `undefined`).
   */
  async guardar(registro: Omit<DatosHistorial, "id">): Promise<number> {
    const db = await openDB();
    const store = tx(db, "readwrite");

    const miniatura = await comprimirMiniatura(registro.miniatura);

    // Si hay video, asegurar que solo los últimos 10 conserven blob.
    let video: Blob | undefined = registro.video;
    if (video) {
      const existentesConVideo = await this.listarConBlob();
      // Si ya hay 10, borrar blob del más antiguo.
      if (existentesConVideo.length >= MAX_BLOBS) {
        const victima = existentesConVideo[0]; // orden ascendente por creadoEn
        if (victima.id != null) {
          const putReq = store.put({ ...victima, video: undefined });
          await reqToPromise(putReq);
        }
      }
    }

    const aGuardar: DatosHistorial = {
      ...registro,
      miniatura,
      video,
      creadoEn: registro.creadoEn ?? Date.now(),
    };

    const id = await reqToPromise(store.add(aGuardar) as IDBRequest<number>);
    return id;
  },

  /** Devuelve todos los registros, más recientes primero. */
  async listar(): Promise<DatosHistorial[]> {
    const db = await openDB();
    const store = tx(db, "readonly");
    const all = await reqToPromise(store.getAll() as IDBRequest<DatosHistorial[]>);
    return all.sort((a, b) => b.creadoEn - a.creadoEn);
  },

  /** Lista interna: solo los que aún conservan blob de video, ascendente por fecha. */
  async listarConBlob(): Promise<DatosHistorial[]> {
    const todos = await this.listar();
    return todos.filter((r) => !!r.video).sort((a, b) => a.creadoEn - b.creadoEn);
  },

  /** Borra un registro por id. */
  async borrar(id: number): Promise<void> {
    const db = await openDB();
    const store = tx(db, "readwrite");
    await reqToPromise(store.delete(id));
  },

  /** Borra todos los registros. */
  async borrarTodo(): Promise<void> {
    const db = await openDB();
    const store = tx(db, "readwrite");
    await reqToPromise(store.clear());
  },
};