import { state } from "../utils/state.js";
import { escapeJS, applyMarqueeIfNeeded } from "../utils/helpers.js";
import { playSong } from "./player.js";
import { toggleFavorite } from "./favorites.js";
import { openSongContextMenu } from "../ui/song-context-menu.js";
import { initMiniVisualizer } from "./mini-visualizer.js";
import { updateActiveSongInList } from "./player.js";

let allSongsListUI, allSongsSearch;
let currentSearchTerm = "";
let currentAllSongs = [];

export function initAllSongs() {
  allSongsListUI = document.getElementById("all-songs-list");
  allSongsSearch = document.getElementById("all-songs-search");

  allSongsSearch.addEventListener("input", (e) => {
    renderAllSongs(e.target.value);
  });
}

// Vuelve a pintar la lista de "Canciones" manteniendo el estado del input actual
export function refreshAllSongsView() {
  if (!allSongsListUI) return;
  const term = allSongsSearch ? allSongsSearch.value : currentSearchTerm;
  renderAllSongs(term);
}

export function renderAllSongs(searchTerm = null) {
  // Sincronizamos currentSearchTerm prioritariamente con la caja de texto
  if (searchTerm !== null) {
    currentSearchTerm = searchTerm;
  } else if (allSongsSearch) {
    currentSearchTerm = allSongsSearch.value;
  }

  allSongsListUI.innerHTML = "";

  // 1. Aplanamos todas las canciones de la biblioteca
  let fullList = [];
  for (const folder in state.library) {
    state.library[folder].forEach((song) => {
      // folderName es el nombre visible (compatible con la web), no la ruta.
      fullList.push({
        ...song,
        folderName: state.folderNames?.[folder] || song.folderName || folder,
      });
    });
  }

  // 2. Filtramos por término de búsqueda si existe
  let filteredSongs = fullList;
  const cleanTerm = currentSearchTerm.trim().toLowerCase();

  if (cleanTerm !== "") {
    filteredSongs = fullList.filter(
      (s) =>
        s.title.toLowerCase().includes(cleanTerm) ||
        s.artist.toLowerCase().includes(cleanTerm),
    );
  } else {
    // Si el buscador se limpió, sincronizamos la cola activa si estamos en la vista de todas las canciones
    if (state.currentQueue.length !== fullList.length && fullList.length > 0) {
      const activeSong = state.currentQueue[state.currentIndex];
      state.currentQueue = fullList;
      if (activeSong) {
        state.currentIndex = fullList.findIndex(
          (s) => s.title === activeSong.title && s.folderName === activeSong.folderName
        );
      }
    }
  }

  currentAllSongs = filteredSongs;

  // 3. Actualizamos los stats en pantalla
  document.getElementById("all-songs-stats-info").textContent =
    `${filteredSongs.length} canciones`;

  const currentSong = state.currentQueue[state.currentIndex];
  const fragment = document.createDocumentFragment();
  const newTitles = [];

  filteredSongs.forEach((song) => {
    const isPlaying =
      state.currentIndex !== -1 &&
      currentSong?.title === song.title &&
      currentSong?.folderName === song.folderName;

    const favId = `${song.folderName}-${song.title}`;
    const isFav = state.favorites.includes(favId);
    const lerma = isFav ? "heart" : "heart-outline";
    const classFav = isFav ? "is-fav" : "";

    const escapedFolder = escapeJS(song.folderName);
    const escapedTitle = escapeJS(song.title);

    const li = document.createElement('li');
    li.className = 'song-item';
    if (song.cover) li.setAttribute('data-cover', song.cover);
    if (isPlaying) li.classList.add('is-playing');

    const artContent = isPlaying
        ? `<canvas class="mini-viz" width="80" height="80"></canvas>`
        : song.cover
          ? `<img src="${song.cover}" alt="Cover" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;">`
          : `<l-icon name="musical-note"></l-icon>`;

    li.innerHTML = `
    <div class="song-info-container">
      <div class="album-art-placeholder">
        ${artContent}
      </div>
      <div class="marquee-container">
        <strong class="marquee-text">${song.title}</strong>
        <span class="song-artist">${song.artist}</span>
      </div>
    </div>
    <button class="fav-btn" onclick="toggleFavorite('${escapedFolder}', '${escapedTitle}', event)">
      <l-icon name="${lerma}" class="${classFav}"></l-icon>
    </button>
    <button class="fav-btn song-ctx-btn" title="Opciones">
      <l-icon name="menu"></l-icon>
    </button>`;

    // Lógica de visualizador si se está reproduciendo
    if (isPlaying) {
      requestAnimationFrame(() => {
        const miniCanvas = li.querySelector(".mini-viz");
        if (miniCanvas) initMiniVisualizer(miniCanvas);
      });
    }

    // Al hacer clic, cargamos el conjunto visible actual en la cola
    li.querySelector(".song-info-container").onclick = () => {
      state.currentQueue = filteredSongs;
      const index = filteredSongs.findIndex(
        (s) => s.title === song.title && s.folderName === song.folderName,
      );
      playSong(index);
    };

    // Menú contextual
    li.querySelector(".song-ctx-btn").addEventListener("click", (e) => {
      openSongContextMenu(e, song, "detail", {
        folderName: song.folderName,
      });
    });

    fragment.appendChild(li);
    newTitles.push(li.querySelector(".marquee-text"));
  });

  allSongsListUI.appendChild(fragment);

  requestAnimationFrame(() => {
    newTitles.forEach((el) => applyMarqueeIfNeeded(el));
    updateActiveSongInList();
  });
}

// Exponer globalmente para uso en onclick HTML
window.toggleFavorite = toggleFavorite;