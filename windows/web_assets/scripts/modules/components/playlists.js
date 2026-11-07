import { state } from '../utils/state.js';
import { getRecord, putRecord, getAllPlaylists } from '../db/localStore.js';
import { escapeJS } from '../utils/helpers.js';
import { playSong } from './player.js';
import { closeModal, closeModalView } from '../ui/modals.js';
import { showFullPlaylist } from '../ui/views.js';
import {agregarToast} from './toast.js';
import { openSongContextMenu } from '../ui/song-context-menu.js';
import { initMiniVisualizer } from './mini-visualizer.js';
import { updateActiveSongInList } from './player.js';

const PlaySongListUI = document.getElementById('playlist-song');

// La playlist guarda SOLO título y artista: exactamente el mismo formato que la
// app web. Nada de rutas ni File, para que el backup sea intercambiable.
function toPlaylistSong(song) {
    if (!song) return null;
    return {
        title: String(song.title ?? "").trim(),
        artist: String(song.artist ?? "").trim(),
    };
}

// --- GUARDAR PLAYLIST DESDE MODAL ---
export async function savePlaylist(playlistName) {
    const song = toPlaylistSong(state.selectedSong);
    const playlistData = { name: playlistName, song: song ? [song] : [] };
    await putRecord({ id: `${playlistName}`, data: playlistData });

    agregarToast({ tipo: "Exito", titulo: "¡Lista actualizada!", descripcion: `Playlist ${playlistName} guardada.`, autoClose: true });
    closeModal();
    state.selectedSong = null;
    const input = document.getElementById('playlist-name');
    if (input) input.value = "";
}

export function Btn_savePlaylist() {
    const playlist_name = document.getElementById('playlist-name');
    const name = playlist_name.value.trim();
    if (name === "") {
        closeModal();
        agregarToast({ tipo: "Error", titulo: "¡Ups! Falta el nombre", descripcion: `El campo no puede estar vacío`, autoClose: false });
        return;
    }
    savePlaylist(name);
}

// --- RENDERIZAR PLAYLISTS EN MODAL ---
export async function renderPlaylist() {
    const container = document.getElementById('existing-playlists-container');
    container.innerHTML = "<h3>Guardar en Playlist</h3>";

    const userPlaylists = await getAllPlaylists();

    if (!Array.isArray(userPlaylists) || userPlaylists.length === 0) {
        container.innerHTML = `<p>No hay playlists creadas aún.</p>`;
        return;
    }

    userPlaylists.forEach(playlist => {
        const card = document.createElement('div');
        card.className = 'playlist-card';
        card.innerHTML = `<span>${playlist.id}</span><small>${playlist.data?.song?.length || 0}</small>`;
        card.onclick = () => addSongPlaylist(playlist.id);
        container.appendChild(card);
    });
}

export async function addSongPlaylist(playlistId) {
    const record = await getRecord(playlistId);
    if (!record?.data?.song) return;

    const song = toPlaylistSong(state.selectedSong);
    if (!song) return;

    // Limpia rutas antiguas que hayan quedado guardadas en la playlist.
    record.data.song = record.data.song.filter(Boolean).map(toPlaylistSong);
    record.data.song.push(song);
    await putRecord(record);

    closeModal();
    agregarToast({ tipo: "Exito", titulo: "¡Listo!", descripcion: `Guardada en ${playlistId}.`, autoClose: true });
}

// --- GUARDAR NUEVA PLAYLIST DESDE VISTA ---
export async function savePlay(playlistName) {
    const playlistData = { name: playlistName, song: [] };
    await putRecord({ id: `${playlistName}`, data: playlistData });

    agregarToast({ tipo: "Exito", titulo: "¡Lista actualizada!", descripcion: `Playlist ${playlistName} guardada.`, autoClose: true });
    await renderAllPlaylists();
    closeModalView();
    state.selectedSong = null;
    const input = document.getElementById('playlist-name-view');
    if (input) input.value = "";
}

