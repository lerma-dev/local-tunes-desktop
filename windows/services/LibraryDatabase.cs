using Microsoft.Data.Sqlite;
using System.Diagnostics;
using localtunes.models;
namespace localtunes.services;

public class LibraryDatabase
{
    private readonly string _connectionString;
    private readonly object _libraryLock = new();

    public LibraryDatabase()
    {
        var dir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Local Tunes",
            "Data"
        );

        Directory.CreateDirectory(dir);

        _connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = Path.Combine(dir, "library.db"),
            ForeignKeys = true,
        }.ToString();

        Debug.WriteLine($"[db] {Path.Combine(dir, "library.db")}");
        Initialize();
    }

    private SqliteConnection Open()
    {
        var conn = new SqliteConnection(_connectionString);
        conn.Open();
        return conn;
    }

    private void Initialize()
    {
        using var conn = Open();

        using (var wal = conn.CreateCommand())
        {
            wal.CommandText = "PRAGMA journal_mode=WAL;";
            wal.ExecuteScalar();
        }

        int version;
        using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = "PRAGMA user_version;";
            version = Convert.ToInt32(cmd.ExecuteScalar());
        }

        if (version < 1)
        {
            using var cmd = conn.CreateCommand();
            cmd.CommandText = """
                    CREATE TABLE folders (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        path TEXT NOT NULL UNIQUE COLLATE NOCASE,
                        is_default INTEGER NOT NULL DEFAULT 0,
                        added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                    );
                    PRAGMA user_version = 1;
                    """;
            cmd.ExecuteNonQuery();
        }

        if (version < 2)
        {
            // Carpetas que el usuario quitó de la biblioteca. Se conservan para que
            // el escaneo automático no las vuelva a agregar.
            using var cmd = conn.CreateCommand();
            cmd.CommandText = """
                    CREATE TABLE IF NOT EXISTS hidden_folders (
                        path TEXT PRIMARY KEY COLLATE NOCASE
                    );
                    PRAGMA user_version = 2;
                    """;
            cmd.ExecuteNonQuery();
        }

        if (version < 3)
        {
            // Backfill: lo que esté registrado bajo la Música del sistema pasa a
            // is_default = 1. Lo importado a mano por el usuario se queda en 0.
            var myMusic = Environment.GetFolderPath(Environment.SpecialFolder.MyMusic);
            if (!string.IsNullOrWhiteSpace(myMusic))
            {
                var root = myMusic.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
                var prefix = root + Path.DirectorySeparatorChar;

                var targets = new List<string>();
                using (var sel = conn.CreateCommand())
                {
                    sel.CommandText = "SELECT path FROM folders;";
                    using var reader = sel.ExecuteReader();
                    while (reader.Read())
                    {
                        var path = reader.GetString(0);
                        if (path.Equals(root, StringComparison.OrdinalIgnoreCase) ||
                            path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                        {
                            targets.Add(path);
                        }
                    }
                }

                using (var upd = conn.CreateCommand())
                {
                    upd.CommandText = "UPDATE folders SET is_default = 1 WHERE path = $p;";
                    foreach (var path in targets)
                    {
                        upd.Parameters.Clear();
                        upd.Parameters.AddWithValue("$p", path);
                        upd.ExecuteNonQuery();
                    }
                }
            }

            using (var ver = conn.CreateCommand())
            {
                ver.CommandText = "PRAGMA user_version = 3;";
                ver.ExecuteScalar();
            }
        }
    }

    public List<string> GetFolders()
    {
        return GetFolderRecords().Select(f => f.Path).ToList();
    }

    public List<FolderRecord> GetFolderRecords()
    {
        var list = new List<FolderRecord>();
        using var conn = Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT id, path FROM folders ORDER BY path;";
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
        {
            list.Add(new FolderRecord(reader.GetInt64(0), reader.GetString(1)));
        }
        return list;
    }

    public HashSet<string> GetHiddenFolders()
    {
        var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        using var conn = Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT path FROM hidden_folders;";
        using var reader = cmd.ExecuteReader();
        while (reader.Read()) set.Add(reader.GetString(0));
        return set;
    }

    // true = se agregó o se restauró; false = ya existía o estaba oculta
    public bool AddFolder(string path, bool restoreHidden = false, bool isDefault = false)
    {
        var normalized = NormalizePath(path);

        lock (_libraryLock)
        {
            using var conn = Open();
            using var tx = conn.BeginTransaction();

            var restored = false;
            if (restoreHidden)
            {
                using var unhide = conn.CreateCommand();
                unhide.Transaction = tx;
                unhide.CommandText = "DELETE FROM hidden_folders WHERE path = $p;";
                unhide.Parameters.AddWithValue("$p", normalized);
                restored = unhide.ExecuteNonQuery() > 0;
            }
            else
            {
                using var check = conn.CreateCommand();
                check.Transaction = tx;
                check.CommandText = "SELECT 1 FROM hidden_folders WHERE path = $p;";
                check.Parameters.AddWithValue("$p", normalized);
                if (check.ExecuteScalar() != null) return false;
            }

            using var ins = conn.CreateCommand();
            ins.Transaction = tx;
            ins.CommandText = "INSERT OR IGNORE INTO folders (path, is_default) VALUES ($p, $d);";
            ins.Parameters.AddWithValue("$p", normalized);
            ins.Parameters.AddWithValue("$d", isDefault ? 1 : 0);
            var inserted = ins.ExecuteNonQuery() > 0;

            tx.Commit();
            return inserted || restored;
        }
    }

    public bool RemoveFolder(string path)
    {
        var normalized = NormalizePath(path);

        lock (_libraryLock)
        {
            using var conn = Open();
            using var tx = conn.BeginTransaction();

            using var del = conn.CreateCommand();
            del.Transaction = tx;
            del.CommandText = "DELETE FROM folders WHERE path = $p;";
            del.Parameters.AddWithValue("$p", normalized);
            var removed = del.ExecuteNonQuery() > 0;

            using var hide = conn.CreateCommand();
            hide.Transaction = tx;
            hide.CommandText = "INSERT OR IGNORE INTO hidden_folders (path) VALUES ($p);";
            hide.Parameters.AddWithValue("$p", normalized);
            hide.ExecuteNonQuery();

            tx.Commit();
            return removed;
        }
    }

    /// <summary>
    /// Quita la carpeta indicada y todas sus subcarpetas registradas, sin marcarlas
    /// como ocultas. Se usa cuando la carpeta Música automática se queda sin audio.
    /// </summary>
    public int DeleteFoldersUnder(string root)
    {
        var normalized = NormalizePath(root);
        var prefix = normalized.EndsWith(Path.DirectorySeparatorChar)
            ? normalized
            : normalized + Path.DirectorySeparatorChar;

        lock (_libraryLock)
        {
            var targets = GetFolders()
                .Where(folder =>
                    string.Equals(folder, normalized, StringComparison.OrdinalIgnoreCase) ||
                    folder.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                .ToList();

            if (targets.Count == 0) return 0;

            using var conn = Open();
            using var tx = conn.BeginTransaction();

            foreach (var target in targets)
            {
                using var cmd = conn.CreateCommand();
                cmd.Transaction = tx;
                cmd.CommandText = "DELETE FROM folders WHERE path = $p AND is_default = 1;";
                cmd.Parameters.AddWithValue("$p", target);
                cmd.ExecuteNonQuery();
            }

            tx.Commit();
            return targets.Count;
        }
    }

    public void ClearFolders()
    {
        lock (_libraryLock)
        {
            using var conn = Open();
            using var tx = conn.BeginTransaction();

            using (var cmd = conn.CreateCommand())
            {
                cmd.Transaction = tx;
                cmd.CommandText = "DELETE FROM folders;";
                cmd.ExecuteNonQuery();
            }

            using (var cmd = conn.CreateCommand())
            {
                cmd.Transaction = tx;
                cmd.CommandText = "DELETE FROM hidden_folders;";
                cmd.ExecuteNonQuery();
            }

            tx.Commit();
        }
    }

    /// <summary>
    /// Respeta la organización del usuario: cada carpeta con música se muestra por
    /// separado, sin unificar sus subcarpetas en una sola tarjeta. Las carpetas que
    /// solo contienen música en subcarpetas se reemplazan por esas subcarpetas.
    /// </summary>
    public void ExpandFolders()
    {
        lock (_libraryLock)
        {
            var folders = GetFolders();
            if (folders.Count == 0) return;

            var folderSet = new HashSet<string>(folders, StringComparer.OrdinalIgnoreCase);
            var hidden = GetHiddenFolders();
            var toAdd = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var toRemove = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var folder in folders)
            {
                if (!Directory.Exists(folder)) continue;

                // Las carpetas hijas ya quedan cubiertas al escanear su carpeta raíz.
                if (HasRegisteredAncestor(folder, folderSet)) continue;

                var musicFolders = LibraryScanner.FindMusicFolders(folder);
                if (musicFolders.Count == 0) continue;

                if (!LibraryScanner.HasDirectAudio(folder))
                {
                    toRemove.Add(folder);
                }

                foreach (var musicFolder in musicFolders)
                {
                    if (!hidden.Contains(musicFolder)) toAdd.Add(musicFolder);
                }
            }

            if (toAdd.Count == 0 && toRemove.Count == 0) return;

            using var conn = Open();
            using var tx = conn.BeginTransaction();

            foreach (var folder in toRemove)
            {
                using var del = conn.CreateCommand();
                del.Transaction = tx;
                del.CommandText = "DELETE FROM folders WHERE path = $p;";
                del.Parameters.AddWithValue("$p", folder);
                del.ExecuteNonQuery();
            }

            foreach (var folder in toAdd)
            {
                using var ins = conn.CreateCommand();
                ins.Transaction = tx;
                ins.CommandText = "INSERT OR IGNORE INTO folders (path) VALUES ($p);";
                ins.Parameters.AddWithValue("$p", folder);
                ins.ExecuteNonQuery();
            }

            tx.Commit();
        }
    }

    public static string NormalizePath(string path) => Path.TrimEndingDirectorySeparator(Path.GetFullPath(path));

    private static bool HasRegisteredAncestor(string folder, HashSet<string> folders)
    {
        var parent = Path.GetDirectoryName(folder);
        while (!string.IsNullOrEmpty(parent))
        {
            if (folders.Contains(parent)) return true;

            var next = Path.GetDirectoryName(parent);
            if (string.Equals(next, parent, StringComparison.OrdinalIgnoreCase)) break;
            parent = next;
        }
        return false;
    }
}