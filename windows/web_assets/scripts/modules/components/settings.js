// scripts/modules/components/settings.js
import { state } from "../utils/state.js";
import { setTheme, getStoredTheme } from "../utils/theme.js";
import { setMode, getStoredMode, syncModeIcon } from "../utils/mode.js";
import {
  aplicarDiseñoCompleto,
  sincronizarFondoConCSharp,
} from "../core/windows.core.js";
import {
  exportBackup,
  importBackup,
  checkBackupReminder,
  checkVersionChange,
} from "../utils/backup.js";
import { initVersionApp } from "../utils/version_app.js";
import { agregarToast } from "./toast.js";
import { showModal } from "./modal.js";
import { requestTrash, restoreTrash, emptyTrash } from "../db/libraryDB.js";
let settingsInitialized = false;
let trashModalOpen = false;
let lockedScrollTop = 0;
let hideSectionTimeout = null;
// Debe coincidir con la transición más larga del panel (.settings-panel: 0.38s)
const CLOSE_ANIM_MS = 400;

function lockBodyScroll() {
  const appEl = document.getElementById("app");
  if (!appEl) return;
  lockedScrollTop = appEl.scrollTop;
  appEl.classList.add('no-scroll');
}

function unlockBodyScroll() {
  const appEl = document.getElementById("app");
  if (!appEl) return;
  appEl.classList.remove('no-scroll');
  appEl.scrollTop = lockedScrollTop;
}

function showSettingsSection() {
  const section = document.getElementById("settings_section");
  if (!section) return;
  if (hideSectionTimeout) {
    clearTimeout(hideSectionTimeout);
    hideSectionTimeout = null;
  }
  section.style.display = "block";
}

function hideSettingsSectionAfterAnim() {
  const section = document.getElementById("settings_section");
  if (!section) return;
  if (hideSectionTimeout) clearTimeout(hideSectionTimeout);
  hideSectionTimeout = setTimeout(() => {
    section.style.display = "none";
    hideSectionTimeout = null;
  }, CLOSE_ANIM_MS);
}

function openSettings() {
  showSettingsSection();
  document.getElementById("settings-panel").classList.add("is-open");
  document.getElementById("settings-overlay").classList.add("is-open");
  // Bloquea el scroll del fondo
  lockBodyScroll();
}
export function openSettingsHandler() {
  showSettingsSection();
  document.getElementById("settings-panel").classList.add("is-open");
  document.getElementById("settings-overlay").classList.add("is-open");
  lockBodyScroll();
  checkBackupReminder();
  checkVersionChange();
}

