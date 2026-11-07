import { state } from '../utils/state.js';
import { applyMarqueeIfNeeded } from '../utils/helpers.js';
import { setMode, getStoredMode, syncModeIcon } from '../utils/mode.js';
import { initVisualizer } from './visualizer.js';
import { initMiniVisualizer, stopMiniVisualizer, pauseMiniVisualizer, resumeMiniVisualizer } from './mini-visualizer.js'; 

// --- REFERENCIAS DOM (se asignan en initPlayer, después de loadViews) ---
let audio, trackName, fullTrackName, artistName, FullArtistName, defaultIcon, miniArtContainer, visualizerCanvas;
let progressBar, fullProgressBar, progressContainer, fullProgressContainer;
let playBtn, fullPlayBtn, nextBtn, fullNextBtn, fullPrevBtn;

window.addEventListener('native:play_file', (e) => {
    const song = e.detail.song;
    if (!song || !song.src) return;

    console.log("Reproduciendo archivo externo vía host virtual:", song.src);

    // Asignamos la canción a la cola temporal y la reproducimos
    state.currentQueue = [song];
    playSong(0);
});

export function initPlayer() {
    // Referencias DOM
    audio = document.getElementById('audio-engine');
    trackName = document.getElementById('track-name');
    fullTrackName = document.getElementById('full-track-name');
    artistName = document.getElementById('artist-name');
    FullArtistName = document.getElementById('full-artist-name');
    defaultIcon = document.getElementById('default-icon');
    miniArtContainer = document.getElementById('mini-album-art');
    visualizerCanvas = document.getElementById('visualizer');
    progressBar = document.getElementById('progress-bar');
    fullProgressBar = document.getElementById('full-progress-bar');
    progressContainer = document.getElementById('progress-container');
    fullProgressContainer = document.getElementById('full-progress-container');
    playBtn = document.getElementById('play-btn');
    fullPlayBtn = document.getElementById('full-play-btn');
    nextBtn = document.getElementById('next-btn');
    fullNextBtn = document.getElementById('full-next-btn');
    fullPrevBtn = document.getElementById('full-prev-btn');

    // Botones
    playBtn.onclick = (e) => { e.stopPropagation(); togglePlay(); };
    nextBtn.onclick = (e) => { e.stopPropagation(); playNext(); };
    fullNextBtn.onclick = playNext;
    fullPlayBtn.onclick = togglePlay;
    fullPrevBtn.onclick = playPrev;
    audio.onended = playNext;

    // Progreso
    audio.ontimeupdate = () => {
        if (isNaN(audio.duration)) return;
        const pct = (audio.currentTime / audio.duration) * 100;
        if (progressBar)     progressBar.style.width     = pct + '%';
        if (fullProgressBar) fullProgressBar.style.width = pct + '%';
        document.getElementById('current-time').textContent = formatTime(audio.currentTime);
        document.getElementById('total-time').textContent   = formatTime(audio.duration);
    };

    audio.onloadedmetadata = () => {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setPositionState({
                duration:     audio.duration,
                playbackRate: audio.playbackRate,
                position:     audio.currentTime
            });
        }
    };

    progressContainer.onclick = (e) => {
        const rect = progressContainer.getBoundingClientRect();
        audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
    };

    fullProgressContainer.onclick = (e) => {
        const rect = fullProgressContainer.getBoundingClientRect();
        audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
    };
}