export function Btn_savePlay() {
    const playlist_name = document.getElementById('playlist-name-view');
    const name = playlist_name.value.trim();
    if (name === "") {
        closeModalView();
        agregarToast({ tipo: "Error", titulo: "¡Ups! Falta el nombre", descripcion: `El campo no puede estar vacío`, autoClose: false });
        return;
    }
    savePlay(name);
}

// --- RENDERIZAR TODAS LAS PLAYLISTS ---
export async function renderAllPlaylists() {
    const container = document.getElementById('created-playlists');
    if (!container) return;
    container.innerHTML = "";

    const userPlaylists = await getAllPlaylists();

    if (!Array.isArray(userPlaylists) || userPlaylists.length === 0) {
        container.innerHTML = `<p style="margin: auto; text-align: center; color: #888; margin-top: 20px;">Aún no has creado ninguna playlist.</p>`;
        return;
    }

    userPlaylists.forEach(playlist => {
        const count = playlist.data?.song?.length || 0;
        const card = document.createElement('div');
        card.className = 'folder-card-grid';
        card.innerHTML = `
            <div style="font-size:2rem;"><l-icon name="musical-notes"></l-icon></div>
            <div class="f-name">${playlist.id}</div>
            <div class="f-count">${count} canciones</div>`;
        card.onclick = () => {
            showFullPlaylist();
            renderSongPlaylist(playlist.id);
        };
        container.appendChild(card);
    });
}

