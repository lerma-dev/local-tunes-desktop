using localtunes.Forms;
using localtunes.models;
using Microsoft.VisualBasic.FileIO;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace localtunes.services;

public class WebCommandHandler(MainForm _form, WebView2 _webview, LibraryDatabase _library)
{
    // Reutilización de opciones de deserialización para mejorar el rendimiento
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private static readonly JsonSerializerOptions PostOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    // Evita que un escaneo viejo sobrescriba uno más reciente
    private int _scanVersion;

    // Después de "Borrar Carpetas" no volvemos a agregar Music hasta reiniciar.
    private bool _skipDefaultMusicUntilRestart;

    public void ProcessCommand(string json)
    {
        try
        {
            var message = JsonSerializer.Deserialize<WebMessage>(json, JsonOptions);

            if (message == null || string.IsNullOrEmpty(message.Action)) return;

            _form.BeginInvoke(new MethodInvoker(() =>
            {
                RunAction(message);
            }));
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"Error procesando comando: {ex.Message}");
        }
    }

    private void RunAction(WebMessage ms)
    {
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
                if (isMaximized)
                {
                    _form.WindowState = FormWindowState.Normal;
                }
                else
                {
                    _form.WindowState = FormWindowState.Maximized;
                }
                break;
            case "custom_bar":
            case "native_bar":
                _form.FormBorderStyle = FormBorderStyle.None;
                _form.Padding = new Padding(6);
                break;
            case "sync_background_color":
                if (!string.IsNullOrEmpty(ms.Color))
                {
                    var color = ColorTranslator.FromHtml(ms.Color);
                    _form.BackColor = color;
                    // Mantiene el fondo del WebView2 igual al del tema (evita el flash blanco).
                    _webview.DefaultBackgroundColor = color;
                }
                break;
            case "show_system_menu":
                _form.Activate();
                _form.MenuSystem(ms.ScreenX, ms.ScreenY);
                break;
            case "pick_folder":
                PickFolder();
                break;
            case "get_library":
            case "rescan_library":
                SendLibrary();
                break;
            case "remove_folder":
                RemoveFolder(ms.Path);
                break;
            case "clear_folders":
                ClearFolders();
                break;
            case "edit_song":
                EditSong(ms.Path, ms.Title, ms.Artist);
                break;
            case "delete_song":
                DeleteSong(ms.Path);
                break;
            case "trash_list":
                SendTrashList();
                break;
            case "trash_restore":
                RestoreFromTrash(ms.Path);
                break;
            case "trash_empty":
                EmptyTrash();
                break;
            default:
                Debug.WriteLine($"Acción desconocida: {ms.Action}");
                break;
        }
    }

    private void PickFolder()
    {
        using var dialog = new FolderBrowserDialog
        {
            Description = "Selecciona la carpeta con tu música",
            UseDescriptionForTitle = true,
            ShowNewFolderButton = false,
        };
        if (dialog.ShowDialog(_form) != DialogResult.OK) return;

        var path = LibraryDatabase.NormalizePath(dialog.SelectedPath);

        // Si se selecciona una carpeta padre, cada subcarpeta con música se agrega
        // como una tarjeta independiente. Si la carpeta seleccionada tiene audio
        // directo también se agrega, pero sin incluir el audio de sus subcarpetas.
        var musicFolders = LibraryScanner.FindMusicFolders(path);
        var targets = musicFolders.Count > 0 ? musicFolders : new List<string> { path };

        var added = false;
        foreach (var target in targets)
        {
            if (_library.AddFolder(target, restoreHidden: true))
            {
                RegisterFolderMapping(target);
                added = true;
            }
        }

        PostToWeb(new { type = "folder_added", path, added });
        SendLibrary();
    }

    private void RemoveFolder(string path)
    {
        if (string.IsNullOrWhiteSpace(path)) return;

        var normalized = LibraryDatabase.NormalizePath(path);
        var removed = _library.RemoveFolder(normalized);
        UnregisterFolderMapping(normalized);

        PostToWeb(new { type = "folder_removed", path = normalized, removed });
        SendLibrary();
    }

    private void ClearFolders()
    {
        foreach (var folder in _library.GetFolders())
        {
            UnregisterFolderMapping(folder);
        }

        _library.ClearFolders();
        _skipDefaultMusicUntilRestart = true;
        PostToWeb(new { type = "folders_cleared" });
        SendLibrary();
    }

    private void EditSong(string path, string title, string artist)
    {
        if (string.IsNullOrWhiteSpace(path) || !File.Exists(path))
        {
            PostError("La canción ya no existe en el disco.");
            return;
        }

        try
        {
            using var tagFile = TagLib.File.Create(path);
            tagFile.Tag.Title = title?.Trim() ?? string.Empty;
            tagFile.Tag.Performers = string.IsNullOrWhiteSpace(artist)
                ? Array.Empty<string>()
                : new[] { artist.Trim() };
            tagFile.Save();

            SendLibrary();
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[edit] {ex.Message}");
            PostError("No se pudieron guardar los metadatos de la canción.");
        }
    }

    private void DeleteSong(string path)
    {
        if (string.IsNullOrWhiteSpace(path) || !File.Exists(path))
        {
            PostError("La canción ya no existe en el disco.");
            return;
        }

        try
        {
            // La canción no se borra: se mueve a la Papelera de la app
            // (%LocalAppData%\Local Tunes\Papelera) para poder restaurarla.
            var trashed = TrashService.TryMoveToTrash(path);

            if (!trashed)
            {
                // Respaldo: si no se pudo mover, se usa la papelera del sistema.
                FileSystem.DeleteFile(
                    path,
                    UIOption.OnlyErrorDialogs,
                    RecycleOption.SendToRecycleBin);
            }

            PostToWeb(new { type = "song_deleted", path, trash = trashed });
            SendLibrary();
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[delete] {ex.Message}");
            PostError("No se pudo eliminar la canción.");
        }
    }

    private void SendTrashList()
    {
        Task.Run(() =>
        {
            TrashService.PurgeExpiredSafe();
            return TrashService.List();
        })
            .ContinueWith(task =>
            {
                RunOnUi(() =>
                {
                    if (task.IsFaulted)
                    {
                        Debug.WriteLine($"[trash] {task.Exception.GetBaseException().Message}");
                        PostToWeb(new
                        {
                            type = "trash_error",
                            message = "No se pudo leer la Papelera.",
                        });
                        return;
                    }

                    PostToWeb(new
                    {
                        type = "trash_list",
                        path = TrashService.TrashPath,
                        maxDays = TrashService.MaxDays,
                        items = task.Result,
                    });
                });
            }, TaskScheduler.Default);
    }

    private void RestoreFromTrash(string trashPath)
    {
        Task.Run(() => TrashService.Restore(trashPath ?? string.Empty))
            .ContinueWith(task =>
            {
                RunOnUi(() =>
                {
                    if (task.IsFaulted)
                    {
                        Debug.WriteLine($"[trash] {task.Exception?.GetBaseException().Message}");
                        PostToWeb(new
                        {
                            type = "trash_error",
                            message = "No se pudo restaurar la canción.",
                        });
                        return;
                    }

                    var result = task.Result;
                    if (!result.Ok)
                    {
                        PostToWeb(new { type = "trash_error", message = result.Message });
                        return;
                    }

                    PostToWeb(new { type = "trash_restored", path = result.RestoredPath });
                    SendLibrary();
                });
            }, TaskScheduler.Default);
    }

    private void EmptyTrash()
    {
        Task.Run(() => TrashService.Empty())
            .ContinueWith(task =>
            {
                RunOnUi(() =>
                {
                    if (task.IsFaulted)
                    {
                        Debug.WriteLine($"[trash] {task.Exception?.GetBaseException().Message}");
                        PostToWeb(new
                        {
                            type = "trash_error",
                            message = "No se pudo vaciar la Papelera.",
                        });
                        return;
                    }

                    PostToWeb(new { type = "trash_emptied", count = task.Result });
                });
            }, TaskScheduler.Default);
    }

    private void SendLibrary()
    {
        var version = ++_scanVersion;
        PostToWeb(new { type = "library_loading" });

        Task.Run(() =>
        {
            // Los archivos de la Papelera con más de 30 días se van a la
            // papelera del sistema en cada escaneo.
            TrashService.PurgeExpiredSafe();

            if (!_skipDefaultMusicUntilRestart)
            {
                try
                {
                    EnsureDefaultMusic();
                }
                catch (Exception ex)
                {
                    Debug.WriteLine($"[default-music] {ex.Message}");
                }
            }

            // Separa las carpetas padre en las subcarpetas que realmente tienen música.
            try
            {
                _library.ExpandFolders();
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[expand] {ex.Message}");
            }

            var folders = _library.GetFolderRecords();
            return new LibraryPayload("library", LibraryScanner.ScanAll(folders));
        })
            .ContinueWith(task =>
            {
                if (task.IsFaulted)
                {
                    var message = task.Exception?.GetBaseException().Message
                        ?? "Error desconocido al escanear las carpetas.";
                    Debug.WriteLine($"[library] {message}");
                    RunOnUi(() =>
                    {
                        if (version != _scanVersion) return;
                        PostError("No se pudieron escanear las carpetas de música.");
                    });
                    return;
                }

                RunOnUi(() =>
                {
                    if (version != _scanVersion) return;

                    // Las carpetas detectadas automáticamente también necesitan su
                    // host virtual para que el audio se pueda reproducir.
                    foreach (var folder in task.Result.Folders)
                    {
                        RegisterFolderMapping(folder.Path);
                    }

                    PostToWeb(task.Result);
                });
            }, TaskScheduler.Default);
    }

    /// <summary>
    /// Detecta la carpeta Música del usuario (C:\Users\usuario\Music) al abrir la app.
    /// Solo se agregan carpetas que contengan audio; si está vacía no se muestra nada.
    /// </summary>
    private void EnsureDefaultMusic()
    {
        var myMusic = Environment.GetFolderPath(Environment.SpecialFolder.MyMusic);
        if (string.IsNullOrWhiteSpace(myMusic)) return;

        if (!Directory.Exists(myMusic))
        {
            // La carpeta Música ya no existe: quita cualquier tarjeta antigua.
            _library.DeleteFoldersUnder(myMusic);
            return;
        }

        var musicFolders = LibraryScanner.FindMusicFolders(myMusic);
        if (musicFolders.Count == 0)
        {
            // La carpeta Música existe pero no tiene audio: no debe mostrarse,
            // ni ella ni las subcarpetas que ya se habían detectado.
            _library.DeleteFoldersUnder(myMusic);
            return;
        }

        foreach (var folder in musicFolders)
        {
            _library.AddFolder(folder, restoreHidden: false, isDefault: true);
        }
    }

    public void RegisterFolderMappings()
    {
        foreach (var folder in _library.GetFolders())
        {
            RegisterFolderMapping(folder);
        }

        Directory.CreateDirectory(LibraryScanner.CoversFolder);
        _webview.CoreWebView2.SetVirtualHostNameToFolderMapping(
            "covers.localtunes",
            LibraryScanner.CoversFolder,
            CoreWebView2HostResourceAccessKind.Allow
        );
    }

    private void RegisterFolderMapping(string path)
    {
        if (_webview.CoreWebView2 == null) return;  

        try
        {
            _webview.CoreWebView2.SetVirtualHostNameToFolderMapping(
                LibraryScanner.MediaHostFor(path),
                path,                             
                CoreWebView2HostResourceAccessKind.Allow
            );
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[media] No se pudo mapear {path}: {ex.Message}");
        }
    }

    private void UnregisterFolderMapping(string path)
    {
        if (_webview.CoreWebView2 == null) return;

        try
        {
            _webview.CoreWebView2.ClearVirtualHostNameToFolderMapping(
                LibraryScanner.MediaHostFor(path));
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[media] No se pudo desmapear {path}: {ex.Message}");
        }
    }

    private void RunOnUi(Action action)
    {
        if (_form.IsDisposed) return;

        try
        {
            _form.BeginInvoke(new MethodInvoker(action));
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[ui] {ex.Message}");
        }
    }

    private void PostError(string message)
    {
        PostToWeb(new LibraryMessage("library_error", message));
    }

    private void PostToWeb(object message)
    {
        if (_webview.CoreWebView2 == null) return;

        try
        {
            _webview.CoreWebView2.PostWebMessageAsJson(
                JsonSerializer.Serialize(message, PostOptions));
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[web] {ex.Message}");
        }
    }
}