// scripts/modules/ui/sidebar.js
export function initSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  if (!sidebar) return;

  const sidebarSetting = document.getElementById('setting-btn-sidebar');
  const originalSetting = document.getElementById('settings-btn');

  if (sidebarSetting && originalSetting) {
    sidebarSetting.addEventListener('click', () => {
      originalSetting.click(); 
    });
  }

  updateSidebarNav('main');
}

export function updateSidebarNav(view) {
  const btns = {
    'main': 'nav-main',
    'favs': 'nav-favs',
    'playlists': 'nav-playlists',
    'allSongs': 'nav-allSongs'
  };

  Object.values(btns).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('nav-active');
  });

  // Añadir clase activa al botón de la vista actual
  const activeId = btns[view];
  if (activeId) {
    const el = document.getElementById(activeId);
    if (el) el.classList.add('nav-active');
  }
}