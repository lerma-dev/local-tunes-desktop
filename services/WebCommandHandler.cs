using System.Diagnostics;
using System.Text.Json;
using localtunes.models;
namespace localtunes.services;

public class WebCommandHandler(Form _form)
{
    // Reutilización de opciones de deserialización para mejorar el rendimiento
    private static readonly JsonSerializerOptions JsonOptions = new() {
        PropertyNameCaseInsensitive = true
    };

    public void ProcessCommand(string json) {
        try
        {
            var message = JsonSerializer.Deserialize<WebMessage>(json, JsonOptions);

            if (message == null || string.IsNullOrEmpty(message.Action)) return;

            _form.BeginInvoke(new MethodInvoker(() => {
                RunAction(message);
            }));
        }
        catch (Exception ex) {
            Debug.WriteLine($"Error procesando comando: {ex.Message}");
        }
    }

    private void RunAction(WebMessage ms) {
        switch (ms.Action)
        {
            case "close":
                _form.Hide();
                _form.ShowInTaskbar = false;
                break;
            case "minimize":
                _form.WindowState = FormWindowState.Minimized;
                break;
            case "maximize":
                var isMaximized = _form.WindowState == FormWindowState.Maximized;
                if (isMaximized) {
                    _form.WindowState = FormWindowState.Normal;
                }
                else {
                    _form.WindowState = FormWindowState.Maximized;
                }
                break;
            case "custom_bar":
                _form.FormBorderStyle = FormBorderStyle.None;
                _form.Padding = new Padding(6);
                break;
            case "native_bar":
                _form.FormBorderStyle = FormBorderStyle.Sizable;
                _form.Padding = new Padding(0);
                break;
            case "sync_background_color":
                if (!string.IsNullOrEmpty(ms.Color)) {
                    _form.BackColor = ColorTranslator.FromHtml(ms.Color);
                }
                break;
            case "show_system_menu":
                if(_form is Form1 Form){
                    Form.Activate();
                    Form.MenuSystem(ms.ScreenX, ms.ScreenY);
                }
                break;
            default:
                Debug.WriteLine($"Acción desconocida: {ms.Action}");
                break;
        }
    }
}