// app/scripts/modules/components/folders.js
import { state } from "../utils/state.js";
import { removeFolder } from "../db/libraryDB.js";
import { showDetailView } from "../ui/views.js";
import { applyMarqueeIfNeeded } from "../utils/helpers.js";
import { showModal } from "./modal.js";

const detectedFoldersDiv = document.getElementById("detected-folders");
const loadingOverlay = document.getElementById("loading-overlay");

export function renderFolders() {
  detectedFoldersDiv.innerHTML = "";
  const folderPaths = Object.keys(state.library);
  const titles = [];

  if (folderPaths.length === 0) {
    detectedFoldersDiv.innerHTML = `
      <p style="grid-column: 1/-1; text-align: center; opacity: 0.5; padding: 20px;">
        No hay carpetas.
      </p>
  `;
    loadingOverlay.style.display = "none";
    return;
  }

  folderPaths.forEach((path) => {
    const displayName = state.folderNames[path] || path;
    const card = document.createElement("div");
    card.className = "folder-card-grid marquee-container";
    card.title = path;
    card.innerHTML = `
      <button class="delete-folder-btn" title="Quitar carpeta">
        <l-icon name="trash-outline"></l-icon>
      </button>
      <div style="font-size:2rem;"><l-icon name="folder-open"></l-icon></div>
      <div class="f-name-wrapper">
        <div class="f-name marquee-text"></div>
      </div>
      <div class="f-count">${state.library[path].length} canciones</div>
    `;

    card.querySelector(".f-name").textContent = displayName;
    card.querySelector(".delete-folder-btn").addEventListener("click", (event) => {
      deleteFolder(path, event);
    });
    card.onclick = () => showDetailView(path);

    detectedFoldersDiv.appendChild(card);
    titles.push(card.querySelector(".marquee-text"));
  });

  requestAnimationFrame(() => {
    setTimeout(() => {
      loadingOverlay.style.display = "none";
    }, 300);
    titles.forEach((el) => applyMarqueeIfNeeded(el));
  });
}

export function deleteFolder(path, event) {
  event.stopPropagation();
  const displayName = state.folderNames[path] || path;

  showModal({
    title: "Quitar carpeta",
    message: `¿Estás seguro de que quieres quitar "${displayName}" de tu biblioteca? Tus archivos de música no se eliminarán.`,
    buttons: [
      {
        text: "Confirmar",
        action: () => removeFolder(path),
      },
      {
        text: "Cancelar",
        action: null,
      },
    ],
  });
}

// Exponer globalmente para uso en onclick HTML
window.deleteFolder = deleteFolder;
