# 🎵 Local Tunes Desktop

Aplicación de escritorio para Windows de **Local Tunes**, un reproductor de música personal, rápido y privado. Toda tu colección musical vive en tu equipo: nada se sube a la nube.

Esta app es un contenedor nativo (Windows Forms + WebView2) que muestra la interfaz web de [Local Tunes](https://github.com/lerma-dev/local-tunes) y le añade integración con el sistema: barra de título personalizada, bandeja del sistema, menú de ventana y controles de reproducción.

---

## ✨ Características

- **Acceso inmediato** a tu biblioteca musical.
- **Privacidad total**: tu música nunca sale de tu computadora.
- **Interfaz moderna** con visualización en tiempo real que reacciona al ritmo.
- **Favoritos y playlists**, con respaldo para importarlos si se pierden.
- **Barra de título personalizada** (sin bordes) con redimensionado por los bordes y esquinas, o barra nativa de Windows a elección.
- **Icono en la bandeja del sistema** con menú: Abrir, Play/Pausa, Siguiente, Anterior y Salir. Doble clic para mostrar u ocultar la ventana.
- **Menú de sistema propio**: Restaurar, Mover, Tamaño, Minimizar, Maximizar y Cerrar.
- **Actualización automática de la interfaz web**: al iniciar compara la versión local con la remota y descarga la nueva si es necesario. Si no hay conexión, usa la copia local.
- Los enlaces externos se abren en el navegador predeterminado.

---

## 🧰 Tecnologías

| Componente | Detalle |
|---|---|
| Lenguaje / Framework | C# · .NET 9 (`net9.0-windows10.0.19041.0`) |
| UI nativa | Windows Forms |
| Motor web embebido | [Microsoft WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) `1.0.4022.49` |
| Instalador | [Inno Setup](https://jrsoftware.org/isinfo.php) |
| CI/CD | GitHub Actions |

---

## 📋 Requisitos

- Windows 10 (versión 2004, build 19041) o superior.
- [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) (viene incluido en Windows 11 y en las versiones recientes de Windows 10).
- Para desarrollar: [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0) y Visual Studio 2022 (o Rider / VS Code con la extensión de C#).

---

## 📥 Instalación (usuarios)

1. Ve a la sección [Releases](https://github.com/lerma-dev/local-tunes-desktop/releases) del repositorio.
2. Descarga el instalador `local-tunes-vX.Y.Z-Universal.exe` (incluye versiones x64 y x86).
3. Ejecútalo y sigue el asistente. Se instala por usuario, sin necesidad de permisos de administrador.

---

## 🛠️ Desarrollo

### Modo Release (por defecto)

En Release la app descarga automáticamente los archivos web desde la rama `beta` del repositorio [`lerma-dev/local-tunes`](https://github.com/lerma-dev/local-tunes) y los guarda en la carpeta `web_assets`. Después los sirve mediante un host virtual (`https://tech.lerma.localtunes/index.html`).

### Modo Debug ⚠️

> **Importante:** para ejecutar el proyecto en modo **Debug** es necesario **clonar primero el repositorio [lerma-dev/local-tunes](https://github.com/lerma-dev/local-tunes)** y levantar el servidor local. En Debug la aplicación no descarga los archivos web: apunta directamente a `http://127.0.0.1:3300`, así que si el servidor no está corriendo verás la ventana en blanco o un error de conexión.

Pasos:

1. **Clona y levanta el servidor local de la interfaz web:**

   ```bash
   git clone https://github.com/lerma-dev/local-tunes.git
   cd local-tunes
   ```

   Sigue las instrucciones del README de ese repositorio para instalar dependencias e iniciar el servidor. Debe quedar escuchando en el puerto **3300** (`http://127.0.0.1:3300`).

2. **Clona este repositorio:**

   ```bash
   git clone https://github.com/lerma-dev/local-tunes-desktop.git
   cd local-tunes-desktop
   ```

3. **Ejecuta en Debug** (con el servidor del paso 1 ya en marcha):

   ```bash
   dotnet run -c Debug --project localtunes.csproj
   ```

   O abre `localtunes.sln` en Visual Studio, selecciona la configuración **Debug** y presiona `F5`.

En Debug los menús contextuales, las DevTools y los atajos del navegador permanecen habilitados para facilitar la depuración.

### Compilar en Release

```bash
dotnet restore localtunes.csproj
dotnet publish localtunes.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:PublishReadyToRun=true -p:PublishTrimmed=false -o build/v1.0.0/win-x64
```

Cambia `win-x64` por `win-x86` para la versión de 32 bits.

---

## 🚀 Generar un release (solo el mantenedor)

> Los tags y releases los crea **únicamente el propietario del repositorio**, después de revisar y mergear los Pull Requests. Los colaboradores no deben crear tags.

El flujo de GitHub Actions (`.github/workflows/release.yml`) se dispara al subir un tag que empiece con `v`:

1. Actualiza `<Version>` en `localtunes.csproj`.
2. Crea y sube el tag:

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. El workflow publica la app para x64 y x86, compila el instalador con Inno Setup (`setup.iss`) y lo sube a GitHub Releases.

---

## 🤝 Contribuir

Las contribuciones se reciben **solo mediante Pull Request**:

1. Haz un fork del repositorio (o crea una rama si tienes acceso).
2. Prepara tu entorno de desarrollo siguiendo la sección **Modo Debug** de arriba (recuerda que necesitas clonar y levantar [local-tunes](https://github.com/lerma-dev/local-tunes)).
3. Crea una rama para tu cambio, por ejemplo `fix/tray-menu` o `feat/nueva-opcion`.
4. Haz commit de tus cambios y abre un Pull Request hacia `main`, describiendo qué cambia y por qué.
5. Espera la revisión del mantenedor. Puede aceptar el PR, pedir ajustes o rechazarlo.

Reglas importantes:

- **No se hace push directo a `main`.** Todo pasa por revisión.
- **No crees tags ni releases.** Solo el mantenedor los publica una vez que el PR está mergeado.
- Al enviar un PR aceptas los términos de contribución descritos en [LICENSE.md](LICENSE.md).

Para reportar un fallo o sugerir una idea sin código, abre un Issue o escribe en el portal: **lermatech.onrender.com**.

---

## 📁 Estructura del proyecto

```
local-tunes-desktop/
├── .github/workflows/
│   └── release.yml            # Build y publicación automática del instalador
├── icons/                     # Iconos de la app, bandeja y menús
├── metadata/                  # Textos y recursos del instalador (licencia, descripción, post-instalación)
├── models/
│   └── WebMessage.cs          # Modelo de los mensajes enviados desde la web
├── services/
│   ├── SystemMenuManager.cs   # Menú de sistema personalizado
│   ├── TrayManager.cs         # Icono y menú de la bandeja
│   ├── WebAssetsManager.cs    # Descarga y actualización de los archivos web
│   └── WebCommandHandler.cs   # Procesa los comandos que envía la interfaz web
├── utils/
│   └── NativeMethods.cs       # Llamadas a la API de Windows (user32 / shell32)
├── Form1.cs                   # Ventana principal y WebView2
├── Program.cs                 # Punto de entrada
├── localtunes.csproj          # Proyecto .NET
├── localtunes.sln
└── setup.iss                  # Script del instalador (Inno Setup)
```

---

## 🔌 Comunicación web ↔ escritorio

La interfaz web envía mensajes JSON a la app nativa mediante `WebMessage`. Acciones soportadas:

| Acción | Descripción |
|---|---|
| `close` | Oculta la ventana (sigue activa en la bandeja) |
| `minimize` | Minimiza la ventana |
| `maximize` | Alterna entre maximizada y normal |
| `custom_bar` / `native_bar` | Cambia entre barra de título personalizada y nativa |
| `sync_background_color` | Sincroniza el color de fondo de la ventana con el de la web |
| `show_system_menu` | Muestra el menú de sistema en las coordenadas indicadas (`ScreenX`, `ScreenY`) |

También se manejan los mensajes `start_drag` (arrastrar la ventana) y `close_menu` (cerrar el menú abierto).

En sentido contrario, el menú de la bandeja invoca estas funciones globales de la web: `window.togglePlay()`, `window.playNext()` y `window.playPrev()`.

---

## 📄 Licencia

Copyright © 2026 Héctor Lerma. **Todos los derechos reservados.**

El código puede visualizarse y hacerse *fork* únicamente con fines de estudio personal, aprendizaje y para proponer contribuciones mediante Pull Request. Está prohibida su distribución, su uso comercial, su redistribución modificada y la publicación de releases o instaladores. Consulta los detalles completos en [LICENSE.md](LICENSE.md).

Para sugerencias o reporte de fallos, abre un Issue en el repositorio o usa la sección de mensajes anónimos del portal oficial: **lermatech.onrender.com**.

---

## 🌐 Enlaces

- Interfaz web: [lerma-dev/local-tunes](https://github.com/lerma-dev/local-tunes)
- Portal oficial: [lerma-dev.vercel.app](https://lerma-dev.vercel.app)

© 2026 lerma-dev (Héctor Lerma)