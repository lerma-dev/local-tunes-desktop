// scripts/modules/core/windows.core.js
import { renderTitleBar } from "./titlebar.js";
let titlebar = null;
let isMaximized = false;
let isDragging = false;
let isMouseDown = false;
let isMenuOpen = false;
let dragSent = false;
let startX, startY;


// Inicializamos la barra de título al cargar el módulo
titlebar = renderTitleBar(isMaximized);

// Función para enviar comandos a C# a través de WebView2
function sendCommand(accion) {
  if (window.chrome?.webview?.postMessage) {
    const payload = JSON.stringify({ action: accion });
    window.chrome.webview.postMessage(payload);
    console.log("Comando Enviado:", payload);
  } else {
    console.warn("WebView2 no disponible para enviar:", accion);
  }
}

// Función para alternar el estado de maximizado y actualizar la barra de título
function toggleMaximize() {
  isMaximized = !isMaximized;
  titlebar = renderTitleBar(isMaximized);
  sendCommand("maximize");
}

// Función para inicializar la biblioteca nativa y exponer funciones a C#
export function initNativeLibrary() {
  window.nativeAddFolder = () => sendCommand("pick_folder");
}

// Función para sincronizar el color de fondo con C#
export function sincronizarFondoConCSharp() {
  const estiloComputado = getComputedStyle(document.documentElement);
  const colorBgHex = estiloComputado
    .getPropertyValue("--bg-titlebar-custom")
    .trim();

  if (window.chrome?.webview?.postMessage) {
    window.chrome.webview.postMessage(
      JSON.stringify({
        action: "sync_background_color",
        color: colorBgHex,
      }),
    );
  }
}

// Función para inicializar la barra de título y manejar eventos de arrastre y menú contextual
export function initTitlebar() {
  window.sendCommand = sendCommand;
  window.toggleMaximize = toggleMaximize;
  titlebar = renderTitleBar(isMaximized);

  document.addEventListener("mouseup", () => {
    isMouseDown = false;
    isDragging = false;
    dragSent = false; // Reset total al soltar el botón
  });

  document.addEventListener("click", (e) => {
    // Si estamos arrastrando, no cerramos
    if (isDragging) return;

    // Solo enviamos si el menú está abierto
    if (isMenuOpen && window.chrome?.webview?.postMessage) {
      sendCommand("close_menu");
      isMenuOpen = false; // Reseteamos el estado
    }
  });

  if (titlebar) {
    titlebar.classList.remove("custom", "macos", "linux", "native");
    titlebar.addEventListener("mousedown", (e) => {
      if (e.target.closest(".ctrl-btn") || e.target.closest(".logo-titlebar"))
        return;
      if (e.button !== 0) return;

      isMouseDown = true; // Empezó la presión
      isDragging = false;
      startX = e.clientX;
      startY = e.clientY;
    });

    titlebar.addEventListener("mousemove", (e) => {
      // Si movemos el mouse más de 5px, entonces es un arrastre real
      if (isMouseDown && !dragSent) {
        if (
          Math.abs(e.clientX - startX) > 5 ||
          Math.abs(e.clientY - startY) > 5
        ) {
          isDragging = true;
          dragSent = true; // Bloquea cualquier otro envío hasta el próximo mousedown
          sendCommand("start_drag");
        }
      }
    });

    titlebar.addEventListener("mouseup", () => {
      isMouseDown = false;
      isDragging = false;
    });

    titlebar.addEventListener("contextmenu", (e) => {
      if (e.target.closest(".ctrl-btn") || e.target.closest(".logo-titlebar")) {
        return;
      }
      e.preventDefault();

      if (window.chrome?.webview?.postMessage) {
        isMenuOpen = true; // Marcamos que el menú se abrió
        const payload = JSON.stringify({
          action: "show_system_menu",
          screenX: e.screenX,
          screenY: e.screenY,
        });
        window.chrome.webview.postMessage(payload);
      }
    });
  }

  // Detectamos si estamos dentro del WebView2 de Microsoft
  if (window.chrome?.webview) {
    document.documentElement.classList.add("native-app");

    window.modeDesktopActive = () => {
      const settingsPanel = document.getElementById("setting-titlebar-style");
      if (settingsPanel) settingsPanel.style.display = "flex";

      const diseñoGuardado = localStorage.getItem("titlebar") || "custom";

      aplicarDiseñoCompleto(diseñoGuardado);
    };
  }
}

// Función para aplicar el diseño completo de la barra de título según el estilo seleccionado
export function aplicarDiseñoCompleto(estilo) {
  if (!titlebar) {
    titlebar = document.getElementById("desktop-titlebar");
    if (!titlebar) return;
  }
  localStorage.setItem("titlebar", estilo);
  
  // El formulario siempre es sin bordes (None), por lo que la barra web siempre se muestra
  document.documentElement.classList.add("native-app");
  titlebar.style.display = "flex";

  // Limpiamos clases anteriores y aplicamos la seleccionada (custom, macos, linux, native)
  titlebar.classList.remove("custom", "macos", "linux", "native");
  titlebar.classList.add(estilo);

  // Tanto si es custom como native (o cualquier otro), la barra se dibuja en HTML
  sendCommand("custom_bar");
}