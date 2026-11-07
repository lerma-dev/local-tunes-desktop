# 🎵 Local Tunes Desktop

Aplicación de escritorio de Local Tunes, un reproductor de música personal, rápido y privado. Toda tu colección musical vive en tu equipo: nada se sube a la nube.

Este repositorio es el contenedor nativo multiplataforma de Local Tunes. La interfaz web se desarrolla en el proyecto base (https://github.com/lerma-dev/local-tunes); cada cliente de escritorio incluye su propia copia empaquetada de esa interfaz (por ejemplo, `windows/web_assets`) y le añade capacidades nativas del sistema operativo: reproducción en segundo plano, controles del sistema y barra de título personalizable.

====================================================================
## 📥 Descargas
====================================================================

- Windows: https://github.com/lerma-dev/local-tunes-desktop/releases/latest/download/LocalTunes-setup.exe
  - Windows puede mostrar una advertencia de SmartScreen porque el instalador aún no está firmado. Pulsa "Más información" y luego "Ejecutar de todas formas".
  - Para actualizar, descarga e instala la versión nueva encima: se conserva tu biblioteca.
- Linux: próximamente (AppImage).

====================================================================
## 🏗️ Arquitectura del Monorepo
====================================================================

Para garantizar un desarrollo limpio e independiente según el sistema operativo, este proyecto está organizado en módulos específicos:

```
local-tunes-desktop/
├── .github/workflows/   # Flujos de CI/CD para compilación y lanzamientos automáticos
├── linux/               # Cliente nativo para Linux (Python + pywebview) [En desarrollo]
├── windows/             # Cliente nativo para Windows (C# .NET 9 + Windows Forms + WebView2)
│   └── web_assets/      # Interfaz web empaquetada dentro de la aplicación
├── LICENSE.md           # Licencia y términos de contribución
├── README.md            # Documentación general del monorepo
```

====================================================================
## 💻 Estado por Plataforma
====================================================================

- Windows: 🟢 Estable / Producción (C# · .NET 9 · Windows Forms · WebView2 · Inno Setup)
- Linux: 🟡 En Desarrollo / Reservado (Python 3 · pywebview · Empaquetado AppImage)

====================================================================
## ✨ Características Principales
====================================================================

- Biblioteca Local: Importa tus carpetas de música (.mp3, .flac, .wav, etc.), por ejemplo desde C:\Users\<Usuario>\Music o /home/<usuario>/Music. El escaneo automático nativo (detectar música nueva sin reimportar la carpeta) está en desarrollo.
- Acceso Inmediato & Privacidad Total: Tu biblioteca vive en tu equipo; ningún dato ni archivo se sube a la nube.
- Integración Nativa: Reproducción continua en segundo plano, controles de bandeja del sistema (System Tray) y barra de título personalizable.
- Visualizador y Playlists: Interfaz reactiva con visualización en tiempo real al ritmo de la música y gestión de listas de reproducción con respaldo de datos.
- Funciona sin conexión: La interfaz viaja dentro de la aplicación, sin depender de internet ni de servidores. Cada versión nueva del instalador reemplaza a la anterior.

====================================================================
## 🛠️ Desarrollo por Plataforma
====================================================================

Para trabajar en el código de un sistema operativo específico, dirígete a su carpeta correspondiente y consulta su documentación interna.

### Windows (windows/)

1. Requisitos: [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0) y Visual Studio 2022 / VS Code.
2. Navega al módulo:

   ```
   cd windows/
   ```

3. Ejecución en Debug (no necesita ningún servidor):

   ```
   dotnet run -c Debug --project localtunes.csproj
   ```

   La interfaz se carga desde la copia de `web_assets` de la carpeta de salida mediante un host virtual de WebView2, así que cada cambio en `web_assets` requiere recompilar. Para ver los cambios al instante con Live Server, consulta el comentario de la zona `#if DEBUG` en `Form1.cs`.

4. Compilación en Release (ejemplo para x64):

   ```
   dotnet publish localtunes.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o build/v1.0.0/win-x64
   ```

5. Instalador (opcional, requiere [Inno Setup 6](https://jrsoftware.org/isinfo.php)): publica primero `win-x64` y `win-x86` en `build/v<versión>/` y luego, desde `windows/`:

   ```
   ISCC.exe /DMyAppVersion=1.0.0 setup.iss
   ```

   El instalador se genera en `windows/build/installer/LocalTunes-setup.exe`.

### Linux (linux/)

1. Requisitos: Python 3, pywebview y entorno Linux/WSL.
2. Revisa las metas y el diseño en `linux/README.md`.

====================================================================
## 🏷️ Tags y Versionado de Releases
====================================================================

Dado que las compilaciones para cada sistema operativo evolucionan a su propio ritmo:

- Los tags de producción usan prefijos según la plataforma (por ejemplo, `win-v1.0.0` o `linux-v1.0.0`).
- El tag de Windows debe coincidir con la versión de `windows/localtunes.csproj`: el flujo de GitHub Actions falla si no coinciden.
- Solo el release de Windows se marca como "latest" (el enlace de descarga de arriba depende de eso). Los releases de otras plataformas no deben marcarse como latest.
- Los releases y tags los crea únicamente el propietario del repositorio mediante los flujos automatizados de GitHub Actions.

====================================================================
## 🤝 Contribuir
====================================================================

Las contribuciones son bienvenidas únicamente a través de Pull Requests:

1. Haz un fork del repositorio y crea una rama temática (ejemplo: `fix/windows-tray` o `feat/linux-scanner`).
2. Realiza tus cambios dentro de la subcarpeta del sistema correspondiente (`windows/` o `linux/`).
3. Abre un Pull Request dirigido a la rama `main` de este repositorio describiendo tus mejoras.

====================================================================
## 📄 Licencia
====================================================================

Copyright © 2026 Héctor Lerma (lerma-dev). Todos los derechos reservados.

El código se comparte públicamente con fines de aprendizaje, estudio y recepción de contribuciones mediante Pull Request. Prohibida su comercialización, redistribución o republicación no autorizada de instaladores. Consulta LICENSE.md para más detalles.

====================================================================
## 🌐 Enlaces
====================================================================

- Proyecto Web base: https://github.com/lerma-dev/local-tunes
- Portal Oficial: https://lerma-dev.vercel.app