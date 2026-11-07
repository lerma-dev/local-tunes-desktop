/**
 * equalizer-ui.js
 * Panel del ecualizador. Imports dinámicos para no ejecutar nada al cargar.
 */

let panelRendered = false;

// ─── API pública ──────────────────────────────────────────────────

export async function toggleEQPanel() {
    const container = document.getElementById('eq-panel-container');
    if (!container) return;

    if (!panelRendered) {
        const { BANDS } = await import('./equalizer.js');
        _renderPanel(BANDS);
        await _bindEvents();
        panelRendered = true;
    }

    const isDesktop = window.innerWidth >= 1024;

    if (!isDesktop) {
        // Móvil: abrir el reproductor full si no está visible
        const fullPlayer = document.getElementById('view-player-full');
        if (fullPlayer && !fullPlayer.classList.contains('active')) {
            fullPlayer.classList.add('active');
            const mini = document.querySelector('.mini-player');
            if (mini) mini.style.display = 'none';
            document.body.style.overflow = 'hidden';
        }
    }

    // Scroll al fondo del .full-content para mostrar el EQ
    // (scrollIntoView no funciona dentro de position:fixed)
    setTimeout(() => {
        const scrollParent = document.querySelector('.full-content');
        if (scrollParent) {
            scrollParent.scrollTo({ top: scrollParent.scrollHeight, behavior: 'smooth' });
        }
        // Resaltar el panel
        const panel = container.querySelector('.eq-panel');
        if (panel) {
            panel.classList.add('eq-panel--highlight');
            setTimeout(() => panel.classList.remove('eq-panel--highlight'), 1400);
        }
    }, isDesktop ? 60 : 450);
}

export async function initEqualizerUI() {
    if (panelRendered) return;
    const { BANDS } = await import('./equalizer.js');
    _renderPanel(BANDS);
    await _bindEvents();
    panelRendered = true;
}

// ─── Renderizado ──────────────────────────────────────────────────

function _renderPanel(BANDS) {
    const container = document.getElementById('eq-panel-container');
    if (!container) return;

    container.innerHTML = `
        <div class="eq-panel">
            <div class="eq-header">
                <div class="eq-header-title">
                    <span class="eq-icon-wrap">
                        <l-icon name="ecualizer"></l-icon>
                    </span>
                    <span class="eq-title">Ecualizador</span>
                </div>
                <div class="eq-header-controls">
                    <button class="eq-btn-8d" id="eq-btn-8d">8D</button>
                    <div class="eq-toggle-wrap">
                        <span class="eq-toggle-label">EQ</span>
                        <button class="eq-switch" id="eq-switch" role="switch" aria-checked="false">
                            <span class="eq-switch-knob"></span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="eq-bands eq-disabled" id="eq-bands">
                ${BANDS.map((b, i) => `
                <div class="eq-band">
                    <span class="eq-band-val" id="eq-val-${i}">0</span>
                    <div class="eq-slider-wrap">
                        <input
                            type="range"
                            class="eq-slider"
                            id="eq-slider-${i}"
                            min="-12" max="12" step="1" value="0"
                            style="writing-mode:vertical-lr; direction:rtl;"
                        >
                    </div>
                    <span class="eq-band-lbl">${b.label}</span>
                </div>`).join('')}
            </div>

            <div class="eq-presets">
                <select class="eq-preset-select" id="eq-preset-select">
                    <option value="">Preset...</option>
                    <option value="flat">Plano</option>
                    <option value="bass">Bass Boost</option>
                    <option value="treble">Treble Boost</option>
                    <option value="rock">Rock</option>
                    <option value="pop">Pop</option>
                    <option value="jazz">Jazz</option>
                    <option value="classic">Clásica</option>
                    <option value="vocal">Vocal</option>
                </select>
                <button class="eq-reset-btn" id="eq-reset-btn" title="Restablecer">
                    <l-icon name="refresh"></l-icon>
                </button>
            </div>
        </div>
    `;
}

// ─── Eventos ──────────────────────────────────────────────────────

async function _bindEvents() {
    const {
        toggleEqualizer, setBandGain, toggle8D,
        applyPreset, getEQState, BANDS,
    } = await import('./equalizer.js');

    document.getElementById('eq-switch')?.addEventListener('click', () => {
        const on = toggleEqualizer();
        const sw = document.getElementById('eq-switch');
        sw.classList.toggle('on', on);
        sw.setAttribute('aria-checked', on);
        document.getElementById('eq-bands')?.classList.toggle('eq-disabled', !on);
    });

    document.getElementById('eq-btn-8d')?.addEventListener('click', () => {
        const on = toggle8D();
        document.getElementById('eq-btn-8d').classList.toggle('active', on);
    });

    BANDS.forEach((_, i) => {
        document.getElementById(`eq-slider-${i}`)?.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            const lbl = document.getElementById(`eq-val-${i}`);
            if (lbl) lbl.textContent = val > 0 ? `+${val}` : `${val}`;
            setBandGain(i, val);
        });
    });

    document.getElementById('eq-preset-select')?.addEventListener('change', (e) => {
        if (!e.target.value) return;
        const { enabled } = getEQState();
        if (!enabled) {
            toggleEqualizer(true);
            const sw = document.getElementById('eq-switch');
            if (sw) { sw.classList.add('on'); sw.setAttribute('aria-checked', 'true'); }
            document.getElementById('eq-bands')?.classList.remove('eq-disabled');
        }
        applyPreset(e.target.value);
    });

    document.getElementById('eq-reset-btn')?.addEventListener('click', () => {
        applyPreset('flat');
        const sel = document.getElementById('eq-preset-select');
        if (sel) sel.value = 'flat';
    });
}