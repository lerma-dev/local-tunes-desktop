using System.ComponentModel;
using Guna.UI2.WinForms;
namespace localtunes.Forms;

partial class SplashForm
{
    private IContainer components;

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
        BtnClose = new Button();
        PboxIcono = new PictureBox();
        BtnMinimize = new Button();
        lblTitle = new Label();
        lblSubtitle = new Label();
        BorderlessSplash = new Guna2BorderlessForm(components);
        ((ISupportInitialize)PboxIcono).BeginInit();
        SuspendLayout();
        // 
        // BtnClose
        // 
        BtnClose.AccessibleName = "Cerrar";
        BtnClose.Anchor = AnchorStyles.Top | AnchorStyles.Right;
        BtnClose.BackColor = Color.Transparent;
        BtnClose.FlatAppearance.BorderSize = 0;
        BtnClose.FlatAppearance.MouseOverBackColor = Color.FromArgb(182, 68, 62);
        BtnClose.FlatStyle = FlatStyle.Flat;
        BtnClose.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
        BtnClose.ForeColor = Color.FromArgb(192, 192, 255);
        BtnClose.Location = new Point(497, 12);
        BtnClose.Name = "BtnClose";
        BtnClose.Size = new Size(32, 32);
        BtnClose.TabIndex = 0;
        BtnClose.Text = "✕";
        BtnClose.UseVisualStyleBackColor = false;
        BtnClose.Click += BtnClose_Click;
        // 
        // PboxIcono
        // 
        PboxIcono.Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right;
        PboxIcono.Image = Properties.Resources.AnimacionSplash;
        PboxIcono.Location = new Point(165, 50);
        PboxIcono.Name = "PboxIcono";
        PboxIcono.Size = new Size(198, 197);
        PboxIcono.SizeMode = PictureBoxSizeMode.StretchImage;
        PboxIcono.TabIndex = 1;
        PboxIcono.TabStop = false;
        // 
        // BtnMinimize
        // 
        BtnMinimize.AccessibleName = "Minimizar";
        BtnMinimize.Anchor = AnchorStyles.Top | AnchorStyles.Right;
        BtnMinimize.BackColor = Color.Transparent;
        BtnMinimize.FlatAppearance.BorderSize = 0;
        BtnMinimize.FlatAppearance.MouseOverBackColor = Color.FromArgb(40, 38, 60);
        BtnMinimize.FlatStyle = FlatStyle.Flat;
        BtnMinimize.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
        BtnMinimize.ForeColor = Color.FromArgb(192, 192, 255);
        BtnMinimize.Location = new Point(459, 12);
        BtnMinimize.Name = "BtnMinimize";
        BtnMinimize.Size = new Size(32, 32);
        BtnMinimize.TabIndex = 2;
        BtnMinimize.Text = "🗕";
        BtnMinimize.UseVisualStyleBackColor = false;
        BtnMinimize.Click += BtnMinimize_Click;
        // 
        // lblTitle
        // 
        lblTitle.Anchor = AnchorStyles.Bottom;
        lblTitle.Font = new Font("Segoe UI", 22F, FontStyle.Bold);
        lblTitle.ForeColor = Color.White;
        lblTitle.Location = new Point(163, 261);
        lblTitle.Name = "lblTitle";
        lblTitle.Size = new Size(202, 40);
        lblTitle.TabIndex = 3;
        lblTitle.Text = "Local Tunes";
        lblTitle.TextAlign = ContentAlignment.MiddleCenter;
        // 
        // lblSubtitle
        // 
        lblSubtitle.Anchor = AnchorStyles.Bottom;
        lblSubtitle.Font = new Font("Segoe UI", 10F);
        lblSubtitle.ForeColor = Color.FromArgb(192, 192, 255);
        lblSubtitle.Location = new Point(163, 318);
        lblSubtitle.Name = "lblSubtitle";
        lblSubtitle.Size = new Size(202, 20);
        lblSubtitle.TabIndex = 4;
        lblSubtitle.Text = "Cargando biblioteca local...";
        lblSubtitle.TextAlign = ContentAlignment.MiddleCenter;
        // 
        // BorderlessSplash
        // 
        BorderlessSplash.BorderRadius = 50;
        BorderlessSplash.ContainerControl = this;
        BorderlessSplash.DockIndicatorTransparencyValue = 0.6D;
        BorderlessSplash.ResizeForm = false;
        BorderlessSplash.TransparentWhileDrag = true;
        // 
        // SplashForm
        // 
        BackColor = Color.FromArgb(14, 12, 26);
        ClientSize = new Size(540, 366);
        Controls.Add(lblSubtitle);
        Controls.Add(lblTitle);
        Controls.Add(BtnMinimize);
        Controls.Add(PboxIcono);
        Controls.Add(BtnClose);
        ForeColor = Color.White;
        FormBorderStyle = FormBorderStyle.None;
        Icon = Properties.Resources.favicon;
        Name = "SplashForm";
        StartPosition = FormStartPosition.CenterScreen;
        Text = "Local Tunes";
        ((ISupportInitialize)PboxIcono).EndInit();
        ResumeLayout(false);
    }

    private Button BtnClose;
    private PictureBox PboxIcono;
    private Button BtnMinimize;
    private Label lblTitle;
    private Label lblSubtitle;
    private Guna2BorderlessForm BorderlessSplash;
}