// --- UTILIDADES ---

export function applyMarqueeIfNeeded(element) {
    if (!element) return;
    const container = element.parentElement;
    element.classList.remove('animate-marquee');
    if (element.scrollWidth > container.clientWidth) {
        element.classList.add('animate-marquee');
    }
}

export function escapeJS(str) {
    return String(str ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\r/g, "\\r")
        .replace(/\n/g, "\\n");
}

// ID de favorito compatible con la app web: "Carpeta-Título" (sin rutas).
// Los builds intermedios guardaron la ruta completa ("C:\\...\\Rock-Título");
// aquí se recupera el formato web al cargar o importar un backup.
export function normalizeFavoriteId(favId) {
    if (typeof favId !== "string") return favId;
    if (!/^[A-Za-z]:\\|^\\\\/.test(favId)) return favId;

    const cut = favId.lastIndexOf("\\");
    return cut >= 0 ? favId.slice(cut + 1) : favId;
}

export function formatTime(s) {
    const m = Math.floor(s / 60);
    const sc = Math.floor(s % 60);
    return `${m}:${sc < 10 ? '0' : ''}${sc}`;
}
