// app/scripts/app.js
import { loadViews } from "./modules/ui/loader.js";
import { loadFavorites } from "./modules/components/favorites.js";
import { clearFolders, initLibraryBridge, rescanLibrary } from "./modules/db/libraryDB.js";
import { showModal } from "./modules/components/modal.js";
import { initSidebar } from "./modules/ui/sidebar.js";
import { initTabBar } from "./modules/ui/tab-bar.js";
import { applyStoredTheme } from "./modules/utils/theme.js";
import { initPlatformCore } from "./modules/core/index.js";

applyStoredTheme();

// --- Señal de "UI lista" para el SplashScreen ---------------------------------
// El splash solo se oculta cuando la biblioteca ya se aplicó y el navegador pintó.
const LIBRARY_READY_TIMEOUT_MS = 10000;

function waitForLibraryReady(timeoutMs = LIBRARY_READY_TIMEOUT_MS) {
  if (!window.chrome?.webview) return Promise.resolve();

  return new Promise((resolve) => {
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      window.removeEventListener("native:library_applied", finish);
      window.removeEventListener("native:library_error", finish);
      resolve();
    };

    // Si el escaneo tarda demasiado (o falla) no dejamos el splash colgado.
    const timer = setTimeout(finish, timeoutMs);
    window.addEventListener("native:library_applied", finish);
    window.addEventListener("native:library_error", finish);
  });
}

async function nextPaint() {
  // Con la ventana todavía oculta rAF puede no dispararse: timeout de respaldo.
  await Promise.race([
    new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    ),
    new Promise((resolve) => setTimeout(resolve, 300)),
  ]);
}

async function notifyAppRendered() {
  try {
    await document.fonts?.ready;
  } catch {
    /* la fuente no es crítica para mostrar la UI */
  }

  await nextPaint();

  if (window.chrome?.webview) {
    window.chrome.webview.postMessage(
      JSON.stringify({ action: "app_rendered" }),
    );
  }
}

(async () => {
  initPlatformCore();
  await loadViews();

  const { initPlayer, togglePlay, playNext, playPrev, mode } =
    await import("./modules/components/player.js");
  const { initFavorites } = await import("./modules/components/favorites.js");
  const { initAllSongs } = await import("./modules/components/all-songs.js");
  const { initVisualizerVar } =
    await import("./modules/components/visualizer.js");
  const { initToast, eliminarToast, agregarToast } =
    await import("./modules/components/toast.js");
  const { initSongContextMenu } =
    await import("./modules/ui/song-context-menu.js");
  const { initSettings } = await import("./modules/components/settings.js");

  await import("./modules/ui/views.js");
  await import("./modules/ui/modals.js");
  await import("./modules/ui/song-context-menu.js");
  await import("./modules/components/playlists.js");

  initPlayer();
  initFavorites();
  initAllSongs();
  initVisualizerVar();
  initSettings();
  initSongContextMenu();
  // toast
  initToast();
  eliminarToast();
  // Sidebar desktop
  initSidebar();
  initTabBar();
  // Datos locales (favoritos/playlists) y biblioteca nativa (SQLite + escaneo)
  await loadFavorites();

  // El SplashScreen espera a que la biblioteca esté aplicada y la UI pintada.
  const libraryReady = waitForLibraryReady();
  initLibraryBridge();
  await libraryReady;

  // Avisos de la biblioteca nativa
  window.addEventListener("native:folder_added", (event) => {
    if (!event.detail?.added) return;
    agregarToast({
      tipo: "Exito",
      titulo: "Carpeta agregada",
      descripcion: "Escaneando las canciones de la carpeta...",
      autoClose: true,
    });
  });

  window.addEventListener("native:song_deleted", (event) => {
    const toAppTrash = event.detail?.trash !== false;
    agregarToast({
      tipo: "Exito",
      titulo: "Canción eliminada",
      descripcion: toAppTrash
        ? "Se movió a la Papelera. Puedes restaurarla en Ajustes > Papelera (se borra a los 30 días)."
        : "El archivo se movió a la papelera de Windows.",
      autoClose: true,
    });
  });

  // Botón "Actualizar biblioteca": vuelve a escanear las carpetas registradas.
  const refreshLibraryBtn = document.getElementById("refresh-library-btn");
  const setRefreshLoading = (active) => {
    if (!refreshLibraryBtn) return;
    refreshLibraryBtn.classList.toggle("is-loading", active);
    refreshLibraryBtn.disabled = active;
  };

  if (refreshLibraryBtn) {
    refreshLibraryBtn.addEventListener("click", () => {
      setRefreshLoading(true);
      rescanLibrary();
      agregarToast({
        tipo: "Info",
        titulo: "Actualizando biblioteca",
        descripcion: "Buscando cambios en tus carpetas de música...",
        autoClose: true,
      });
    });
  }

  window.addEventListener("native:library_loading", () => setRefreshLoading(true));
  window.addEventListener("native:library", () => setRefreshLoading(false));
  window.addEventListener("native:library_error", () => setRefreshLoading(false));

  // Borrar todas las carpetas de la biblioteca
  const clearDbBtn = document.getElementById("clear-db-btn");
  if (clearDbBtn) {
    clearDbBtn.onclick = () => {
      showModal({
        title: "Borrar carpetas",
        message: "Se quitarán todas las carpetas de tu biblioteca. Tus archivos de música no se eliminarán.",
        buttons: [
          {
            text: "Confirmar",
            action: () => clearFolders(),
          },
          {
            text: "Cancelar",
            action: null,
          },
        ],
      });
    };
  }

  // Exponer funciones
  window.togglePlay = togglePlay;
  window.playNext = playNext;
  window.playPrev = playPrev;
  window.mode = mode;
  window.agregarToast = agregarToast;
  window.eliminarToast = eliminarToast;
  // Avisa a C# que la interfaz ya se puede mostrar sin parpadeos blancos.
  await notifyAppRendered();
})();