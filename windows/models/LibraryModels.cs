namespace localtunes.models;

public record SongInfo(
    string Title,
    string Artist,
    string Cover,
    string Album,
    double Duration,
    string Path,
    string FolderPath,
    string Src
);

public record FolderInfo(
    long Id,
    string Path,
    string Name,
    int Count,
    string MediaHost,
    List<SongInfo> Songs
);

public record LibraryPayload(string Type, List<FolderInfo> Folders);

public record LibraryMessage(string Type, string Message);

public record FolderRecord(long Id, string Path);
