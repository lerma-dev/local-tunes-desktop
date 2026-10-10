using Microsoft.Web.WebView2.WinForms;
using System.ComponentModel;
namespace localtunes;
partial class Form1
{
    private IContainer components = null;

    protected override void Dispose(bool disposing)
    {
        if (disposing && (components != null))
        {
            components.Dispose();
        }
        base.Dispose(disposing);
    }

    #region Windows Form Designer generated code
    private void InitializeComponent()
    {
        webview = new WebView2();
        ((System.ComponentModel.ISupportInitialize)webview).BeginInit();
        SuspendLayout();

        // webview
        webview.DefaultBackgroundColor = Color.White;
        webview.Dock = DockStyle.Fill;
        webview.Location = new Point(6, 6);
        webview.TabIndex = 0;
        webview.ZoomFactor = 1D;
        webview.AllowExternalDrop = true;
        webview.Name = "webview";

        // Form1
        ClientSize = new Size(1240, 650);
        MinimumSize = new Size(500, 650);
        Padding = new Padding(6);
        Controls.Add(webview);
        BackColor = Color.FromArgb(14, 12, 26);
        ForeColor = Color.White;
        FormBorderStyle = FormBorderStyle.None;
        StartPosition = FormStartPosition.CenterScreen;
        Icon = Properties.Resources.favicon;
        Name = "Form1";
        Text = "Local Tunes";

        ((System.ComponentModel.ISupportInitialize)webview).EndInit();
        ResumeLayout(false);
    }
    #endregion

    private WebView2 webview;
}