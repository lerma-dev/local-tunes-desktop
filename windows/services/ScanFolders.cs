using System.Diagnostics;
using System.Globalization;

namespace localtunes.services;

public class ScanFolders {
    private static readonly string[] MusicNames = { "Music", "Musica" };

    public static void Scan(List<string> folders) {
        /*
            Scan only directories with music content
            Directories ~/Music (System in English), ~/Musica (System in Spanish) or directories personalized music folders
        */
        try
        {
            // Carpeta de música del usuario (respeta el idioma y las carpetas redirigidas)
            var mine = Environment.GetFolderPath(Environment.SpecialFolder.MyMusic);
            if (!string.IsNullOrEmpty(mine) && Directory.Exists(mine) && !folders.Contains(mine))
            {
                folders.Add(mine);
            }

            // Primer nivel de cada disco fijo o USB (por ejemplo D:\Musica)
            foreach (var drive in DriveInfo.GetDrives())
            {
                if (drive.DriveType is not (DriveType.Fixed or DriveType.Removable) || !drive.IsReady)
                {
                    continue;
                }

                foreach (var directory in Directory.EnumerateDirectories(drive.RootDirectory.FullName))
                {
                    if (IsMusicName(Path.GetFileName(directory)) && !folders.Contains(directory))
                    {
                        folders.Add(directory);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"Error scanning directories: {ex.Message}");
        }
    }

    private static bool IsMusicName(string name) =>
        MusicNames.Any(n => string.Compare(name, n, CultureInfo.InvariantCulture,
            CompareOptions.IgnoreCase | CompareOptions.IgnoreNonSpace) == 0);
}