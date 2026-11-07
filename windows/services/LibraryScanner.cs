using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using localtunes.models;
namespace localtunes.services;

/// <summary>
/// Escanea las carpetas registradas en SQLite y construye la biblioteca que consume la UI.
/// Cada carpeta se expone a WebView2 con un host virtual propio para poder reproducir
/// los archivos locales sin usar IndexedDB ni File objects.
/// </summary>
public static class LibraryScanner
{
    private static readonly HashSet<string> AudioExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".mp3", ".m4a", ".m4b", ".aac", ".wav", ".ogg", ".oga", ".opus",
        ".flac", ".wma", ".aiff", ".aif", ".ape", ".alac", ".wv",
    };

    public static string CoversFolder => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "Local Tunes",
        "Data",
        "Thumbnails"
    );

    public static string MediaHostFor(string folderPath)
    {
        // Host estable por carpeta: la UI puede reconstruir la URL de audio en cualquier momento.
        var hash = Convert.ToHexString(
            SHA256.HashData(
                Encoding.UTF8.GetBytes(folderPath.ToUpperInvariant())
            )
        )

            .ToLowerInvariant();

        return $"media-{hash[..13]}.localtunes";
    }

    public static List<FolderInfo> ScanAll(IEnumerable<FolderRecord> folders)
    {
        var result = new List<FolderInfo>();
        foreach (var folder in folders)
        {
            result.Add(Scan(folder));
        }
        return result;
    }

    /// <summary>
    /// Devuelve todas las carpetas que contienen archivos de audio directamente.
    /// Se usa para mostrar cada subcarpeta como una tarjeta independiente.
    /// </summary>
    public static List<string> FindMusicFolders(string root)
    {
        var folders = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (!Directory.Exists(root)) return folders.ToList();

        var options = new EnumerationOptions
        {
            RecurseSubdirectories = true,
            IgnoreInaccessible = true,
            AttributesToSkip = FileAttributes.Hidden | FileAttributes.System,
            ReturnSpecialDirectories = false,
        };

        try
        {
            foreach (var file in Directory.EnumerateFiles(root, "*", options))
            {
                if (!AudioExtensions.Contains(Path.GetExtension(file))) continue;

                var directory = Path.GetDirectoryName(file);
                if (!string.IsNullOrEmpty(directory)) folders.Add(directory);
            }
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[scan] No se pudo explorar {root}: {ex.Message}");
        }

        return folders
            .OrderBy(folder => folder, StringComparer.CurrentCultureIgnoreCase)
            .ToList();
    }

    public static bool HasDirectAudio(string folder)
    {
        if (!Directory.Exists(folder)) return false;

        var options = new EnumerationOptions
        {
            RecurseSubdirectories = false,
            IgnoreInaccessible = true,
            AttributesToSkip = FileAttributes.Hidden | FileAttributes.System,
            ReturnSpecialDirectories = false,
        };

        try
        {
            return Directory.EnumerateFiles(folder, "*", options)
                .Any(file => AudioExtensions.Contains(Path.GetExtension(file)));
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[scan] No se pudo revisar {folder}: {ex.Message}");
            return false;
        }
    }

    public static FolderInfo Scan(FolderRecord folder)
    {
        var host = MediaHostFor(folder.Path);
        var songs = new List<SongInfo>();

        if (Directory.Exists(folder.Path))
        {
            var options = new EnumerationOptions
            {
                // Solo los archivos de esta carpeta: las subcarpetas se muestran aparte.
                RecurseSubdirectories = false,
                IgnoreInaccessible = true,
                AttributesToSkip = FileAttributes.Hidden | FileAttributes.System,
                ReturnSpecialDirectories = false,
            };

            try
            {
                foreach (var file in Directory.EnumerateFiles(folder.Path, "*", options))
                {
                    if (!AudioExtensions.Contains(Path.GetExtension(file))) continue;

                    try
                    {
                        songs.Add(BuildSong(folder.Path, host, file));
                    }
                    catch (Exception ex)
                    {
                        Debug.WriteLine($"[scan] Se omitió {file}: {ex.Message}");
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[scan] No se pudo leer {folder.Path}: {ex.Message}");
            }
        }
        else
        {
            Debug.WriteLine($"[scan] La carpeta ya no existe: {folder.Path}");
        }

        songs.Sort((a, b) => string.Compare(a.Title, b.Title, StringComparison.CurrentCultureIgnoreCase));

        return new FolderInfo(
            folder.Id,
            folder.Path,
            GetDisplayName(folder.Path),
            songs.Count,
            host,
            songs);
    }

    public static string GetDisplayName(string path)
    {
        try
        {
            var name = new DirectoryInfo(path).Name;
            return string.IsNullOrWhiteSpace(name) ? path : name;
        }
        catch
        {
            return path;
        }
    }

    private static SongInfo BuildSong(string folderPath, string mediaHost, string filePath)
    {
        string title = string.Empty;
        string artist = string.Empty;
        string album = string.Empty;
        string cover = string.Empty;
        double duration = 0;

        try
        {
            using var tagFile = TagLib.File.Create(filePath);
            title = tagFile.Tag?.Title ?? string.Empty;
            artist = tagFile.Tag?.FirstPerformer ?? string.Empty;
            album = tagFile.Tag?.Album ?? string.Empty;
            duration = tagFile.Properties?.Duration.TotalSeconds ?? 0;

            // 1. Extraer la carátula si existe
            var picture = tagFile.Tag?.Pictures?
                .FirstOrDefault(p => p.Type == TagLib.PictureType.FrontCover)
                ?? tagFile.Tag?.Pictures?.FirstOrDefault();

            if (picture != null && picture.Data.Data is byte[] data && data.Length > 0)
            {
                // Creamos un nombre de archivo único basado en la ruta de la canción (o un hash)
                var coverFileName = $"{Math.Abs(filePath.GetHashCode())}.jpg";
                var coverPath = Path.Combine(LibraryScanner.CoversFolder, coverFileName);

                // Guardamos la imagen en disco si no existe todavía
                if (!File.Exists(coverPath))
                {
                    File.WriteAllBytes(coverPath, data);
                }

                // Asignamos la URL virtual que WebView2 interceptará
                cover = $"https://covers.localtunes/{coverFileName}";
            }
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[tag] Sin metadatos para {filePath}: {ex.Message}");
        }

        var stem = Path.GetFileNameWithoutExtension(filePath);

        if (string.IsNullOrWhiteSpace(title))
        {
            var parts = stem.Split(" - ", 2, StringSplitOptions.TrimEntries);   
            if (parts.Length == 2 && parts[0].Length > 0 && parts[1].Length > 0)
            {
                artist = parts[0];
                title = parts[1];
            }
            else
            {
                title = stem;
            }
        }

        if (string.IsNullOrWhiteSpace(artist))
        {
            artist = "Artista Desconocido";
        }

        var relativePath = Path.GetRelativePath(folderPath, filePath).Replace('\\', '/');
        var encodedPath = string.Join('/', relativePath
            .Split('/', StringSplitOptions.RemoveEmptyEntries)
            .Select(Uri.EscapeDataString));

        // 2. Respetar estrictamente el orden del record SongInfo:
        // public record SongInfo(Title, Artist, Cover, Album, Duration, Path, FolderPath, Src)
        return new SongInfo(
            title.Trim(),
            artist.Trim(),
            cover.Trim(), // <- Aquí va la URL o ruta web de la carátula
            album.Trim(),
            Math.Round(duration),
            filePath,
            folderPath,
            $"https://{mediaHost}/{encodedPath}"
        );
    }
}
