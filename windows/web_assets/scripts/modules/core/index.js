// scripts/modules/core/index.js
import {
  initTitlebar,
  initNativeLibrary,
  sincronizarFondoConCSharp,
} from "./windows.core.js";

// scripts/modules/core/index.js
export function initPlatformCore() {
  sincronizarFondoConCSharp();
  initTitlebar();
  initNativeLibrary();

  const inicializarEscritorio = () => {
    if (window.chrome?.webview) {
      if (typeof window.modeDesktopActive === "function") {
        window.modeDesktopActive();
      }
    } else {
      console.log("Corriendo en entorno web estándar (Navegador).");
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializarEscritorio);
  } else {
    inicializarEscritorio();
  }

  // Escuchar mensajes de C# con WebView2
  if (window.chrome?.webview) {
    window.chrome.webview.addEventListener("message", (event) => {
      let msg = event.data;
      
      // Asegurarnos de parsearlo si llega como texto plano JSON
      if (typeof msg === "string") {
        try {
          msg = JSON.parse(msg);
        } catch (e) {
          console.error("Error al parsear mensaje de C#:", e);
        }
      }

      // Verificamos tanto 'type' como 'action' para que sea compatible con todo
      const eventType = msg?.type || msg?.action;

      if (msg && eventType) {
        window.dispatchEvent(
          new CustomEvent(`native:${eventType}`, { detail: msg }),
        );
      }
    });
  }
}