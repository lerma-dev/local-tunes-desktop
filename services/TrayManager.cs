using Microsoft.Web.WebView2.WinForms;
using localtunes.utils;
namespace localtunes.services;

public class TrayManager(Form _form, WebView2 _webview)
{
    private readonly NotifyIcon _bandeja = new();
    private readonly ContextMenuStrip _menu = new();
        
    public void ShowTray() {
        // Obtenemos el handle nativo desde el Bitmap
        IntPtr hIcon = Properties.Resources._16x16.GetHicon();
        try
        {
            // Creamos una copia propia de .NET (Clone) para no depender del handle original
            using Icon tempIcon = Icon.FromHandle(hIcon);
                _bandeja.Icon = (Icon)tempIcon.Clone();
        }
        finally
        {
            // Destruir el handle inicial de GetHicon sin romper el render
            NativeMethods.DestroyIcon(hIcon);
        }

        _bandeja.Text = "Local Tunes";
        _bandeja.Visible = true;

        // Abrir
        _menu.Items.Add("Abrir", Properties.Resources.open, (s, e) => { 
            _form.Show();
            _form.ShowInTaskbar = true;
            _form.WindowState = FormWindowState.Normal; 
        });

        // Play / Pause
        _menu.Items.Add(new ToolStripSeparator());
        _menu.Items.Add("Play / Pausa", Properties.Resources.play, (s, e) => {
            _webview.ExecuteScriptAsync("window.togglePlay();");
        });

        // Siguiente
        _menu.Items.Add("Siguiente", Properties.Resources.forward, (s, e) => {
            _webview.ExecuteScriptAsync("window.playNext();");
        });

        // Anterior
        _menu.Items.Add("Anterior", Properties.Resources.back, (s, e) => {
            _webview.ExecuteScriptAsync("window.playPrev();");
        });

        // Salir
        _menu.Items.Add(new ToolStripSeparator());
        _menu.Items.Add("Salir", Properties.Resources.stop, (s, e) => { 
            Application.Exit(); 
        });

        _bandeja.ContextMenuStrip = _menu;

        _bandeja.DoubleClick += (s, e) => {
            if (_form.Visible) {
                _form.Hide();
                _form.ShowInTaskbar = false;
            }
            else {
                _form.Show();
                _form.Activate();
                _form.WindowState = FormWindowState.Normal;
                _form.ShowInTaskbar = true;
            }
        };

        _form.FormClosing += (s, e) => {
            _bandeja.Visible = false;
            _bandeja.Dispose();
        };
    }
}

