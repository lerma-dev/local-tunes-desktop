import { createEQNodes } from './equalizer.js';

let audioCtx, analyser, source, sound;
let canvas, canvasCtx;

export function initVisualizerVar(){
  canvas = document.getElementById('visualizer');
  canvasCtx = canvas.getContext('2d');
  sound = document.getElementById('audio-engine');
}

// --- VISUALIZADOR ---
export function initVisualizer() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.AudioContext)();
  analyser = audioCtx.createAnalyser();
  source   = audioCtx.createMediaElementSource(sound);
  // ── EQ: insertar filtros y panner entre source y analyser ──
  const { filters, panner } = createEQNodes(audioCtx);
  source.connect(filters[0]);
  panner.connect(analyser);
  analyser.connect(audioCtx.destination);
  analyser.fftSize = 64;
  draw();

  // ── EQ: renderizar panel (import dinámico) ──
  import('./equalizer-ui.js').then(({ initEqualizerUI }) => initEqualizerUI());
}

function draw() {
  requestAnimationFrame(draw);
  const bufferLength = analyser.frequencyBinCount;
  const dataArray    = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
  const barWidth = (canvas.width / bufferLength) * 2.5;
  let x = 0;
  for (let i = 0; i < bufferLength; i++) {
    let barHeight = dataArray[i] / 2;
    // Gradiente por barra: violeta → rosa
    const ratio = i / bufferLength;
    const r = Math.round(167 + (232 - 167) * ratio);
    const g = Math.round(139 + (121 - 139) * ratio);
    const b = Math.round(250 + (249 - 250) * ratio);
    canvasCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.3 + (barHeight / 128) * 0.7})`;
    // Barras redondeadas en la punta
    const bx = x;
    const by = canvas.height - barHeight;
    const bw = Math.max(barWidth - 1, 1);
    const bh = barHeight;
    const radius = Math.min(4, bw / 2);
    canvasCtx.beginPath();
    canvasCtx.moveTo(bx + radius, by);
    canvasCtx.lineTo(bx + bw - radius, by);
    canvasCtx.quadraticCurveTo(bx + bw, by, bx + bw, by + radius);
    canvasCtx.lineTo(bx + bw, by + bh);
    canvasCtx.lineTo(bx, by + bh);
    canvasCtx.lineTo(bx, by + radius);
    canvasCtx.quadraticCurveTo(bx, by, bx + radius, by);
    canvasCtx.closePath();
    canvasCtx.fill();
    x += barWidth + 1;
  }
}

export function getAnalyser() { return analyser; }