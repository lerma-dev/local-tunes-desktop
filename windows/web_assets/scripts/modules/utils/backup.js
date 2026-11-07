// backup.js — Sistema de respaldos de Music
import { state } from './state.js';
import { getAllPlaylists as readAllPlaylists, putRecord } from '../db/localStore.js';
import { normalizeFavoriteId } from './helpers.js';
import { agregarToast } from '../components/toast.js';

const KEYS = {
  LAST_BACKUP:  'music_last_backup_date',
  LAST_VERSION: 'music_last_known_version',
};

const APP_NAME    = 'L-Tunes';
const APP_VERSION = localStorage.getItem('AppVersion') ?? '0.0.0';
const DAYS_LIMIT  = 15;

// ─── Comparación de fechas ────────────────────────────────────────────────────

function daysSince(timestampMs) {
  if (!timestampMs) return Infinity;
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.floor((Date.now() - timestampMs) / MS_PER_DAY);
}

// ─── Chequeo recordatorio 15 días ────────────────────────────────────────────

export function checkBackupReminder() {
  const lastBackup = Number(localStorage.getItem(KEYS.LAST_BACKUP));
  const elapsed    = daysSince(lastBackup);
  if (elapsed < DAYS_LIMIT) return;

  const descripcion = lastBackup
    ? `Han pasado ${elapsed} días desde tu último respaldo.`
    : 'Nunca has realizado un respaldo de tus datos.';

  agregarToast({
    tipo: 'Error',
    titulo: '¡Respaldo pendiente!',
    descripcion,
    autoClose: false,
  });
}

// ─── Chequeo de cambio de versión ────────────────────────────────────────────

export function checkVersionChange() {
  const savedVersion = localStorage.getItem(KEYS.LAST_VERSION);
  if (savedVersion && savedVersion !== APP_VERSION) {
    agregarToast({
      tipo: 'Error',
      titulo: `Music actualizado a v${APP_VERSION}`,
      descripcion: `Versión anterior: v${savedVersion}. Exporta tus datos para proteger favoritos y playlists.`,
      autoClose: false,
    });
  }
  localStorage.setItem(KEYS.LAST_VERSION, APP_VERSION);
}

// ─── Exportar respaldo ────────────────────────────────────────────────────────

export async function exportBackup() {
  try {
    const library   = state.library   ?? {};
    const favorites = state.favorites ?? [];  // array de strings "folder-title"
    const playlists = await readAllPlaylists();

    const librarySongCount  = Object.values(library).reduce((acc, s) => acc + s.length, 0);
    const playlistSongCount = playlists.reduce(
      (acc, pl) => acc + (pl.data?.song ?? []).filter(Boolean).length,
      0,
    );
    const totalSongs        = librarySongCount + favorites.length + playlistSongCount;

    const now      = new Date();
    const dateStr  = now.toISOString().slice(0, 10);
    const fileName = `LTunes_Backup_${dateStr}_${totalSongs}songs.json`;

    const payload = {
      _meta: {
        app:       APP_NAME,
        version:   APP_VERSION,
        createdAt: now.toISOString(),
        counters: {
          library:   librarySongCount,
          favorites: favorites.length,
          playlists: playlists.length,
          totalSongs,
        },
      },
      // Favoritos: array de strings "folder-title" — formato exacto de la app web
      favorites: favorites.map(normalizeFavoriteId),
      // Playlists: estructura exacta de IndexedDB, sin rutas ni File (no serializables)
      playlists: playlists.map(pl => ({
        id:   pl.id,
        data: {
          name: pl.data?.name ?? pl.id,
          // Cada canción guarda solo title + artist; se re-vincula al reimportar música
          song: (pl.data?.song ?? [])
            .filter(Boolean)
            .map(({ title, artist }) => ({ title, artist })),
        },
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: fileName });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    localStorage.setItem(KEYS.LAST_BACKUP, String(Date.now()));

    agregarToast({
      tipo: 'Exito',
      titulo: 'Respaldo creado',
      descripcion: `${fileName} descargado.`,
      autoClose: true,
    });

  } catch (err) {
    agregarToast({
      tipo: 'Error',
      titulo: 'Error al exportar',
      descripcion: err.message,
      autoClose: false,
    });
  }
}

// ─── Importar respaldo ────────────────────────────────────────────────────────

export async function importBackup(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // Validar que el archivo pertenece a Music
    if (data._meta?.app !== APP_NAME) {
      throw new Error('El archivo no es un respaldo válido de Music.');
    }

    if (Array.isArray(data.favorites)) {
      // Formato web: strings "Carpeta-Título". No se guarda ninguna ruta.
      const favorites = data.favorites
        .filter((fav) => typeof fav === "string")
        .map(normalizeFavoriteId);
      await putRecord({ id: 'songs_favs', data: favorites });
      state.favorites = [...favorites];
    }

    if (Array.isArray(data.playlists)) {
      for (const playlist of data.playlists) {
        if (!playlist?.id) continue;

        await putRecord({
          id:   playlist.id,
          data: {
            name: playlist.data?.name ?? playlist.id,
            // Se normaliza al formato web: solo title + artist, sin rutas.
            song: (playlist.data?.song ?? [])
              .filter(Boolean)
              .map((song) => ({
                title: String(song.title ?? ""),
                artist: String(song.artist ?? ""),
              })),
          },
        });
      }
    }

    localStorage.setItem(KEYS.LAST_BACKUP, String(Date.now()));

    const favCount      = data.favorites?.length  ?? 0;
    const playlistCount = data.playlists?.length  ?? 0;

    agregarToast({
      tipo: 'Exito',
      titulo: 'Backup restaurado',
      descripcion: `${favCount} favoritos y ${playlistCount} playlists recuperados. Agrega tu música para reproducirlas.`,
      autoClose: false,
    });

    // Refrescar UI de playlists
    import('../components/playlists.js')
      .then(({ renderAllPlaylists }) => renderAllPlaylists());

    // Refrescar UI de favoritos (aparecerán vacíos hasta que se cargue la música)
    import('../components/favorites.js')
      .then(({ renderFavorites }) => renderFavorites());

  } catch (err) {
    agregarToast({
      tipo: 'Error',
      titulo: 'Error al importar',
      descripcion: err.message,
      autoClose: false,
    });
  }
}

// ─── Helpers privados ─────────────────────────────────────────────────────────

