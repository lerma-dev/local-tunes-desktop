/**
 * equalizer.js
 * Ecualizador 6 bandas + efecto 8D
 *
 * Se integra con visualizer.js: llama a createEQNodes(audioCtx)
 * y player.js construye la cadena: source → filters → panner → analyser → destination
 */

export const BANDS = [
    { freq: 60,    type: 'lowshelf',  gain: 0, label: '60'  },
    { freq: 250,   type: 'peaking',   gain: 0, label: '250' },
    { freq: 1000,  type: 'peaking',   gain: 0, label: '1k'  },
    { freq: 4000,  type: 'peaking',   gain: 0, label: '4k'  },
    { freq: 8000,  type: 'peaking',   gain: 0, label: '8k'  },
    { freq: 16000, type: 'highshelf', gain: 0, label: '16k' },
];

export const PRESETS = {
    flat:    [  0,  0,  0,  0,  0,  0 ],
    bass:    [  8,  5,  1, -1, -1, -1 ],
    treble:  [ -2, -1,  0,  2,  5,  6 ],
    rock:    [  5,  3,  0, -1,  2,  4 ],
    pop:     [ -1,  3,  5,  3, -1, -2 ],
    jazz:    [  4,  3,  1,  2,  3,  2 ],
    classic: [  3,  2,  0, -1,  1,  3 ],
    vocal:   [ -3,  0,  4,  3,  1, -1 ],
};

// Estado interno
const eq = {
    filters:     [],
    panner:      null,
    panInterval: null,
    enabled:     false,
    is8D:        false,
};

/**
 * Crea los nodos de audio y los conecta en cadena entre sí.
 * Devuelve { filters, panner } para que visualizer.js arme la cadena completa.
 * Solo se ejecuta UNA vez (se guarda en eq).
 * @param {AudioContext} audioCtx
 * @returns {{ filters: BiquadFilterNode[], panner: PannerNode }}
 */
export function createEQNodes(audioCtx) {
    if (eq.filters.length > 0) return { filters: eq.filters, panner: eq.panner };

    // Crear 6 filtros BiquadFilter
    eq.filters = BANDS.map(band => {
        const f = audioCtx.createBiquadFilter();
        f.type            = band.type;
        f.frequency.value = band.freq;
        f.gain.value      = 0;   // neutro al inicio
        f.Q.value         = 1.4;
        return f;
    });

    // Conectar filtros en serie entre sí: f[0] → f[1] → ... → f[5]
    for (let i = 0; i < eq.filters.length - 1; i++) {
        eq.filters[i].connect(eq.filters[i + 1]);
    }

    // Crear PannerNode HRTF para 8D
    eq.panner = audioCtx.createPanner();
    eq.panner.panningModel  = 'HRTF';
    eq.panner.distanceModel = 'inverse';
    eq.panner.refDistance   = 1;
    eq.panner.positionX.value = 0;
    eq.panner.positionY.value = 0;
    eq.panner.positionZ.value = 1;

    // Último filtro → panner
    eq.filters[eq.filters.length - 1].connect(eq.panner);

    return { filters: eq.filters, panner: eq.panner };
}

// ─── CONTROL EQ ───────────────────────────────────────────────────

/**
 * Activa o desactiva el ecualizador.
 * Al desactivar pone todas las ganancias en 0 (sonido plano).
 */
export function toggleEqualizer(forceState) {
    eq.enabled = (forceState !== undefined) ? forceState : !eq.enabled;

    eq.filters.forEach((filter, i) => {
        const slider = document.getElementById(`eq-slider-${i}`);
        const val    = slider ? parseFloat(slider.value) : 0;
        filter.gain.value = eq.enabled ? val : 0;
    });

    return eq.enabled;
}

/**
 * Cambia la ganancia de una banda.
 * @param {number} index  0-5
 * @param {number} value  -12 a +12 dB
 */
export function setBandGain(index, value) {
    if (!eq.filters[index]) return;
    if (eq.enabled) eq.filters[index].gain.value = value;
}

/**
 * Aplica un preset por nombre.
 */
export function applyPreset(name) {
    const gains = PRESETS[name] || PRESETS.flat;
    gains.forEach((gain, i) => {
        const slider = document.getElementById(`eq-slider-${i}`);
        if (slider) {
            slider.value = gain;
            slider.dispatchEvent(new Event('input'));
        }
        if (eq.filters[i]) {
            eq.filters[i].gain.value = eq.enabled ? gain : 0;
        }
    });
}

// ─── EFECTO 8D ────────────────────────────────────────────────────

/**
 * Activa / desactiva el paneo circular HRTF (efecto 8D).
 */
export function toggle8D(forceState) {
    eq.is8D = (forceState !== undefined) ? forceState : !eq.is8D;
    eq.is8D ? _start8D() : _stop8D();
    return eq.is8D;
}

function _start8D() {
    if (eq.panInterval) return;
    let angle = 0;
    const R   = 4;
    const SPD = 0.015; // radianes por frame ≈ 0.86° a 60fps
    eq.panInterval = setInterval(() => {
        angle = (angle + SPD) % (Math.PI * 2);
        if (eq.panner) {
            eq.panner.positionX.value = Math.sin(angle) * R;
            eq.panner.positionZ.value = Math.cos(angle) * R;
        }
    }, 16);
}

function _stop8D() {
    clearInterval(eq.panInterval);
    eq.panInterval = null;
    if (eq.panner) {
        eq.panner.positionX.value = 0;
        eq.panner.positionZ.value = 1;
    }
}

export function getEQState() {
    return { enabled: eq.enabled, is8D: eq.is8D };
}