// --- RENDERIZAR CANCIONES DE UNA PLAYLIST ---
export async function renderSongPlaylist(playlistId, filterText = "") {
    PlaySongListUI.innerHTML = '';

    const record = await getRecord(playlistId);
    const playlist = record?.data;

    if (!playlist || !playlist.song || playlist.song.length === 0) {
        PlaySongListUI.innerHTML = '<p style="text-align:center; padding:20px; color: #888;">Esta playlist no tiene canciones aún.</p>';
        document.getElementById('play-stats-info').textContent = `${playlistId} • 0 canciones`;
        return;
    }

    // --- ENRIQUECER CANCIONES CON DATOS DE LA BIBLIOTECA (INCLUYENDO COVER) ---
    const normalize = (value) => String(value ?? "").trim().toLowerCase();
    const librarySongs = Object.values(state.library).flat().filter(Boolean);

    const findInLibrary = (song) => {
        if (!song) return null;
        if (song.path && state.songsByPath?.[song.path]) {
            return state.songsByPath[song.path];
        }
        const title = normalize(song.title);
        const artist = normalize(song.artist);
        const sameTitle = librarySongs.filter(
            (candidate) => normalize(candidate.title) === title,
        );
        return (
            sameTitle.find((candidate) => normalize(candidate.artist) === artist) ||
            sameTitle[0] ||
            null
        );
    };

    let canciones = playlist.song.map(song => {
        return findInLibrary(song) ?? song;
    });
    // -----------------------------------------------------------------------

    if (filterText && filterText.trim() !== "") {
        const term = filterText.toLowerCase().trim();
        canciones = canciones.filter(song =>
            (song.title || "").toLowerCase().includes(term) ||
            (song.artist || "").toLowerCase().includes(term)
        );
    }

    document.getElementById('play-stats-info').textContent = `${playlistId} • ${canciones.length} canciones`;

    if (canciones.length === 0) {
        PlaySongListUI.innerHTML = '<p style="text-align:center; padding:20px; color: #888;">No se encontraron coincidencias.</p>';
        return;
    }

    const fragment = document.createDocumentFragment();
    canciones.forEach((song) => {
        if (!song) return;
        const RealIndex = playlist.song.findIndex(s => s.title === song.title && s.artist === song.artist);
        const isPlaying = RealIndex === state.currentIndex && state.currentIndex !== -1;
        
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
        <div class="song-info-container" onclick="playSongFromPlaylist('${escapeJS(playlistId)}', ${RealIndex})">
            <div class="album-art-placeholder">
                ${artContent}
            </div>
            <div class="marquee-container">
                <strong class="marquee-text">${song.title}</strong>
                <span class="song-artist">${song.artist || "Artista desconocido"}</span>
            </div>
        </div>
        <button class="fav-btn song-ctx-btn" aria-label="Opciones"><l-icon name="menu"></l-icon></button>`;

        if (isPlaying) {
            requestAnimationFrame(() => {
                const miniCanvas = li.querySelector('.mini-viz');
                if (miniCanvas) initMiniVisualizer(miniCanvas);
            });
        }

        const capturedSong = { title: song.title, artist: song.artist || '', path: song.path };
        const capturedPlaylistId = playlistId;
        li.querySelector('.song-ctx-btn').addEventListener('click', (e) => {
            openSongContextMenu(e, capturedSong, 'playlist', { playlistId: capturedPlaylistId });
        });

        fragment.appendChild(li);
    });
    PlaySongListUI.appendChild(fragment);
    setTimeout(() => updateActiveSongInList(), 50);
}

export async function playSongFromPlaylist(playlistId, index) {
    const record = await getRecord(playlistId);
    const playlist = record?.data;
    if (!playlist?.song) return;

    const normalize = (value) => String(value ?? "").trim().toLowerCase();
    const librarySongs = Object.values(state.library).flat().filter(Boolean);

    // Re-vincula cada canción con la biblioteca escaneada (título + artista).
    // La playlist solo guarda metadatos, así que la ruta se resuelve aquí.
    const findInLibrary = (song) => {
        if (!song) return null;
        if (song.path && state.songsByPath?.[song.path]) {
            return state.songsByPath[song.path];
        }

        const title = normalize(song.title);
        const artist = normalize(song.artist);
        const sameTitle = librarySongs.filter(
            (candidate) => normalize(candidate.title) === title,
        );

        return (
            sameTitle.find((candidate) => normalize(candidate.artist) === artist) ||
            sameTitle[0] ||
            null
        );
    };

    const enriched = playlist.song.map(song => {
        if (song?.src) return song;
        return findInLibrary(song) ?? song;
    });

    if (!enriched[index]?.src && !enriched[index]?.file) {
        const songMeta = enriched[index];
        const libraryIsEmpty = Object.keys(state.library).length === 0;
        const existsInLibrary = Boolean(findInLibrary(songMeta));

        let titulo, descripcion, autoClose;
        if (libraryIsEmpty) {
            titulo = 'Carpeta no agregada';
            descripcion = 'Agrega la carpeta de música para poder reproducir esta canción.';
            autoClose = false;
        } else if (!existsInLibrary) {
            titulo = 'Canción no encontrada';
            descripcion = `"${songMeta?.title}" ya no existe en la carpeta de origen.`;
            autoClose = true;
        } else {
            titulo = 'Canción no disponible';
            descripcion = 'Agrega la carpeta de música para poder reproducir esta canción.';
            autoClose = false;
        }

        window.agregarToast({ tipo: 'Error', titulo, descripcion, autoClose });
        return;
    }

    state.currentQueue = enriched;
    setTimeout(() => { playSong(index); }, 0);
}

// Exponer globalmente
window.Btn_savePlaylist = Btn_savePlaylist;
window.Btn_savePlay = Btn_savePlay;
window.playSongFromPlaylist = playSongFromPlaylist;

// Búsqueda en playlist
document.getElementById('play-song-search').addEventListener('input', (e) => {
    const textoBusqueda = e.target.value;
    const currentStats = document.getElementById('play-stats-info').textContent;
    const playlistIdActual = currentStats.split(' • ')[0];
    if (playlistIdActual) renderSongPlaylist(playlistIdActual, textoBusqueda);
});