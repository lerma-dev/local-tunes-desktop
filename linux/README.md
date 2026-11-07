# Local Tunes — Linux Native Desktop App

Módulo dedicado a la versión de escritorio nativa de **Local Tunes** para distribuciones Linux.

## Características y Funcionalidades Planeadas
- **Indexación y Escaneo Automático:** Detección y lectura local de archivos de audio (`.mp3`, `.wav`, etc.) en la carpeta del usuario (`~/Music`) y directorios personalizados.
- **Reproducción en Segundo Plano:** Integración nativa con controladores del sistema y reproducción continua.
- **Renderizado de Interfaz:** Integración de la interfaz web mediante `pywebview`.

## Stack Tecnológico
- **Lenguaje Base:** Python 3
- **Motor Web/GUI:** `pywebview`
- **Empaquetado y Distribución:** **AppImage** (compilado desde WSL o un entorno Linux). Se publicará como asset del release con el tag `linux-vX.Y.Z`.

## Decisiones de diseño (por confirmar al implementar)
- **Interfaz local sin exponerla al navegador.** Pasar una ruta a `pywebview` hace que levante un servidor HTTP en `localhost`, accesible desde cualquier navegador. La meta es limitar ese acceso (por ejemplo, con un servidor propio en `127.0.0.1` que exija un token y valide el header `Host`), ya que en Windows el host virtual de WebView2 no abre ningún puerto.
- **Biblioteca persistente.** El origen de la interfaz debe ser estable entre ejecuciones (puerto fijo) y el almacenamiento no debe ser privado (`private_mode=False` con un `storage_path`); de lo contrario, el IndexedDB con la biblioteca se perdería al cerrar la aplicación.
- **Dependencias del sistema.** `pywebview` necesita GTK y WebKitGTK (o Qt). Hay que definir si el AppImage las incluye o si se requieren en el sistema, y probarlo en una distribución limpia.
- **Ejecución del AppImage.** Algunas distribuciones recientes no traen `libfuse2`; conviene documentar cómo ejecutarlo en ese caso.
- **Releases.** Los releases de Linux no deben marcarse como "latest" (ese lugar lo ocupa Windows). Los enlaces de descarga de Linux se resolverán por tag o consultando la lista de releases con el prefijo `linux-v`.

---
*Estado actual: En desarrollo / En espera (fase de estabilización de la versión para Windows).*