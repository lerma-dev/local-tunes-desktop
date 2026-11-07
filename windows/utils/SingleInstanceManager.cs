using System.Diagnostics;
using System.IO.Pipes;
using System.Text;
using localtunes.Forms;

namespace localtunes.utils;
public class SingleInstanceManager
{
    private static Mutex _mutex;
    private const string MutexName = "tech.lerma.localtunes.mutex.A1B2C3D4-E5F6";
    private const string PipeName = "LocalTunes_Pipe_CommandChannel";

    public static MainForm ActiveMainForm { get; set; }

    /// <summary>
    /// Intenta registrar el Mutex. Si ya existe, envía el archivo a la instancia previa y retorna false.
    /// </summary>
    public static bool Initialize(ref string initialFile, out bool isFirstInstance)
    {
        _mutex = new Mutex(true, MutexName, out isFirstInstance);

        // Validamos y filtramos errores de dedo en el archivo inicial
        if (!string.IsNullOrEmpty(initialFile))
        {
            if (!File.Exists(initialFile))
            {
                MessageBox.Show(
                   $"El archivo especificado no existe o la ruta es incorrecta:\n\n{initialFile}",
                   "Local Tunes - Error de ruta",
                   MessageBoxButtons.OK,
                   MessageBoxIcon.Warning
               );
               initialFile = null; // Anulamos para evitar abrir archivo fantasma
            }
        }

        if (!isFirstInstance)
        {
            // Si no es la primera instancia y hay un archivo válido, lo enviamos por el pipe
            if (!string.IsNullOrEmpty(initialFile))
            {
                SendFileToRunningInstance(initialFile);
            }
            return false; // Indicamos que debe cerrarse
        }

        // Si es la primera instancia, arrancamos el servidor en segundo plano
        _ = Task.Run(() => ListenForNewFiles());
        return true;
    }

    public static void KeepAlive()
    {
        GC.KeepAlive(_mutex);
    }

    private static void SendFileToRunningInstance(string filePath)
    {
        try
        {
            using var clientStream = new NamedPipeClientStream(".", PipeName, PipeDirection.Out);
            clientStream.Connect(1000);
            using var writer = new StreamWriter(clientStream, Encoding.UTF8);
            writer.WriteLine(filePath);
            writer.Flush();
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[Pipe] Error al enviar archivo: {ex.Message}");
        }
    }

    private static async Task ListenForNewFiles()
    {
        while (true)
        {
            try
            {
                using var serverStream = new NamedPipeServerStream(PipeName, PipeDirection.In, 1, PipeTransmissionMode.Byte, PipeOptions.Asynchronous);
                await serverStream.WaitForConnectionAsync();

                using var reader = new StreamReader(serverStream, Encoding.UTF8);
                string filePath = await reader.ReadLineAsync();

                if (!string.IsNullOrEmpty(filePath) && File.Exists(filePath))
                {
                    if (ActiveMainForm != null && !ActiveMainForm.IsDisposed)
                    {
                        ActiveMainForm.Invoke(new Action(() =>
                        {
                            ActiveMainForm.PlayExternalFileInstantly(filePath);
                        }));
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[PipeServer] Error: {ex.Message}");
            }
        }
    }
}