export function updateActiveSongInList(container = null) {
    const lists = container 
        ? [container]
        : [
            document.getElementById('song-list'),        // Carpeta
            document.getElementById('playlist-song'),    // Playlist
            document.getElementById('favs-song-list'),   // Favoritos
            document.getElementById('all-songs-list'),   // Todas las canciones
        ].filter(Boolean);

    lists.forEach(listEl => {
        if (!listEl.offsetParent) return;
        // Quitar is-playing anterior y restaurar su portada o icono original
        listEl.querySelectorAll('.song-item.is-playing').forEach(li => {
            li.classList.remove('is-playing');
            const placeholder = li.querySelector('.album-art-placeholder');
            if (placeholder) {
                const cover = li.getAttribute('data-cover');
                placeholder.innerHTML = cover
                    ? `<img src="${cover}" alt="Cover" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;">`
                    : `<l-icon name="musical-note"></l-icon>`;
            }
        });
    });

    stopMiniVisualizer();
    if (state.currentIndex === -1) return;

    const currentSong = state.currentQueue[state.currentIndex];
    if (!currentSong) return;

    // Activar el mini-visualizador en la canción actual dentro de las listas visibles
    lists.forEach(listEl => {
        const activeLi = [...listEl.querySelectorAll('.song-item')].find(li =>
            li.querySelector('.marquee-text')?.textContent === currentSong.title
        );
        if (!activeLi) return;

        activeLi.classList.add('is-playing');
        const placeholder = activeLi.querySelector('.album-art-placeholder');
        if (placeholder) {
            placeholder.innerHTML = `<canvas class="mini-viz" width="80" height="80"></canvas>`;
            requestAnimationFrame(() => {
                const miniCanvas = placeholder.querySelector('.mini-viz');
                if (miniCanvas) initMiniVisualizer(miniCanvas);
            });
        }
    });
}

// --- REPRODUCCIÓN ---
export function playSong(i) {
    if (i < 0 || i >= state.currentQueue.length) return;

    if (state.currentIndex !== -1 && state.currentIndex !== i) {
        state.history.push(state.currentIndex);
    }

    state.currentIndex = i;
    const song = state.currentQueue[i];

    if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
    if (song.src) {
        audio.src = song.src;
    } else if (song.file) {
        audio.src = URL.createObjectURL(song.file);
    } else {
        return;
    }
    audio.play().catch(e => console.log("Error:", e));

    trackName.textContent = song.title;
    fullTrackName.textContent = song.title;
    artistName.textContent = song.artist;
    FullArtistName.textContent = song.artist;
    
    if (defaultIcon) defaultIcon.style.display = 'none';
    if (visualizerCanvas) visualizerCanvas.style.display = 'block';
    initVisualizer();

    if (miniArtContainer) {
        if (song.cover) {
            miniArtContainer.innerHTML = `
            <img src="${song.cover}" alt="Cover" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;">`;
        } else {
            miniArtContainer.innerHTML = `<l-icon id="mini-default-icon" name="musical-notes"></l-icon>`;
        }
    }

    updateActiveSongInList();

    requestAnimationFrame(() => {
        applyMarqueeIfNeeded(trackName);
        applyMarqueeIfNeeded(fullTrackName);
    });

    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title:   song.title,
            artist:  song.artist,
            album:   document.getElementById('current-folder-title').textContent,
            artwork: [{ src: song.cover || 'assets/icons/favicon.svg', sizes: '512x512', type: 'image/png' }]
        });

        navigator.mediaSession.setActionHandler('previoustrack', playPrev);
        navigator.mediaSession.setActionHandler('nexttrack', playNext);
        navigator.mediaSession.setActionHandler('play', togglePlay);
        navigator.mediaSession.setActionHandler('pause', togglePlay);
    }
    updatePlayButtons(true);
}

function updateUI(song) {
    // 1. Actualizar textos (Mini reproductor y Full)
    trackName.textContent = song.title;
    fullTrackName.textContent = song.title;
    artistName.textContent = song.artist;
    FullArtistName.textContent = song.artist;
    
    if (defaultIcon) defaultIcon.style.display = 'none';
    if (visualizerCanvas) visualizerCanvas.style.display = 'block';
    
    // Reiniciar visualizador si es necesario
    initVisualizer();

    if (miniArtContainer) {
        if (song.cover) {
            miniArtContainer.innerHTML = `
            <img src="${song.cover}" alt="Cover" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;">`;
        } else {
            miniArtContainer.innerHTML = `<l-icon id="mini-default-icon" name="musical-notes"></l-icon>`;
        }
    }

    // 3. Aplicar efecto de movimiento al texto si es muy largo
    requestAnimationFrame(() => {
        applyMarqueeIfNeeded(trackName);
        applyMarqueeIfNeeded(fullTrackName);
    });

    // 4. Actualizar Metadatos del Sistema (Notificaciones/Pantalla de bloqueo)
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: song.title,
            artist: song.artist,
            album: document.getElementById('current-folder-title')?.textContent || "Mi Música",
            artwork: [{ src: song.cover || 'assets/icons/favicon.svg', sizes: '512x512', type: 'image/png' }]
        });
    }
}

