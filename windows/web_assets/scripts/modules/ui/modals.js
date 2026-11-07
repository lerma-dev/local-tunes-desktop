import { state } from '../utils/state.js';
import { renderPlaylist } from '../components/playlists.js';

export function openModal(event, songTitle) {
    event.stopPropagation();
    const modal = document.getElementById('playlist-modal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    state.selectedSong = state.currentQueue.find(s => s.title === songTitle);
    renderPlaylist();
}

export function closeModal() {
    const modal = document.getElementById('playlist-modal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

export function openModalView() {
    const modal = document.getElementById('playlist-modal-view');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

export function closeModalView() {
    const modal = document.getElementById('playlist-modal-view');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Exponer globalmente
window.openModal = openModal;
window.closeModal = closeModal;
window.openModalView = openModalView;
window.closeModalView = closeModalView;
