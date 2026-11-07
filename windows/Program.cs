using localtunes.Forms;
using localtunes.utils;
using System.Diagnostics;
using System.IO.Pipes;
using System.Text;
using static Guna.UI2.Native.WinApi;

namespace localtunes;

internal static class Program
{
    [STAThread]
    static void Main(string[] args)
    {
        ApplicationConfiguration.Initialize();

        string initialFile = (args != null && args.Length > 0) ? args[0] : null;

        // Delegamos la gestión de instancia única y validación al manager
        if (!SingleInstanceManager.Initialize(ref initialFile, out bool isFirstInstance))
        {
            return; // Cierra la instancia duplicada limpiamente
        }

        // Ejecuta la ventana principal/splash con el archivo validado
        Application.Run(new SplashForm(initialFile));

        SingleInstanceManager.KeepAlive();
    }
}