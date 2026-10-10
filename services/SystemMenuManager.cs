using localtunes.utils;
namespace localtunes.services;

public class SystemMenuManager(Form _form)
{
    private ContextMenuStrip? _menu;

    public void Show(int x, int y){
        CloseMenu();
        _menu = new ContextMenuStrip();
        _menu.RenderMode = ToolStripRenderMode.System;
        var isMaximized = _form.WindowState == FormWindowState.Maximized;
        var isMinimized = _form.WindowState == FormWindowState.Minimized;

        // Restaurar
        var itemRestore = new ToolStripMenuItem("Restaurar");
        itemRestore.Image = Properties.Resources.restored;
        itemRestore.Enabled = isMaximized || isMinimized;
        itemRestore.Click += (s, e) => {
            _form.WindowState = FormWindowState.Normal;
        };

        // Mover
        var itemMove = new ToolStripMenuItem("Mover");
        itemMove.Enabled = !isMaximized;
        itemMove.Click += (s, e) => {
            NativeMethods.PostMessage(_form.Handle, NativeMethods.WM_SYSCOMMAND, (IntPtr)0xF010, IntPtr.Zero);
        };

        // Tamaño
        var itemSize = new ToolStripMenuItem("Tamaño");
        itemSize.Enabled = !isMaximized;
        itemSize.Click += (s, e) => {
            NativeMethods.PostMessage(_form.Handle, NativeMethods.WM_SYSCOMMAND, (IntPtr)0xF000, IntPtr.Zero);
        };

        // Minimizar
        var itemMinimize = new ToolStripMenuItem("Minimizar");
        itemMinimize.Image = Properties.Resources.minimize;
        itemMinimize.Enabled = !isMinimized;
        itemMinimize.Click += (s, e) => {
            _form.WindowState = FormWindowState.Minimized;
        };

        // Maximizar
        var itemMaximize = new ToolStripMenuItem("Maximizar");
        itemMaximize.Image = Properties.Resources.maximize;
        itemMaximize.Enabled = !isMaximized;
        itemMaximize.Click += (s, e) => {
            _form.WindowState = FormWindowState.Maximized;
        };

        // Separador
        var separator = new ToolStripSeparator();

        // Cerrar
        var itemClose = new ToolStripMenuItem("Cerrar");
        itemClose.Image = Properties.Resources.close;
        itemClose.ShortcutKeyDisplayString = "Alt+F4";
        itemClose.Click += (s, e) => {
            _form.Hide();
            _form.ShowInTaskbar = false;
        };

        _menu.Items.AddRange(new ToolStripItem[] {
            itemRestore,
            itemMove,
            itemSize,
            itemMinimize,
            itemMaximize,
            separator,
            itemClose
        });
        _menu.Show(x, y);
    }

    public void CloseMenu() {
        if (_menu != null)
        {
            if (_menu.Visible)
            {
                _menu.Close();
            }
            _menu.Dispose();
            _menu = null;
        }
    }
}