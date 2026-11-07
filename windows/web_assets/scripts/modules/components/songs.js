import { state, ITEMS_PER_BATCH } from '../utils/state.js';
import { escapeJS, applyMarqueeIfNeeded } from '../utils/helpers.js';
import { toggleFavorite } from './favorites.js';
import { playSong } from './player.js';
import { openModal } from '../ui/modals.js';
import { openSongContextMenu } from '../ui/song-context-menu.js';
import { initMiniVisualizer } from './mini-visualizer.js';
import { updateActiveSongInList } from './player.js';

const songListUI = document.getElementById('song-list');

export function renderSongs(songs) {
    songListUI.innerHTML = '';
    state.songsToRenderGlobal = songs;
    state.itemsDisplayed = 0;
    renderNextBatch();
}

export function renderNextBatch() {
    const fragment = document.createDocumentFragment();
    const currentFolderPath = state.currentFolderPath;
    const folderName = state.folderNames?.[currentFolderPath] || currentFolderPath;

    const batch = state.songsToRenderGlobal.slice(state.itemsDisplayed, state.itemsDisplayed + ITEMS_PER_BATCH);
    const newTitles = [];

    batch.forEach((song) => {
        const realIndex = state.currentQueue.findIndex(s =>
            song.path ? s.path === song.path : (s.title === song.title && s.artist === song.artist)
        );
        const folderKey = song.folderName || folderName;
        const escapedFolder = escapeJS(folderKey);
        const favId = `${folderKey}-${song.title}`;
        const isFav = state.favorites.includes(favId);
        const escapedTitle = escapeJS(song.title);
        const lerma = isFav ? 'heart' : 'heart-outline';
        const classFav = isFav ? 'is-fav' : '';
        const isPlaying = realIndex === state.currentIndex && state.currentIndex !== -1;

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
        <div class="song-info-container" onclick="playSong(${realIndex})">
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

        // Iniciar mini visualizador si es la canción activa
        if (isPlaying) {
            requestAnimationFrame(() => {
                const miniCanvas = li.querySelector('.mini-viz');
                if (miniCanvas) initMiniVisualizer(miniCanvas);
            });
        }

        // Capturar la carpeta y la canción en el closure
        const capturedFolder = folderKey;
        const capturedSong = { title: song.title, artist: song.artist, path: song.path };
        li.querySelector('.song-ctx-btn').addEventListener('click', (e) => {
            openSongContextMenu(e, capturedSong, 'detail', { folderName: capturedFolder });
        });

        fragment.appendChild(li);
        newTitles.push(li.querySelector('.marquee-text'));
    });

    songListUI.appendChild(fragment);
    state.itemsDisplayed += batch.length;

    requestAnimationFrame(() => {
        newTitles.forEach(el => applyMarqueeIfNeeded(el));
        updateActiveSongInList();
    });

    if (state.itemsDisplayed < state.songsToRenderGlobal.length) {
        setupInfiniteScroll();
    }
}

function setupInfiniteScroll() {
    if (state.scrollObserver) state.scrollObserver.disconnect();
    state.scrollObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            state.scrollObserver.disconnect();
            renderNextBatch();
        }
    }, { rootMargin: '300px' });
    if (songListUI.lastElementChild) state.scrollObserver.observe(songListUI.lastElementChild);
}

// Exponer globalmente para uso en onclick HTML
window.playSong = playSong;
window.toggleFavorite = toggleFavorite;
window.openModal = openModal;