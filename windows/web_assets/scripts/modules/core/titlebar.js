// scripts/modules/core/titlebar.js
export function renderTitleBar(isMaximized = false) {
  const titlebar = document.getElementById("desktop-titlebar");
  if (!titlebar) return null;

  const actionText = isMaximized ? "restore" : "maximize";
  const actionIcon = isMaximized ? "restore-native" : "maximize-native";

  titlebar.innerHTML = `
  <div class="title-container">
    <img src="./assets/icons/favicon.svg" class="logo-titlebar" alt="Logo" /> 
    <div class="title">Local Tunes</div>
  </div>
  <div class="window-controls">
    <button onclick="window.abrirAjustes()" class="ctrl-btn btn-settings" title="Ajustes (Alt + S)">
      <l-icon name="settings-outline"></l-icon>
    </button>
    <div class="line"></div>
    <button onclick="window.sendCommand('minimize')" class="ctrl-btn btn-minimize" title="Minimize">
      <l-icon name="minimize-native"></l-icon>
    </button>
    <button onclick="window.toggleMaximize()" class="ctrl-btn btn-maximize" title="${actionText}">
      <l-icon name="${actionIcon}"></l-icon>
    </button>
    <button onclick="window.sendCommand('close')" class="ctrl-btn btn-close" title="Close">
      <l-icon name="close-native"></l-icon>
    </button>
  </div>
  `;

  return titlebar;
}