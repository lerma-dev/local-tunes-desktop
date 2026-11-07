using Microsoft.VisualBasic.FileIO;
using System.Diagnostics;
using System.Text;
using System.Text.Json;

namespace localtunes.services;

/// <summary>
/// Papelera propia de la app.
///
/// Al eliminar una canción el archivo no se borra: se mueve a
/// %LocalAppData%\Local Tunes\Papelera (un disco fijo, por eso siempre tiene
/// papelera de Windows disponible). Desde Ajustes se puede restaurar o enviar a
/// la papelera del sistema. Después de 30 días se elimina automáticamente.
/// </summary>
public static class TrashService
{
    /// <summary>Días que un archivo puede estar en la Papelera antes de borrarse.</summary>
    public const int MaxDays = 30;

    private static readonly object Sync = new();

    private static readonly JsonSerializerOptions ManifestOptions = new(){
        PropertyNameCaseInsensitive = true,
        WriteIndented = true,
    };

    public static string TrashPath { get; } = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "Local Tunes",
        "Data",
        "Papelera"
    );

    private static string ManifestPath => Path.Combine(TrashPath, "manifest.json");

    public sealed record TrashItem(
        string Id,
        string Name,
        string OriginalPath,
        DateTime DeletedAt,
        int DaysLeft
    );

    public sealed record RestoreResult(bool Ok, string Message, string RestoredPath);

    private sealed class Manifest{
        public List<TrashItem> Items { get; set; } = new();
    }

    /// <summary>Mueve un archivo a la Papelera. Devuelve false si no se pudo.</summary>
    public static bool TryMoveToTrash(string sourcePath)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(sourcePath) || !File.Exists(sourcePath)) return false;

            lock (Sync)
            {
                EnsureFolder();

                var trashFile = Path.Combine(TrashPath, UniqueName(Path.GetFileName(sourcePath)));
                Move(sourcePath, trashFile);

                var manifest = ReadManifest();
                manifest.Items.Add(
                    new TrashItem(
                        Id: Path.GetFileName(trashFile),
                        Name: Path.GetFileName(sourcePath),
                        OriginalPath: Path.GetFullPath(sourcePath),
                        DeletedAt: DateTime.UtcNow,
                        DaysLeft: MaxDays
                    )
                );

                // Si no se puede registrar el archivo, se devuelve a su sitio:
                // mejor no perderlo fuera del control de la Papelera.
                if (!WriteManifest(manifest))
                {
                    try
                    {
                        Move(trashFile, sourcePath);
                    }
                    catch (Exception moveBackEx)
                    {
                        Debug.WriteLine($"[trash] No se pudo devolver {trashFile}: {moveBackEx.Message}");
                    }

                    return false;
                }
            }

            return true;
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[trash] No se pudo mover {sourcePath}: {ex.Message}");
            return false;
        }
    }

    /// <summary>Lista el contenido de la Papelera (sin los archivos ya borrados).</summary>
    public static List<TrashItem> List()
    {
        lock (Sync)
        {
            EnsureFolder();

            var manifest = ReadManifest();
            var valid = manifest.Items
                .Where(item => File.Exists(Path.Combine(TrashPath, item.Id)))
                .ToList();

            var known = new HashSet<string>(
                valid.Select(item => item.Id), StringComparer.OrdinalIgnoreCase);

            var items = valid
                .Select(item => item with { DaysLeft = DaysLeftFor(item.DeletedAt) })
                .Concat(OrphanFiles(known))
                .OrderByDescending(item => item.DeletedAt)
                .ToList();

            // Limpia el manifiesto de entradas cuyo archivo ya no existe.
            if (valid.Count != manifest.Items.Count)
            {
                manifest.Items = valid;
                WriteManifest(manifest);
            }

            return items;
        }
    }

    /// <summary>Devuelve una canción a su carpeta original.</summary>
    public static RestoreResult Restore(string trashPath)
    {
        if (string.IsNullOrWhiteSpace(trashPath))
            return new RestoreResult(false, "Ruta de la papelera no válida.", string.Empty);

        string full;
        try
        {
            // La interfaz envía sólo el nombre del archivo dentro de la Papelera
            // (item.id), así que las rutas relativas se resuelven contra la
            // carpeta de la Papelera y no contra el directorio de trabajo.
            var candidate = Path.IsPathRooted(trashPath)
                ? trashPath
                : Path.Combine(TrashPath, trashPath);

            full = Path.GetFullPath(candidate);
        }
        catch
        {
            return new RestoreResult(false, "Ruta de la papelera no válida.", string.Empty);
        }

        // Solo se permite trabajar dentro de la carpeta de la Papelera.
        var root = TrashPath.EndsWith(Path.DirectorySeparatorChar)
            ? TrashPath
            : TrashPath + Path.DirectorySeparatorChar;
        if (!full.StartsWith(root, StringComparison.OrdinalIgnoreCase))
            return new RestoreResult(false, "Ruta fuera de la Papelera.", string.Empty);

        lock (Sync)
        {
            try
            {
                if (!File.Exists(full))
                    return new RestoreResult(false, "El archivo ya no está en la Papelera.", string.Empty);

                var manifest = ReadManifest();
                var fileName = Path.GetFileName(full);
                var item = manifest.Items.FirstOrDefault(i =>
                    string.Equals(i.Id, fileName, StringComparison.OrdinalIgnoreCase));

                var original = item?.OriginalPath;
                if (string.IsNullOrWhiteSpace(original))
                    return new RestoreResult(false, "No se conoce la ubicación original.", string.Empty);

                var dir = Path.GetDirectoryName(original);
                if (!string.IsNullOrWhiteSpace(dir)) Directory.CreateDirectory(dir);

                // Si en la carpeta original ya existe un archivo con ese nombre,
                // no lo sobrescribimos: se restaura con un sufijo.
                var destination = original;
                if (File.Exists(destination))
                {
                    destination = AppendSuffix(original, " (restaurado)");
                }

                Move(full, destination);

                manifest.Items = manifest.Items
                    .Where(i => !string.Equals(i.Id, fileName, StringComparison.OrdinalIgnoreCase))
                    .ToList();
                WriteManifest(manifest);

                return new RestoreResult(true, string.Empty, destination);
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[trash] No se pudo restaurar {full}: {ex.Message}");
                return new RestoreResult(false, "No se pudo restaurar la canción.", string.Empty);
            }
        }
    }

    /// <summary>Envía todo el contenido de la Papelera a la papelera del sistema.</summary>
    public static int Empty()
    {
        lock (Sync)
        {
            EnsureFolder();

            var removed = 0;
            foreach (var file in TrashFiles())
            {
                if (SendToSystemRecycleBin(file)) removed++;
            }

            WriteManifest(new Manifest());
            return removed;
        }
    }

    /// <summary>Elimina de forma permanente los archivos con más de 30 días.</summary>
    public static int PurgeExpired()
    {
        lock (Sync)
        {
            var manifest = ReadManifest();
            var removed = 0;

            foreach (var item in manifest.Items.ToList())
            {
                if (DaysLeftFor(item.DeletedAt) > 0) continue;

                var file = Path.Combine(TrashPath, item.Id);
                if (File.Exists(file) && SendToSystemRecycleBin(file)) removed++;
            }

            manifest.Items = manifest.Items
                .Where(i => DaysLeftFor(i.DeletedAt) > 0)
                .ToList();

            // También los archivos sueltos que no están en el manifiesto.
            var known = new HashSet<string>(
                manifest.Items.Select(i => i.Id), StringComparer.OrdinalIgnoreCase);
            foreach (var orphan in OrphanFiles(known))
            {
                if (orphan.DaysLeft > 0) continue;

                var file = Path.Combine(TrashPath, orphan.Id);
                if (File.Exists(file) && SendToSystemRecycleBin(file)) removed++;
            }

            WriteManifest(manifest);

            return removed;
        }
    }

    /// <summary>Igual que <see cref="PurgeExpired"/> pero nunca lanza excepciones.</summary>
    public static void PurgeExpiredSafe()
    {
        try
        {
            PurgeExpired();
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[trash] {ex.Message}");
        }
    }

    /// <summary>Archivos de la Papelera que no están en el manifiesto.</summary>
    private static IEnumerable<TrashItem> OrphanFiles(HashSet<string> knownIds)
    {
        foreach (var file in TrashFiles())
        {
            var id = Path.GetFileName(file);
            if (knownIds.Contains(id)) continue;

            // En una copia entre discos la fecha de modificación se conserva
            // (puede ser de hace años), así que se usa la fecha de creación.
            var createdAt = File.GetCreationTimeUtc(file);
            yield return new TrashItem(id, id, string.Empty, createdAt, DaysLeftFor(createdAt));
        }
    }

    /// <summary>Todos los archivos de la Papelera salvo el manifiesto.</summary>
    private static IEnumerable<string> TrashFiles()
    {
        var manifestName = Path.GetFileName(ManifestPath);

        return Directory.EnumerateFiles(TrashPath)
            .Where(file => !string.Equals(
                Path.GetFileName(file), manifestName, StringComparison.OrdinalIgnoreCase));
    }

    private static int DaysLeftFor(DateTime deletedAtUtc)
    {
        var deletedAt = deletedAtUtc.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(deletedAtUtc, DateTimeKind.Utc)
            : deletedAtUtc.ToUniversalTime();

        var elapsed = (int)Math.Floor((DateTime.UtcNow - deletedAt).TotalDays);
        return Math.Max(0, MaxDays - elapsed);
    }

    private static void EnsureFolder()
    {
        Directory.CreateDirectory(TrashPath);
    }

    private static Manifest ReadManifest()
    {
        try
        {
            if (File.Exists(ManifestPath))
            {
                var json = File.ReadAllText(ManifestPath);
                return JsonSerializer.Deserialize<Manifest>(json, ManifestOptions) ?? new Manifest();
            }
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[trash] No se pudo leer el manifiesto: {ex.Message}");
        }

        return new Manifest();
    }

    /// <summary>
    /// Escribe el manifiesto y devuelve true si se guardó.
    ///
    /// Ojo: en Windows, crear un archivo con FileMode.Create sobre un archivo
    /// que ya existe y está OCULTO falla con "acceso denegado". Como el
    /// manifiesto se oculta después de la primera escritura, hay que reabrirlo
    /// en modo Truncate (no Create) para poder actualizarlo.
    /// </summary>
    private static bool WriteManifest(Manifest manifest)
    {
        try
        {
            EnsureFolder();

            var bytes = new UTF8Encoding(false).GetBytes(
                JsonSerializer.Serialize(manifest, ManifestOptions));

            if (File.Exists(ManifestPath))
            {
                using var stream = new FileStream(
                    ManifestPath, FileMode.Truncate, FileAccess.Write, FileShare.Read);
                stream.Write(bytes, 0, bytes.Length);
            }
            else
            {
                File.WriteAllBytes(ManifestPath, bytes);

                // El manifiesto no debe ensuciar la carpeta a simple vista.
                try
                {
                    File.SetAttributes(ManifestPath, FileAttributes.Hidden);
                }
                catch
                {
                    // Si no se puede ocultar, no es grave.
                }
            }

            return true;
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[trash] No se pudo escribir el manifiesto: {ex.Message}");
            return false;
        }
    }

    /// <summary>Mueve un archivo, con copia cuando cambia de volumen (D: → C:).</summary>
    private static void Move(string source, string destination)
    {
        var sameVolume = string.Equals(
            Path.GetPathRoot(source),
            Path.GetPathRoot(destination),
            StringComparison.OrdinalIgnoreCase);

        if (sameVolume)
        {
            File.Move(source, destination);
            return;
        }

        File.Copy(source, destination, overwrite: false);
        File.Delete(source);
    }

    private static string UniqueName(string fileName)
    {
        var candidate = fileName;
        var name = Path.GetFileNameWithoutExtension(fileName);
        var extension = Path.GetExtension(fileName);
        var counter = 2;

        while (File.Exists(Path.Combine(TrashPath, candidate)))
        {
            candidate = $"{name} ({counter}){extension}";
            counter++;
        }

        return candidate;
    }

    private static string AppendSuffix(string path, string suffix)
    {
        var name = Path.GetFileNameWithoutExtension(path);
        var extension = Path.GetExtension(path);
        var directory = Path.GetDirectoryName(path) ?? string.Empty;

        var candidate = Path.Combine(directory, $"{name}{suffix}{extension}");
        var counter = 2;

        while (File.Exists(candidate))
        {
            candidate = Path.Combine(directory, $"{name}{suffix} ({counter}){extension}");
            counter++;
        }

        return candidate;
    }

    /// <summary>
    /// La Papelera vive en C: (disco fijo), así que aquí sí existe la papelera
    /// de Windows y el usuario todavía puede recuperar el archivo. Si falla, se
    /// borra directamente para no dejar archivos huérfanos.
    /// </summary>
    private static bool SendToSystemRecycleBin(string file)
    {
        try
        {
            FileSystem.DeleteFile(file, UIOption.OnlyErrorDialogs, RecycleOption.SendToRecycleBin);
            return true;
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[trash] No se pudo reciclar {file}: {ex.Message}");
            try
            {
                File.Delete(file);
                return true;
            }
            catch (Exception deleteEx)
            {
                Debug.WriteLine($"[trash] {deleteEx.Message}");
                return false;
            }
        }
    }
}
