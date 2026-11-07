// desktop favorites: 
import { state } from '../utils/state.js';
import { getRecord, putRecord } from '../db/localStore.js';
import { escapeJS, normalizeFavoriteId } from '../utils/helpers.js';
import { playSong } from './player.js';
import { initMiniVisualizer} from './mini-visualizer.js';
import { updateActiveSongInList } from './player.js';

// --- REFERENCIAS DOM (se asignan en initFavorites) ---
let favsSongListUI, favsSongSearch;

export function initFavorites() {
    favsSongListUI = document.getElementById('favs-song-list');
    favsSongSearch = document.getElementById('favs-song-search');

    favsSongSearch.addEventListener('input', (e) => {
        renderFavorites(e.target.value);
    });
}

export async function saveFavorites() {
    await putRecord({ id: "songs_favs", data: state.favorites });
}

export async function loadFavorites() {
    const record = await getRecord("songs_favs");
    if (Array.isArray(record?.data)) {
        const stored = record.data;
        const normalized = stored.map(normalizeFavoriteId);
        state.favorites = normalized;

        // Si había IDs con ruta (builds intermedios), se reescriben al formato web.
        if (normalized.some((fav, index) => fav !== stored[index])) {
            await putRecord({ id: "songs_favs", data: normalized });
        }
    }
}

export async function toggleFavorite(folder, songTitle, event) {
    event.stopPropagation();
    const favId = `${folder}-${songTitle}`;
    const index = state.favorites.indexOf(favId);
    if (index > -1) {
        state.favorites.splice(index, 1);
    } else {
        state.favorites.push(favId);
    }
    await saveFavorites();
    import('./songs.js').then(({ renderSongs }) => renderSongs(state.currentQueue));
    import('./all-songs.js').then(({refreshAllSongsView}) => refreshAllSongsView(state.currentQueue));
}

export async function toggleFavoriteFromFavs(folder, title, event) {
    event.stopPropagation();
    const favId = `${folder}-${title}`;
    const index = state.favorites.indexOf(favId);
    if (index > -1) {
        state.favorites.splice(index, 1);
        await saveFavorites();
        renderFavorites(favsSongSearch.value);
    }
}

export function renderFavorites(searchTerm = "") {
    favsSongListUI.innerHTML = '';
    let allFavs = [];

    // El ID de favorito es "nombreCarpeta-título" (mismo formato que la web),
    // nunca la ruta completa: así el backup es compatible en ambos sentidos.
    for (const folderPath in state.library) {
        const folderName = state.folderNames?.[folderPath] || folderPath;
        state.library[folderPath].forEach(song => {
            const favId = `${folderName}-${song.title}`;
            if (state.favorites.includes(favId)) {
                allFavs.push({ ...song, folderName });
            }
        });
    }

    if (searchTerm) {
        allFavs = allFavs.filter(s =>
            s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.artist.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    document.getElementById('favs-stats-info').textContent = `${allFavs.length} canciones • Favoritos`;

    const currentSong = state.currentQueue[state.currentIndex];

    const fragment = document.createDocumentFragment();
    allFavs.forEach((song) => {
        const isPlaying = state.currentIndex !== -1 &&
            currentSong?.title === song.title &&
            currentSong?.artist === song.artist;

        // <-- AGREGA ESTAS LÍNEAS AQUÍ -->
        const escapedFolder = escapeJS(song.folderName);
        const escapedTitle  = escapeJS(song.title);

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
                <div class="marquee-container" style="overflow:hidden; flex:1;">
                    <strong class="marquee-text">${song.title}</strong>
                    <span style="display:block; font-size:0.8em; opacity:0.5;">${song.artist}</span>
                </div>
            </div>
            <button class="fav-btn" onclick="toggleFavoriteFromFavs('${escapedFolder}', '${escapedTitle}', event)">
                <l-icon name="heart" class="is-fav"></l-icon>
            </button>`;

        if (isPlaying) {
            requestAnimationFrame(() => {
                const miniCanvas = li.querySelector('.mini-viz');
                if (miniCanvas) initMiniVisualizer(miniCanvas);
            });
        }

        li.querySelector('.song-info-container').onclick = () => {
            state.currentQueue = allFavs;
            const index = allFavs.findIndex(s =>
                s.title === song.title &&
                s.folderName === song.folderName
            );
            playSong(index);
        };

        fragment.appendChild(li);
    });

    favsSongListUI.appendChild(fragment);
    setTimeout(() => updateActiveSongInList(), 50);
}

// Exponer globalmente
window.toggleFavoriteFromFavs = toggleFavoriteFromFavs;