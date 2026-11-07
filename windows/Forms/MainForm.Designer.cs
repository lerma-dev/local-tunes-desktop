using Microsoft.Web.WebView2.WinForms;
using Guna.UI2.WinForms;
using System.ComponentModel;
namespace localtunes.Forms;

partial class MainForm
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

    private void InitializeComponent()
    {
        components = new Container();
        webview = new WebView2();
        BorderlessMainForm = new Guna2BorderlessForm(components);
        ((ISupportInitialize)webview).BeginInit();
        SuspendLayout();
        // 
        // webview
        // 
        webview.AllowExternalDrop = true;
        webview.CreationProperties = null;
        webview.DefaultBackgroundColor = Color.FromArgb(14, 12, 26);
        webview.Dock = DockStyle.Fill;
        webview.Location = new Point(6, 6);
        webview.Margin = new Padding(0);
        webview.Name = "webview";
        webview.Size = new Size(788, 461);
        webview.TabIndex = 0;
        webview.ZoomFactor = 1D;
        // 
        // BorderlessMainForm
        // 
        BorderlessMainForm.BorderRadius = 25;
        BorderlessMainForm.ContainerControl = this;
        BorderlessMainForm.DockIndicatorTransparencyValue = 0.6D;
        BorderlessMainForm.TransparentWhileDrag = true;
        // 
        // MainForm
        // 
        BackColor = Color.FromArgb(14, 12, 26);
        ClientSize = new Size(800, 480);
        Controls.Add(webview);
        ForeColor = Color.White;
        FormBorderStyle = FormBorderStyle.None;
        Icon = Properties.Resources.favicon;
        Name = "MainForm";
        Padding = new Padding(6);
        StartPosition = FormStartPosition.CenterScreen;
        Text = "Local Tunes";
        ((ISupportInitialize)webview).EndInit();
        ResumeLayout(false);
    }

    private WebView2 webview;
    private Guna2BorderlessForm BorderlessMainForm;
}