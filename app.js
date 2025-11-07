// Refs
const els = {
    open: document.getElementById('openCamera'),
    snap: document.getElementById('takePhoto'),
    flip: document.getElementById('switchCamera'),
    clear: document.getElementById('clearGallery'),
    stage: document.getElementById('cameraContainer'),
    video: document.getElementById('video'),
    canvas: document.getElementById('canvas'),
    gallery: document.getElementById('gallery'),
};
const ctx = els.canvas.getContext('2d');

let stream = null;
let facing = 'environment';     // 'user' para frontal
const objectUrls = [];          // URLs temporales (blob:) de esta sesión

// Ajusta variables CSS --frame-w / --frame-h a partir de las dimensiones reales del video
function setFrameVarsFromVideo() {
    const vw = els.video.videoWidth || 320;
    const vh = els.video.videoHeight || 240;

    // Escala para caber en viewport, manteniendo proporción (misma escala para marco y thumbs)
    const maxW = Math.min(480, window.innerWidth - 48);
    const scale = Math.min(1, maxW / vw);
    const dispW = Math.round(vw * scale);
    const dispH = Math.round(vh * scale);

    document.documentElement.style.setProperty('--frame-w', dispW + 'px');
    document.documentElement.style.setProperty('--frame-h', dispH + 'px');
}

async function startCamera() {
    stopCamera(); // por si acaso

    let constraints = { video: { facingMode: { exact: facing }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false };
    try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch {
        try {
            constraints = { video: { facingMode: facing }, audio: false };
            stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch {
            constraints = { video: true, audio: false };
            stream = await navigator.mediaDevices.getUserMedia(constraints);
        }
    }

    els.video.srcObject = stream;

    // Cuando el video tenga sus dimensiones reales, sincronizamos tamaños
    els.video.onloadedmetadata = () => {
        setFrameVarsFromVideo();
        els.stage.classList.add('active');
        els.open.textContent = 'Cámara abierta';
        els.open.disabled = true;
        updateFlipLabel();
    };
}

function stopCamera() {
    if (stream) for (const t of stream.getTracks()) t.stop();
    stream = null;
    els.video.srcObject = null;
    els.stage.classList.remove('active');
    els.open.textContent = 'Abrir cámara';
    els.open.disabled = false;
}

function updateFlipLabel() {
    els.flip.textContent = (facing === 'environment') ? 'Cambiar a frontal' : 'Cambiar a trasera';
}

function takePhoto() {
    if (!stream) {
        alert('Primero abre la cámara');
        return;
    }

    const w = els.video.videoWidth || 320;
    const h = els.video.videoHeight || 240;

    // Renderizamos a la resolución real capturada
    els.canvas.width = w;
    els.canvas.height = h;
    ctx.drawImage(els.video, 0, 0, w, h);

    els.canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob); // URL temporal (blob:)
        objectUrls.push(url);
        addThumb(url);

        // Auto scroll al final (última imagen)
        requestAnimationFrame(() => {
            els.gallery.scrollTo({ left: els.gallery.scrollWidth, behavior: 'smooth' });
        });
    }, 'image/png', 1.0);
}

function addThumb(url) {
    // Cada thumb usa las MISMAS dimensiones visuales que el marco (definidas por --frame-w/h)
    const figure = document.createElement('figure');
    figure.className = 'thumb';
    figure.setAttribute('role', 'listitem');

    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Foto capturada';
    img.decoding = 'async';

    // Botón de descarga superpuesto (no altera el alto del thumb)
    const a = document.createElement('a');
    a.href = url;
    a.download = 'captura-' + new Date().toISOString().replace(/[:.]/g, '-') + '.png';
    a.textContent = 'Descargar';
    a.className = 'dl';
    a.setAttribute('aria-label', 'Descargar foto');

    figure.appendChild(img);
    figure.appendChild(a);
    els.gallery.appendChild(figure);
}

function clearGallery() {
    for (const u of objectUrls) URL.revokeObjectURL(u); // libera memoria de blobs
    objectUrls.length = 0;
    els.gallery.innerHTML = '';
}

async function flipCamera() {
    facing = (facing === 'environment') ? 'user' : 'environment';
    updateFlipLabel();
    await startCamera();
}

// Eventos
els.open.addEventListener('click', startCamera);
els.snap.addEventListener('click', takePhoto);
els.clear.addEventListener('click', clearGallery);
els.flip.addEventListener('click', flipCamera);

// Mantener dimensiones sincronizadas si cambia el viewport
window.addEventListener('resize', () => {
    if (stream && els.video.videoWidth) setFrameVarsFromVideo();
});

// Buenas prácticas: liberar cámara al salir/ocultar
window.addEventListener('pagehide', stopCamera);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') stopCamera(); });
window.addEventListener('beforeunload', stopCamera);