export function initSettings() {
  const titlebarRow = document.getElementById("setting-titlebar-style");
  const titlebarDropdown = document.getElementById("titlebar-style-dropdown");
  const panel = document.getElementById("settings-panel");
  const overlay = document.getElementById("settings-overlay");
  const closeBtn = document.getElementById("settings-close-btn");
  const libraryBtn = document.getElementById("btn_settings_library");
  const aboutMeBtn = document.getElementById("btn_settings_aboutMe");

  window.abrirAjustes = openSettingsHandler;

  initVersionApp();

  if (settingsInitialized) return;
  settingsInitialized = true;

  const sidebarBtn = document.getElementById("setting-btn-sidebar");
  if (sidebarBtn) {
    sidebarBtn.removeEventListener("click", openSettingsHandler);
    sidebarBtn.addEventListener("click", (e) => {
      e.stopImmediatePropagation();
      openSettingsHandler();
    });
  }

  // Formatos admitidos
  libraryBtn.addEventListener("click", () => {
    showModal({
      title: "Formatos admitidos",
      message: `
        <p style="font-size:0.9em; text-align:left; opacity:0.85;">
          Local Tunes lee las etiquetas y reproduce estos archivos:
        </p>
        <ul style="text-align:left; font-size:0.85em; margin:10px 0 0 18px; line-height:1.7;">
          <li><strong>MP3</strong> — .mp3</li>
          <li><strong>FLAC</strong> — .flac</li>
          <li><strong>OGG / Opus</strong> — .ogg, .oga, .opus</li>
          <li><strong>WAV</strong> — .wav</li>
          <li><strong>AAC / M4A / ALAC</strong> — .aac, .m4a, .m4b, .alac</li>
          <li><strong>WMA</strong> — .wma</li>
          <li><strong>AIFF</strong> — .aiff, .aif</li>
          <li><strong>APE / WavPack</strong> — .ape, .wv</li>
        </ul>`,
      buttons: [{ text: "Entendido", action: null }],
    });
  });

  // -- Boton de acerca de 
  aboutMeBtn.addEventListener("click", () => {
    const version = localStorage.getItem("AppVersion") || "0.0.0";
    showModal({
      title: `
      <div text-align: center; display: flex; align-item: center; justify-content: center; gap:4px;>
        <img src='./assets/icons/favicon.svg' alt="icono" style='width: 30px; height: 30px;'>
        Acerca de Local Tunes
      </div>
      `,
      message: `
          <p style="margin-top: 10px; font-size: 0.9em; opacity: 0.8;">
            © 2026 Hector Lerma. Todos los derechos reservados.
          </p>
          <p style="margin-top: 15px; font-size: 0.85em;">
            Software de propiedad intelectual de Hector Lerma. 
            Uso permitido únicamente para fines de estudio personal y aprendizaje.
          </p>
      `,
      buttons: [
        {
          text: "Cerrar",
          action: null
        }
      ]
    });
  });

  // --- Papelera de la app ---
  const trashRow = document.getElementById("setting-trash");
  if (trashRow) {
    trashRow.addEventListener("click", () => requestTrash());
  }

  window.addEventListener("native:trash_list", (event) => {
    renderTrashModal(event.detail ?? {});
  });

  window.addEventListener("native:trash_restored", (event) => {
    const restored = event.detail?.path || "";
    const folder = restored.replace(/[\\/][^\\/]+$/, "");
    agregarToast({
      tipo: "Exito",
      titulo: "Canción restaurada",
      descripcion: folder
        ? `Devoluelta a ${folder}.`
        : "Devoluelta a su carpeta original.",
      autoClose: true,
    });
    // Refresca el listado mientras el modal siga abierto.
    if (trashModalOpen) requestTrash();
  });

  window.addEventListener("native:trash_emptied", (event) => {
    const count = Number(event.detail?.count ?? 0);
    document.getElementById("content-modal").innerHTML = "";
    trashModalOpen = false;
    agregarToast({
      tipo: "Exito",
      titulo: "Papelera vaciada",
      descripcion: `${count} archivo${count === 1 ? "" : "s"} enviado${
        count === 1 ? "" : "s"
      } a la papelera de Windows.`,
      autoClose: true,
    });
  });

  window.addEventListener("native:trash_error", (event) => {
    agregarToast({
      tipo: "Error",
      titulo: "Papelera",
      descripcion: event.detail?.message ?? "No se pudo completar la acción.",
      autoClose: false,
    });
  });

  // --- Botón de móvil ---
  const mobileBtn = document.getElementById("settings-btn");
  if (mobileBtn) {
    mobileBtn.removeEventListener("click", openSettingsHandler);
    mobileBtn.addEventListener("click", (e) => {
      e.stopImmediatePropagation();
      openSettingsHandler();
    });
  }

  // --- Cierre y Teclas ---
  function closeSettings() {
    panel.classList.remove("is-open");
    overlay.classList.remove("is-open");
    unlockBodyScroll();
    hideSettingsSectionAfterAnim();
  }
  window.closeSettingsPanel = closeSettings;

  closeBtn.addEventListener("click", closeSettings);
  overlay.addEventListener("click", closeSettings);

  document.addEventListener("keydown", (e) => {
    if (e.altKey && e.key.toLowerCase() === "s") {
      e.preventDefault();
      openSettings();  
    }
    if (e.key === "Escape") {
      closeSettings();
    }
  });

  // --- Toggle: Tema (usa theme.js para leer/guardar) ---
  const toggleTheme = document.getElementById("toggle-theme");
  const themeIcon = document.getElementById("theme-icon");

  const isDarkOnLoad = getStoredTheme() !== "light";
  toggleTheme.checked = isDarkOnLoad;
  themeIcon.setAttribute("name", isDarkOnLoad ? "mode-dark" : "mode-ligth");

  toggleTheme.addEventListener("change", () => {
    const isDark = toggleTheme.checked;
    setTheme(isDark ? "dark" : "light");
    themeIcon.setAttribute("name", isDark ? "mode-dark" : "mode-ligth");
    sincronizarFondoConCSharp();
  });


  state.playMode = getStoredMode();
  syncModeIcon();


  // --- Respaldo: Dropdown custom ---
  const backupRow = document.getElementById("backup-row");
  const backupDropdown = document.getElementById("backup-dropdown");
  const importFileInput = document.getElementById("import-file-input");

  function openBackupDropdown() {
    backupRow.classList.add("is-open");
    backupDropdown.classList.add("is-open");
    backupDropdown.setAttribute("aria-hidden", "false");
  }

  function closeBackupDropdown() {
    backupRow.classList.remove("is-open");
    backupDropdown.classList.remove("is-open");
    backupDropdown.setAttribute("aria-hidden", "true");
  }

  backupRow.addEventListener("click", (e) => {
    if (e.target.closest(".backup-option")) return;
    backupDropdown.classList.contains("is-open")
      ? closeBackupDropdown()
      : openBackupDropdown();
  });

  backupDropdown.querySelectorAll(".backup-option").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const action = btn.dataset.action;
      closeBackupDropdown();
      if (action === "export") {
        await exportBackup();
      } else if (action === "import") {
        importFileInput.click();
      }
    });
  });

  importFileInput.addEventListener("change", async () => {
    const file = importFileInput.files[0];
    if (!file) return;
    await importBackup(file);
    importFileInput.value = "";
  });

  document.addEventListener("click", (e) => {
    if (!backupRow.contains(e.target)) closeBackupDropdown();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeBackupDropdown();
  });

  // --- Toggle: Aleatorio ---
  const toggleShuffle = document.getElementById("toggle-shuffle");
  toggleShuffle.checked = state.playMode === "shuffle";

  toggleShuffle.addEventListener("change", () => {
    const icon = document.getElementById("mode-icon");
    if (toggleShuffle.checked) {
      state.playMode = "shuffle";
      if (toggleRepeat.checked) toggleRepeat.checked = false;
      if (icon) icon.setAttribute("name", "shuffle");
    } else {
      state.playMode = "list";
      if (icon) icon.setAttribute("name", "repeat");
    }
    setMode(state.playMode);
    syncModeIcon();
  });

  // --- Toggle: Repetir ---
  const toggleRepeat = document.getElementById("toggle-repeat");
  toggleRepeat.checked = state.playMode === "repeat-one";

  toggleRepeat.addEventListener("change", () => {
    const icon = document.getElementById("mode-icon");
    if (toggleRepeat.checked) {
      state.playMode = "repeat-one";
      if (toggleShuffle.checked) toggleShuffle.checked = false;
      if (icon) icon.setAttribute("name", "repeat-one");
    } else {
      state.playMode = "list";
      if (icon) icon.setAttribute("name", "repeat");
    }
    setMode(state.playMode);
    syncModeIcon();
  });

  // --- Botón Ecualizador en Ajustes ---
  const eqRow = [...document.querySelectorAll(".settings-row")].find(
    (row) =>
      row.querySelector(".settings-row__label")?.textContent.trim() ===
      "Ecualizador",
  );
  if (eqRow) {
    eqRow.addEventListener("click", () => {
      closeSettings();
      setTimeout(() => {
        import("./equalizer-ui.js").then(({ toggleEQPanel }) =>
          toggleEQPanel(),
        );
      }, 350);
    });
  }

  // --- SELECCIÓN DE ESTILO DE BARRA DE TÍTULO ---
  if (titlebarRow && titlebarDropdown) {
    const isNative = window.chrome?.webview !== undefined;
    
    if (!isNative) {
      titlebarRow.style.display = "none";
    }

    function openTitlebarDropdown() {
      titlebarRow.classList.add("is-open");
      titlebarDropdown.classList.add("is-open");
      titlebarDropdown.setAttribute("aria-hidden", "false");
    }

    function closeTitlebarDropdown() {
      titlebarRow.classList.remove("is-open");
      titlebarDropdown.classList.remove("is-open");
      titlebarDropdown.setAttribute("aria-hidden", "true");
    }

    titlebarRow.addEventListener("click", (e) => {
      if (e.target.closest(".titlebar-style-option")) return;
      titlebarDropdown.classList.contains("is-open")
        ? closeTitlebarDropdown()
        : openTitlebarDropdown();
    });

    // CONTROL DEL CLICK EN LAS OPCIONES
    titlebarDropdown
      .querySelectorAll(".titlebar-style-option")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          const estiloSeleccionado = btn.dataset.style;
          closeTitlebarDropdown();

          // Guardar preferencia
          localStorage.setItem("titlebar", estiloSeleccionado);

          // Ejecutar el cambio visual e informar a C# de inmediato
          aplicarDiseñoCompleto(estiloSeleccionado);
        });
      });

    document.addEventListener("click", (e) => {
      if (!titlebarRow.contains(e.target)) closeTitlebarDropdown();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeTitlebarDropdown();
    });
  }
}

