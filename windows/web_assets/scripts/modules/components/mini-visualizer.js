// miniVisualizer.js
import { getAnalyser } from './visualizer.js';

let miniAnimId = null;
let isPaused = false;
let currentCanvas = null;

export function initMiniVisualizer(canvas) {
    currentCanvas = canvas; //guardar referencia
    isPaused = false;
    const analyser = getAnalyser();
    if (!analyser || !canvas) return;

    if (miniAnimId) cancelAnimationFrame(miniAnimId);
    const ctx = canvas.getContext('2d');

    function draw() {
        miniAnimId = requestAnimationFrame(draw);
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = (canvas.width / (bufferLength / 3)) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i+= 6) {
            const barHeight = dataArray[i] / 3;
            const ratio = i / bufferLength;
            const r = Math.round(167 + (232 - 167) * ratio);
            const g = Math.round(139 + (121 - 139) * ratio);
            const b = Math.round(250 + (249 - 250) * ratio);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.3 + (barHeight / 128) * 0.7})`;

            const radius = Math.min(2, barWidth / 2);
            ctx.beginPath();
            ctx.moveTo(x + radius, canvas.height - barHeight);
            ctx.lineTo(x + barWidth - radius, canvas.height - barHeight);
            ctx.quadraticCurveTo(x + barWidth, canvas.height - barHeight, x + barWidth, canvas.height - barHeight + radius);
            ctx.lineTo(x + barWidth, canvas.height);
            ctx.lineTo(x, canvas.height);
            ctx.lineTo(x, canvas.height - barHeight + radius);
            ctx.quadraticCurveTo(x, canvas.height - barHeight, x + radius, canvas.height - barHeight);
            ctx.closePath();
            ctx.fill();

            x += barWidth + 1;
        }
    }
    draw();
}

export function pauseMiniVisualizer() {
    isPaused = true;
    if (miniAnimId) {
        cancelAnimationFrame(miniAnimId);
        miniAnimId = null;
    }
}

export function resumeMiniVisualizer() {
    if (isPaused && currentCanvas) {
        isPaused = false;
        initMiniVisualizer(currentCanvas);
    }
}

export function stopMiniVisualizer() {
    if (miniAnimId) {
        cancelAnimationFrame(miniAnimId);
        miniAnimId = null;
    }
}