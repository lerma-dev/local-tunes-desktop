using System.Diagnostics;
using System.IO.Compression;
using System.Text.Json;
namespace localtunes.services;

public class WebAssetsManager
{
    private const string ZipUrl = "https://github.com/lerma-dev/local-tunes/archive/refs/heads/beta.zip";
    private const string VersionUrl = "https://raw.githubusercontent.com/lerma-dev/local-tunes/beta/version.json";

    public static async Task SyncAssetsAsync(string assetsPath)
    {
        using HttpClient client = new HttpClient();
        client.DefaultRequestHeaders.Add("User-Agent", "LocalTunes-App");

        try
        {
            // Descarga inicial si no existen archivos locales
            if (!Directory.Exists(assetsPath) || Directory.GetFiles(assetsPath).Length == 0)
            {
                await DownloadAndExtractZipAsync(client, assetsPath);
                return;
            }

            HttpResponseMessage response = await client.GetAsync(VersionUrl);
            if (!response.IsSuccessStatusCode) return;

            string remoteJson = await response.Content.ReadAsStringAsync();
            using JsonDocument remoteDoc = JsonDocument.Parse(remoteJson);
            string remoteVersion = remoteDoc.RootElement.GetProperty("version").GetString() ?? "";

            string localVersionFile = Path.Combine(assetsPath, "version.json");
            string localVersion = "";

            if (File.Exists(localVersionFile))
            {
                string localJson = await File.ReadAllTextAsync(localVersionFile);
                using JsonDocument localDoc = JsonDocument.Parse(localJson);
                if (localDoc.RootElement.TryGetProperty("version", out JsonElement vElement))
                {
                    localVersion = vElement.GetString() ?? "";
                }
            }

            if (remoteVersion != localVersion)
            {
                Debug.WriteLine($"[ACTUALIZACIÓN] Descargando versión {remoteVersion}...");
                await DownloadAndExtractZipAsync(client, assetsPath);
            }
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[OFFLINE] Error al comprobar actualización: {ex.Message}");
        }
    }

    private static async Task DownloadAndExtractZipAsync(HttpClient client, string destinationFolder)
    {
        using Stream zipStream = await client.GetStreamAsync(ZipUrl);
        using ZipArchive archive = new ZipArchive(zipStream, ZipArchiveMode.Read);

        foreach (ZipArchiveEntry entry in archive.Entries)
        {
            string[] pathSegments = entry.FullName.Split('/');
            if (pathSegments.Length <= 1) continue;

            string relativePath = string.Join(Path.DirectorySeparatorChar.ToString(), pathSegments[1..]);
            string targetPath = Path.Combine(destinationFolder, relativePath);

            if (string.IsNullOrEmpty(entry.Name))
            {
                Directory.CreateDirectory(targetPath);
            }
            else
            {
                Directory.CreateDirectory(Path.GetDirectoryName(targetPath)!);
                entry.ExtractToFile(targetPath, overwrite: true);
            }
        }
    }
}