// --------------------------------------------------------------- Papelera ---

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        ch
      ]),
  );
}

/**
 * Modal de la Papelera: muestra la ubicación %LocalAppData%\Local Tunes\Papelera
 * y el listado de canciones eliminadas, con opción de restaurarlas una a una
 * o enviarlas todas a la papelera del sistema de Windows.
 */
function renderTrashModal(detail) {
  const container = document.getElementById("content-modal");
  const items = Array.isArray(detail.items) ? detail.items : [];
  const path = detail.path || "";
  const maxDays = detail.maxDays ?? 30;

  trashModalOpen = true;

  const rows = items
    .map(
      (item) => `
      <div class="trash-item">
        <div class="trash-item__info">
          <div class="trash-item__name">${escapeHtml(item.name)}</div>
          <div class="trash-item__path" title="${escapeHtml(
            item.originalPath || "",
          )}">${escapeHtml(item.originalPath || "Ubicación desconocida")}</div>
          <div class="trash-item__days">Se elimina en ${
            item.daysLeft ?? maxDays
          } día${(item.daysLeft ?? maxDays) === 1 ? "" : "s"}</div>
        </div>
        <button type="button" class="trash-item__restore" data-trash-file="${escapeHtml(
          item.id,
        )}">Restaurar</button>
      </div>`,
    )
    .join("");

  const listHTML = items.length
    ? `<div class="trash-list">${rows}</div>`
    : `<p style="opacity:0.7; font-size:0.85em; text-align:center;">La Papelera está vacía.</p>`;

  const buttons = [
    { text: "Cerrar", action: () => { trashModalOpen = false; } },
  ];

  if (items.length) {
    buttons.unshift({
      text: "Eliminar permanentemente",
      className: "confirm-btn--danger",
      action: () => {
        trashModalOpen = false;
        emptyTrash();
      },
    });
  }

  showModal({
    title: "Papelera",
    message: `
      <p style="font-size:0.8em; text-align:left; opacity:0.85;">
        Las canciones eliminadas se guardan aquí y se borran
        <strong>permanentemente a los ${maxDays} días</strong>.
      </p>
      <div class="trash-path">
        <span>Ubicación</span>
        <code>${escapeHtml(path)}</code>
      </div>
      ${listHTML}
    `,
    buttons,
  });

  // Cada fila devuelve su canción a la carpeta de origen.
  container.querySelectorAll("[data-trash-file]").forEach((btn) => {
    btn.addEventListener("click", () => restoreTrash(btn.dataset.trashFile));
  });
}
