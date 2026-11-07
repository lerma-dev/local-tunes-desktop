const THEME_KEY = 'music-app-theme';
const DEFAULT_THEME = 'dark';

export function applyStoredTheme() {
  const saved = localStorage.getItem(THEME_KEY) || DEFAULT_THEME;
  document.documentElement.setAttribute('data-theme', saved);
  return saved;
}

export function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
}

export function getStoredTheme() {
  return localStorage.getItem(THEME_KEY) || DEFAULT_THEME;
}