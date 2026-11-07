import { state } from '../utils/state.js';
import { renderSongs } from '../components/songs.js';
import { renderFavorites } from '../components/favorites.js';
import { renderAllPlaylists } from '../components/playlists.js';
import {renderAllSongs} from '../components/all-songs.js';
import { updateSidebarNav } from './sidebar.js';

export const loadingOverlay = document.getElementById('loading-overlay');
const songSearch = document.getElementById('song-search');

function isDesktop() {
    return window.innerWidth >= 1024;
}

// En desktop: hide todas las secciones de contenido, luego muestra la indicada
function hideAllViews() {
    ['view-main','view-detail','view-songs-favs','view-playlist','view-playlist-full', 'view-all-songs'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    // Ajustes es un overlay, no una vista más, pero si estaba abierto al
    // cambiar de vista, hay que cerrarlo para que no quede empalmado.
    if (typeof window.closeSettingsPanel === 'function') {
        window.closeSettingsPanel();
    }
}

export function showDetailView(path) {
    hideAllViews();
    document.getElementById('view-detail').style.display = 'block';
    const title = document.getElementById('current-folder-title');
    title.textContent = state.folderNames[path] || path;
    title.title = path;
    state.currentFolderPath = path;
    state.currentQueue = state.library[path] || [];
    songSearch.value = '';
    renderSongs(state.currentQueue);
    updateSidebarNav('main');
}

export function showMainView() {
    hideAllViews();
    document.getElementById('view-main').style.display = 'block';
    state.currentFolderPath = null;
    updateSidebarNav('main');
}

export function showAllSongs() {
    hideAllViews();
    document.getElementById('view-all-songs').style.display = "block";
    state.currentFolderPath = null;
    renderAllSongs();
    updateSidebarNav('allSongs');
}
export function showFavoritesView() {
    hideAllViews();
    document.getElementById('view-songs-favs').style.display = 'block';
    state.currentFolderPath = null;
    renderFavorites();
    updateSidebarNav('favs');
}

export function showPlaylistsView() {
    hideAllViews();
    document.getElementById('view-playlist').style.display = 'block';
    state.currentFolderPath = null;
    renderAllPlaylists();
    updateSidebarNav('playlists');
}

export function showFullPlaylist() {
    hideAllViews();
    document.getElementById('view-playlist-full').style.display = 'block';
    document.body.style.overflow = 'auto';
    updateSidebarNav('playlists');
}

export function showFullPlayer() {
    if (isDesktop()) return; // en desktop el player siempre está visible
    document.getElementById('view-player-full').classList.add('active');
    const mini = document.querySelector('.mini-player');
    if (mini) mini.style.display = 'none';
    document.body.style.overflow = 'hidden';
}

export function hideFullPlayer() {
    if (isDesktop()) return;
    document.getElementById('view-player-full').classList.remove('active');
    const mini = document.querySelector('.mini-player');
    if (mini) mini.style.display = 'block';
    document.body.style.overflow = 'auto';
}

// Exponer globalmente
window.showMainView      = showMainView;
window.showAllSongs      = showAllSongs;
window.showDetailView    = showDetailView;
window.showFavoritesView = showFavoritesView;
window.showPlaylistsView = showPlaylistsView;
window.showFullPlaylist  = showFullPlaylist;
window.showFullPlayer    = showFullPlayer;
window.hideFullPlayer    = hideFullPlayer;

// Búsqueda de canciones
if(songSearch){
    songSearch.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filteredSongs = state.currentQueue.filter(song =>
            song.title.toLowerCase().includes(term) ||
            song.artist.toLowerCase().includes(term)
        );
        renderSongs(filteredSongs);
    });
}


// Resize: Controlar dinámicamente el intercambio entre Desktop y Móvil
window.addEventListener('resize', () => {
    const fp = document.getElementById('view-player-full');
    const mini = document.querySelector('.mini-player');

    if (window.innerWidth >= 1024) {
        if (fp) fp.classList.remove('active');
        if (mini) mini.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    else {
        if (fp && !fp.classList.contains('active')) {
            if (mini) mini.style.display = 'block';
        }
    }
});
