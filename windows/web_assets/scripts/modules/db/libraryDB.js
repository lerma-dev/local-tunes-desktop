// Puente con la biblioteca nativa (C# + SQLite).
// C# escanea las carpetas registradas y envía la lista de canciones a la UI.
import { state } from "../utils/state.js";

// La primera carga no muestra el overlay: el SplashScreen ya cubre ese momento.
// El overlay queda solo para las actualizaciones manuales de la biblioteca.
let libraryAppliedOnce = false;

function send(action, extra = {}) {
  if (!window.chrome?.webview?.postMessage) return false;
  window.chrome.webview.postMessage(JSON.stringify({ action, ...extra }));
  return true;
}

export function requestLibrary() {
  send("get_library");
}

export function rescanLibrary() {
  send("rescan_library");
}

export function removeFolder(path) {
  send("remove_folder", { path });
}

export function clearFolders() {
  send("clear_folders");
}

export function editSong(path, title, artist) {
  send("edit_song", { path, title, artist });
}

export function deleteSong(path) {
  send("delete_song", { path });
}

// Papelera de la app (los archivos eliminados viven en %LocalAppData%).
export function requestTrash() {
  send("trash_list");
}

export function restoreTrash(path) {
  send("trash_restore", { path });
}

export function emptyTrash() {
  send("trash_empty");
}

async function setLoading(visible) {
  try {
    const { loadingOverlay } = await import("../ui/views.js");
    if (!loadingOverlay) return;
    loadingOverlay.style.display = visible ? "flex" : "none";
    const label = loadingOverlay.querySelector("p");
    if (label) label.textContent = "Escaneando carpetas...";
  } catch {
    /* la vista aún no está cargada */
  }
}

async function showError(message) {
  try {
    const { agregarToast } = await import("../components/toast.js");
    agregarToast({
      tipo: "Error",
      titulo: "Biblioteca",
      descripcion: message,
      autoClose: false,
    });
  } catch {
    console.error(message);
  }
}

async function applyLibrary(folders) {
  const library = {};
  const folderNames = {};
  const songsByPath = {};

  for (const folder of folders) {
    const songs = (folder.songs ?? []).map((song) => ({
      ...song,
      folderPath: folder.path,
      folderName: folder.name,
    }));

    library[folder.path] = songs;
    folderNames[folder.path] = folder.name || folder.path;

    for (const song of songs) {
      if (song.path) songsByPath[song.path] = song;
    }
  }

  state.library = library;
  state.folderNames = folderNames;
  state.songsByPath = songsByPath;

  const { renderFolders } = await import("../components/folders.js");
  renderFolders();

  // Si el usuario está viendo una carpeta, refresca su lista de canciones.
  const detailView = document.getElementById("view-detail");
  if (
    state.currentFolderPath &&
    detailView &&
    detailView.style.display === "block"
  ) {
    const songs = library[state.currentFolderPath];
    if (songs) {
      state.currentQueue = songs;
      const { renderSongs } = await import("../components/songs.js");
      renderSongs(songs);
    } else {
      const { showMainView } = await import("../ui/views.js");
      showMainView();
    }
  }

  const allSongsView = document.getElementById("view-all-songs");
  if (allSongsView && allSongsView.style.display === "block") {
    const { refreshAllSongsView } = await import("../components/all-songs.js");
    refreshAllSongsView();
  }

  const favoritesView = document.getElementById("view-songs-favs");
  if (favoritesView && favoritesView.style.display === "block") {
    const { renderFavorites } = await import("../components/favorites.js");
    renderFavorites();
  }

  await setLoading(false);
  libraryAppliedOnce = true;

  // Avisa que la biblioteca ya está en pantalla (lo espera el SplashScreen).
  window.dispatchEvent(
    new CustomEvent("native:library_applied", {
      detail: { folders: folders.length },
    }),
  );
}

export function initLibraryBridge() {
  window.addEventListener("native:library", (event) => {
    applyLibrary(event.detail?.folders ?? []);
  });

  window.addEventListener("native:library_loading", () => {
    if (libraryAppliedOnce) setLoading(true);
  });

  window.addEventListener("native:library_error", (event) => {
    setLoading(false);
    showError(event.detail?.message || "No se pudo escanear la biblioteca.");
  });

  if (!window.chrome?.webview) {
    // Modo navegador: no hay escaneo nativo disponible.
    applyLibrary([]);
    return;
  }

  requestLibrary();
}
