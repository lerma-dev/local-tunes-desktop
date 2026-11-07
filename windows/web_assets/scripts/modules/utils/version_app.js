export const initVersionApp = () => {
  const appVersion = localStorage.getItem("AppVersion");
  const tag_version = document.getElementById("version_app");

  // Función interna para actualizar el texto
  const updateDisplay = (version) => {
    if (tag_version) {
      tag_version.textContent = `Local Tunes v${version} Desktop`;
    }
  };
  updateDisplay(appVersion);
};