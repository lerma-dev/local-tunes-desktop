using System;
using System.Diagnostics;
using System.Drawing;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace localtunes.Forms;

public partial class SplashForm : Form
{
    private MainForm _mainForm;
    private readonly string _initialFile;

    public SplashForm(string initialFile = null)
    {
        InitializeComponent();
        _initialFile = initialFile;
        this.Shown += SplashForm_Shown;
    }

    private async void SplashForm_Shown(object sender, EventArgs e)
    {
        var startedAt = DateTime.UtcNow;
        await Task.Delay(100); // Pequeño respiro para pintar el splash

        if (lblSubtitle != null) lblSubtitle.Text = "Cargando biblioteca y motor...";

        try
        {
            // MainForm se crea y carga la web de oculta detrás del Splash
            _mainForm = await Task.Run(async () =>
            {
                MainForm form = null;

                this.Invoke(new Action(() =>
                {
                    form = new MainForm(_initialFile);
                    _ = form.Handle; // Despierta el navegador oculto
                }));

                try
                {
                    // La web avisa cuando ya aplicó la biblioteca y dibujó la interfaz.
                    // El timeout evita que el Splash se quede colgado si la web falla.
                    await form.WebViewLoadedTcs.Task.WaitAsync(TimeSpan.FromSeconds(20));
                }
                catch (TimeoutException)
                {
                    Debug.WriteLine("[splash] La UI no avisó estar lista a tiempo; se muestra igualmente.");
                }

                return form;
            });

            if (lblSubtitle != null) lblSubtitle.Text = "¡Listo!";

            /*  
             La ventana se muestra invisible para que WebView2 componga su primer
             frame mientras el Splash sigue en la pantalla.
            */
            _mainForm.Opacity = 0;
            _mainForm.ShowInTaskbar = false;
            _mainForm.Show();
            await _mainForm.WaitForFirstPaintAsync();

            // Mínimo estético del Splash
            var remaining = TimeSpan.FromMilliseconds(2500) - (DateTime.UtcNow - startedAt);
            if (remaining > TimeSpan.Zero) await Task.Delay(remaining);

            // El Splash se oculta y el MainForm se muestra
            _mainForm.Opacity = 1;
            _mainForm.ShowInTaskbar = true;
            _mainForm.Activate();
            this.Hide();
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Error al iniciar la aplicación: {ex.Message}");
            Application.Exit();
        }
    }

    private void BtnMinimize_Click(object sender, EventArgs e)
    {
        WindowState = FormWindowState.Minimized;
    }

    private void BtnClose_Click(object sender, EventArgs e)
    {
        Application.Exit();
    }
}