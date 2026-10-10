using System.Diagnostics;
using Microsoft.Web.WebView2.Core;
using localtunes.services;
using localtunes.utils;
namespace localtunes;

public partial class Form1 : Form
{
    private const string AppId = "tech.lerma.localtunes";
    private bool isInitWeb = false;
    private readonly WebCommandHandler handle;
    private readonly SystemMenuManager menuManager;
    private readonly TrayManager trayManager;

    public Form1()
    {
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
        handle = new WebCommandHandler(this);
        menuManager = new SystemMenuManager(this);
        trayManager = new TrayManager(this, webview);
        trayManager.ShowTray();
        _ = InitWebview();
    }

    protected override void WndProc(ref Message m)
    {
        // MANEJO DE REDIMENSIONAMIENTO
        base.WndProc(ref m);
        if (m.Msg == NativeMethods.WM_NCHITTEST && this.FormBorderStyle == FormBorderStyle.None)
        {
            if (this.WindowState == FormWindowState.Maximized) return;
            int grosorBorde = 8;
            Point laPosicion = this.PointToClient(new Point(m.LParam.ToInt32() & 0xFFFF, m.LParam.ToInt32() >> 16));

            // DETECCIÓN DE ESQUINAS (Prioridad alta para que las diagonales funcionen perfecto
            if (laPosicion.X <= grosorBorde && laPosicion.Y <= grosorBorde) { m.Result = (IntPtr)NativeMethods.HTTOPLEFT; return; }
            if (laPosicion.X >= this.ClientSize.Width - grosorBorde && laPosicion.Y <= grosorBorde) { m.Result = (IntPtr)NativeMethods.HTTOPRIGHT; return; }
            if (laPosicion.X <= grosorBorde && laPosicion.Y >= this.ClientSize.Height - grosorBorde) { m.Result = (IntPtr)NativeMethods.HTBOTTOMLEFT; return; }
            if (laPosicion.X >= this.ClientSize.Width - grosorBorde && laPosicion.Y >= this.ClientSize.Height - grosorBorde) { m.Result = (IntPtr)NativeMethods.HTBOTTOMRIGHT; return; }

            // DETECCIÓN DE LADOS RECTOS
            if (laPosicion.X <= grosorBorde) { m.Result = (IntPtr)NativeMethods.HTLEFT; return; }
            if (laPosicion.X >= this.ClientSize.Width - grosorBorde) { m.Result = (IntPtr)NativeMethods.HTRIGHT; return; }
            if (laPosicion.Y <= grosorBorde) { m.Result = (IntPtr)NativeMethods.HTTOP; return; }
            if (laPosicion.Y >= this.ClientSize.Height - grosorBorde) { m.Result = (IntPtr)NativeMethods.HTBOTTOM; return; }

            if ((int)m.Result == NativeMethods.HTCLIENT)
            {
                if (MouseButtons != MouseButtons.Right)
                {
                    m.Result = (IntPtr)NativeMethods.HTCAPTION;
                }
            }
        }
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
            await webview.EnsureCoreWebView2Async(null);

            if (webview.CoreWebView2 != null)
            {
                webview.WebMessageReceived += WebviewMessageRecieved;
                webview.CoreWebView2.NewWindowRequested += (sender, args) =>
                {
                    args.Handled = true;
                    Process.Start(new ProcessStartInfo(args.Uri)
                    {
                        UseShellExecute = true
                    });
                };

#if DEBUG
                webview.Source = new Uri($"http://127.0.0.1:3300");
#else
                string assetsPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "web_assets");
                await WebAssetsManager.SyncAssetsAsync(assetsPath);

                webview.CoreWebView2.SetVirtualHostNameToFolderMapping(
                    AppId,
                    assetsPath,
                    CoreWebView2HostResourceAccessKind.Allow
                );

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

    private void WebviewMessageRecieved(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        string json = e.TryGetWebMessageAsString();
        Debug.WriteLine($"Comando Recibido: {json}");

        if (json.Contains("close_menu"))
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