export function playNext() {
    // Si no hay canciones en la cola, no hacemos nada
    if (state.currentQueue.length === 0) return;

    let nextIndex;

    if (state.playMode === 'repeat-one') {
        nextIndex = state.currentIndex;
    } 
    else if (state.playMode === 'shuffle') {
        nextIndex = Math.floor(Math.random() * state.currentQueue.length);

        if (state.currentQueue.length > 1 && nextIndex === state.currentIndex) {
            nextIndex = (nextIndex + 1) % state.currentQueue.length;
        }
    } 
    else {
        nextIndex = (state.currentIndex + 1) % state.currentQueue.length;
    }

    playSong(nextIndex);
}

export function playPrev() {
    if (state.history.length > 0) {
        // Sacamos el último índice del historial
        const lastIndex = state.history.pop();
        const song = state.currentQueue[lastIndex];
        state.currentIndex = lastIndex;
        
        if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
        if (song.src) {
            audio.src = song.src;
        } else if (song.file) {
            audio.src = URL.createObjectURL(song.file);
        } else {
            return;
        }
        audio.play();

        // Actualizar UI
        updateUI(song);
        updateActiveSongInList(); 
    } else {
        // Si no hay historial, se comporta normal
        const prev = (state.currentIndex - 1 + state.currentQueue.length) % state.currentQueue.length;
        playSong(prev);
    }
}

export function togglePlay() {
    if (!audio.src) return;
    audio.paused ? audio.play() : audio.pause();

    if (window.AndroidMedia) AndroidMedia.setPlaying(!audio.paused);

    updatePlayButtons(!audio.paused);

    // Alternar entre icono por defecto y visualizador en el full player
    const defaultIcon = document.getElementById('default-icon');
    const visualizerCanvas = document.getElementById('visualizer');

    if (audio.paused) {
        if (defaultIcon) defaultIcon.style.display = 'block';
        if (visualizerCanvas) visualizerCanvas.style.display = 'none';
        pauseMiniVisualizer();
    } else {
        if (defaultIcon) defaultIcon.style.display = 'none';
        if (visualizerCanvas) visualizerCanvas.style.display = 'block';
        resumeMiniVisualizer();
    }
}

export function mode() {
    state.playMode = getStoredMode();
    syncModeIcon();
    const icon = document.getElementById('mode-icon');
    
    if (state.playMode === 'list') {
        state.playMode = 'shuffle';
        icon.setAttribute('name', 'shuffle');
    } 
    else if (state.playMode === 'shuffle') {
        state.playMode = 'repeat-one';
        icon.setAttribute('name', 'repeat-one'); 
    } 
    else {
        state.playMode = 'list';
        icon.setAttribute('name', 'repeat');
    }
    setMode(state.playMode);
    console.log("Nuevo modo establecido:", state.playMode);
}

export function updatePlayButtons(isPlaying) {
    const pIcon  = document.getElementById('play-icon');
    const fPIcon = document.getElementById('full-play-icon');
    const name   = isPlaying ? 'pause' : 'play';
    if (pIcon)  pIcon.setAttribute('name',  name);
    if (fPIcon) fPIcon.setAttribute('name', name);
}

function formatTime(s) {
    const m  = Math.floor(s / 60);
    const sc = Math.floor(s % 60);
    return `${m}:${sc < 10 ? '0' : ''}${sc}`;
}