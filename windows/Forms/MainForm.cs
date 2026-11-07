using localtunes.services;
using localtunes.utils;
using Microsoft.Web.WebView2.Core;
using System.Diagnostics;
using System.Text.Json;
namespace localtunes.Forms;

public partial class MainForm : Form
{
    // NO CAMBIAR AppId, SE USA PARA EL WEBVIEW2 Y PARA EL ICONO DE LA BARRA DE TAREAS
    private const string AppId = "tech.lerma.localtunes";
    private bool isInitWeb = false;
    private readonly WebCommandHandler handle;
    private readonly SystemMenuManager menuManager;
    private readonly TrayManager trayManager;
    private readonly LibraryDatabase library = new();

    // Campo para guardar la ruta del archivo inicial si se abrió con uno
    private readonly string _initialFile;

    public MainForm(string initialFile = null)
    {
        _initialFile = initialFile;

        if (Environment.OSVersion.Version.Major >= 6)
        {
            try
            {
                _ = NativeMethods.SetCurrentProcessExplicitAppUserModelID(AppId);
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[AVISO] No se pudo asignar AppUserModelID: {ex.Message}");
            }
        }

        InitializeComponent();
        ClientSize = new Size(1124, 650);
        MinimumSize = new Size(500, 650);
        handle = new WebCommandHandler(this, webview, library);
        menuManager = new SystemMenuManager(this);
        trayManager = new TrayManager(this, webview);
        trayManager.ShowTray();
        _ = InitWebview();
    }
    public TaskCompletionSource<bool> WebViewLoadedTcs { get; } =
        new(TaskCreationOptions.RunContinuationsAsynchronously);

    /// <summary>
    /// Espera a que WebView2 entregue el primer frame con la ventana ya visible.
    /// El Splash lo usa para no revelar una superficie en blanco.
    /// </summary>
    public async Task WaitForFirstPaintAsync()
    {
        if (webview.CoreWebView2 == null) return;

        try
        {
            const string script =
                "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))";

            var paint = webview.CoreWebView2.ExecuteScriptAsync(script);

            // Si el renderer está en pausa (ventana oculta/oclusa) no esperamos para siempre.
            if (await Task.WhenAny(paint, Task.Delay(1500)) != paint)
            {
                Debug.WriteLine("[paint] La web no confirmó el primer frame a tiempo.");
            }
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[paint] {ex.Message}");
        }

        webview.Invalidate();
    }

    protected override void OnLoad(EventArgs e)
    {
        base.OnLoad(e);
        // Registramos esta instancia como la activa para el control de instancias únicas
        SingleInstanceManager.ActiveMainForm = this;
    }

    /// <summary>
    /// Recibe un nuevo archivo desde otra instancia (ej. doble clic posterior) y lo reproduce al vuelo.
    /// </summary>
    public void PlayExternalFileInstantly(string filePath)
    {
        if (string.IsNullOrEmpty(filePath) || !File.Exists(filePath)) return;

        var folderPath = Path.GetDirectoryName(filePath);
        var mediaHost = LibraryScanner.MediaHostFor(folderPath);

        webview.CoreWebView2.SetVirtualHostNameToFolderMapping(
            mediaHost,
            folderPath,
            CoreWebView2HostResourceAccessKind.Allow
        );

        var relativePath = Path.GetRelativePath(folderPath, filePath).Replace('\\', '/');
        var encodedPath = string.Join('/', relativePath
            .Split('/', StringSplitOptions.RemoveEmptyEntries)
            .Select(Uri.EscapeDataString));

        var virtualUrl = $"https://{mediaHost}/{encodedPath}";

        var songData = new
        {
            title = Path.GetFileNameWithoutExtension(filePath),
            artist = "Artista Desconocido",
            src = virtualUrl
        };

        var payload = JsonSerializer.Serialize(new { action = "play_file", song = songData });
        webview.CoreWebView2.PostWebMessageAsJson(payload);

        // Opcional: Traer la ventana al frente si estaba minimizada u oculta tras otro programa
        if (this.WindowState == FormWindowState.Minimized)
            this.WindowState = FormWindowState.Normal;
        this.Activate();
    }

    public void MenuSystem(int x, int y)
    {
        menuManager.Show(x, y);
    }

