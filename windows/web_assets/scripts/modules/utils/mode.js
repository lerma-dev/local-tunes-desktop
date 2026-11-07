const MODE_KEY = "music-app-mode";
const DEFAULT_MODE = 'list';

export function syncModeIcon() {
  const savedMode = localStorage.getItem("music-app-mode") || 'list';
  const icon = document.getElementById('mode-icon');
  
  if (!icon) return;

  const iconMap = {
    'shuffle': 'shuffle',
    'repeat-one': 'repeat-one',
    'list': 'repeat'
  };

  icon.setAttribute('name', iconMap[savedMode] || 'repeat');
}

export function applyStoredMode() {
  const saved = localStorage.getItem(MODE_KEY) || DEFAULT_MODE;
  return saved;
}

export function setMode(mode) {
  localStorage.setItem(MODE_KEY, mode);
}

export function getStoredMode() {
  return localStorage.getItem(MODE_KEY) || DEFAULT_MODE;
}