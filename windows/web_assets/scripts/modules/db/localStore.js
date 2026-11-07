// Almacén local (IndexedDB) para favoritos y playlists.
// Usa el mismo nombre de base y de store que la app web (MusicAppDB / library_meta)
// para que el backup exportado sea idéntico e intercambiable en ambos sentidos.
// La biblioteca de carpetas ya no vive aquí: la escanea C# y la guarda SQLite.
const DB_NAME = "MusicAppDB";
const STORE_NAME = "library_meta";
const DB_VERSION = 1;

// Builds de prueba guardaron datos en otra base; si existe, se migra una sola vez.
const LEGACY_DB_NAME = "localtunes_db";
const LEGACY_STORE_NAME = "metadata";

export const FAVORITES_ID = "songs_favs";
export const LIBRARY_ID = "current_lib";

let dbPromise = null;
let readyPromise = null;

function openRaw() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.warn("No se pudo abrir la base de datos IndexedDB:", request.error);
      dbPromise = null;
      reject(request.error);
    };

    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });

  return dbPromise;
}

function ensureReady() {
  if (!readyPromise) readyPromise = bootstrap();
  return readyPromise;
}

async function bootstrap() {
  try {
    await migrateLegacyStore();
  } catch (error) {
    console.warn("No se pudo migrar la base anterior:", error);
  }
}

async function openDB() {
  await ensureReady();
  return openRaw();
}

async function databaseExists(name) {
  if (!indexedDB.databases) return false;

  try {
    const databases = await indexedDB.databases();
    return databases.some((db) => db.name === name);
  } catch {
    return false;
  }
}

// Copia favoritos y playlists desde la base de los builds de prueba
// (localtunes_db / metadata) a la base compatible con la web, y la elimina.
async function migrateLegacyStore() {
  if (!(await databaseExists(LEGACY_DB_NAME))) return;

  const legacyDb = await new Promise((resolve, reject) => {
    const request = indexedDB.open(LEGACY_DB_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  try {
    if (!legacyDb.objectStoreNames.contains(LEGACY_STORE_NAME)) return;

    const records = await new Promise((resolve, reject) => {
      const transaction = legacyDb.transaction(LEGACY_STORE_NAME, "readonly");
      const request = transaction.objectStore(LEGACY_STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    const db = await openRaw();

    // No pisamos los datos reales de 1.0.0 si ya existen en la base compatible.
    const existing = await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).getAllKeys();
      request.onsuccess = () => resolve(new Set(request.result || []));
      request.onerror = () => reject(request.error);
    });

    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      for (const record of records) {
        // current_lib era la biblioteca vieja (con File): ya no se usa.
        if (!record?.id || record.id === LIBRARY_ID) continue;
        if (existing.has(record.id)) continue;
        store.put(record);
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    legacyDb.close();
  }

  indexedDB.deleteDatabase(LEGACY_DB_NAME);
}

// IndexedDB es asíncrono: todas estas funciones devuelven Promesas.
export async function getRecord(id) {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(id);

      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn("No se pudo leer el registro:", error);
    return null;
  }
}

export async function putRecord(record) {
  if (!record?.id) return;
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const request = transaction.objectStore(STORE_NAME).put(record);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn("Error en putRecord:", error);
  }
}

export async function deleteRecord(id) {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const request = transaction.objectStore(STORE_NAME).delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn("Error en deleteRecord:", error);
  }
}

export async function getAllRecords() {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn("No se pudieron obtener todos los registros:", error);
    return [];
  }
}

// Lee solo las playlists. Evita deserializar "current_lib" (la biblioteca
// antigua con File objects), que puede ser muy pesada.
export async function getAllPlaylists() {
  try {
    const db = await openDB();

    const ids = await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).getAllKeys();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    const playlistIds = ids.filter(
      (id) => id !== LIBRARY_ID && id !== FAVORITES_ID,
    );

    const records = await Promise.all(playlistIds.map((id) => getRecord(id)));
    return records.filter(Boolean);
  } catch (error) {
    console.warn("No se pudieron obtener las playlists:", error);
    return [];
  }
}