    private async Task InitWebview()
    {
        if (isInitWeb || webview.CoreWebView2 != null)
        {
            return;
        }

        try
        {
            isInitWeb = true;
            // --- CONFIGURACIÓN DE LA CARPETA DE CACHÉ PERSONALIZADA ---
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string CacheFolder = Path.Combine(localAppData, "Local Tunes", "Cache");

            // Creamos el entorno apuntando a la ruta limpia "Cache"
            var environment = await CoreWebView2Environment.CreateAsync(null, CacheFolder, null);

            await webview.EnsureCoreWebView2Async(environment);

            if (webview.CoreWebView2 != null)
            {
                // Expone cada carpeta de música como un host virtual para reproducir audio local
                handle.RegisterFolderMappings();
                webview.WebMessageReceived += WebviewMessageRecieved;
                webview.CoreWebView2.NewWindowRequested += (sender, args) =>
                {
                    args.Handled = true;
                    Process.Start(new ProcessStartInfo(args.Uri)
                    {
                        UseShellExecute = true
                    });
                };

                string assetsPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "web_assets");
                webview.CoreWebView2.SetVirtualHostNameToFolderMapping(
                    AppId,
                    assetsPath,
                    CoreWebView2HostResourceAccessKind.Allow
                );
#if DEBUG
                webview.Source = new Uri($"https://{AppId}/index.html");
                //webview.Source = new Uri("http://127.0.0.1:3000/");
#else
                webview.Source = new Uri($"https://{AppId}/index.html");
                webview.CoreWebView2.Settings.IsZoomControlEnabled = false;
                webview.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
                webview.CoreWebView2.Settings.AreDevToolsEnabled = false;
                webview.CoreWebView2.Settings.AreBrowserAcceleratorKeysEnabled = false;
#endif
            }
        }
        catch (Exception e)
        {
            MessageBox.Show($"Error al inicializar el navegador: {e.Message}");
        }
        finally
        {
            isInitWeb = false;
        }
    }

    private void WebviewMessageRecieved(object sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        string json = e.TryGetWebMessageAsString();
        Debug.WriteLine($"Comando Recibido: {json}");

        if (json.Contains("app_rendered"))
        {
            // ¡La web avisa que ya dibujó toda la interfaz! Desbloqueamos el splash.
            WebViewLoadedTcs.TrySetResult(true);

            // Si hay un archivo pendiente de abrir por argumentos, se lo mandamos a JS
            if (!string.IsNullOrEmpty(_initialFile) && File.Exists(_initialFile))
            {
                var folderPath = Path.GetDirectoryName(_initialFile);

                // 1. Obtenemos el host virtual usando tu LibraryScanner
                var mediaHost = LibraryScanner.MediaHostFor(folderPath);

                // 2. Registramos el mapeo en WebView2 para permitir el streaming local
                webview.CoreWebView2.SetVirtualHostNameToFolderMapping(
                    mediaHost,
                    folderPath,
                    CoreWebView2HostResourceAccessKind.Allow
                );

                // 3. Generamos la ruta relativa y la codificamos para la URL segura
                var relativePath = Path.GetRelativePath(folderPath, _initialFile).Replace('\\', '/');
                var encodedPath = string.Join('/', relativePath
                    .Split('/', StringSplitOptions.RemoveEmptyEntries)
                    .Select(Uri.EscapeDataString));

                var virtualUrl = $"https://{mediaHost}/{encodedPath}";

                // 4. Armamos el objeto con la canción para que la web lo reproduzca de inmediato
                var songData = new
                {
                    title = Path.GetFileNameWithoutExtension(_initialFile),
                    artist = "Artista Desconocido",
                    src = virtualUrl
                };

                var payload = JsonSerializer.Serialize(new { action = "play_file", song = songData });
                webview.CoreWebView2.PostWebMessageAsJson(payload);
            }
        }
        else if (json.Contains("close_menu"))
        {
            menuManager.CloseMenu();
        }
        else if (json.Contains("start_drag"))
        {
            NativeMethods.ReleaseCapture();
            NativeMethods.SendMessage(this.Handle, 0x112, 0xf012, 0);
        }
        else
        {
            handle.ProcessCommand(json);
        }
    }
}