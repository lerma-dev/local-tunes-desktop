namespace localtunes.models;

public class WebMessage
{
    public string Action { get; set; }
    public string Color { get; set; }
    public int ScreenX { get; set; }
    public int ScreenY { get; set; }

    // Biblioteca local
    public string Path { get; set; }
    public string Title { get; set; }
    public string Artist { get; set; }
}
