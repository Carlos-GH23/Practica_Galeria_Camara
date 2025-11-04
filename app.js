// UI refs
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
let facing = 'environment';   // 'user' para frontal
const objectUrls = [];        // URLs temporales de esta sesión

// Ajusta las variables CSS --frame-w / --frame-h a partir del video real
function setFrameVarsFromVideo() {
    const vw = els.video.videoWidth || 320;
    const vh = els.video.videoHeight || 240;

    // Escala para caber en viewport, manteniendo proporción
    const maxW = Math.min(480, window.innerWidth - 48); // UI limpia sin desbordar
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

    // Asegura que el tamaño del frame se actualice cuando el video conozca sus dimensiones reales
    els.video.onloadedmetadata = () => {
        setFrameVarsFromVideo();
        els.stage.classList.add('active');
        els.open.textContent = 'Cámara abierta';
        els.open.disabled = true;
        updateFlipLabel();
    };
}

function stopCamera() {
    if (stream) {
        for (const t of stream.getTracks()) t.stop();
    }
    stream = null;
    els.video.srcObject = null;
    els.stage.classList.remove('active');
    els.open.textContent = 'Abrir cámara';
    els.open.disabled = false;
}

function updateFlipLabel() {
    els.flip.textContent = (facing === 'environment') ? 'Cambiar a frontal' : 'Cambiar a trasera';
}

// Captura y agrega a galería con MISMAS dimensiones visuales que el frame
function takePhoto() {
    if (!stream) {
        alert('Primero abre la cámara');
        return;
    }
    const w = els.video.videoWidth || 320;
    const h = els.video.videoHeight || 240;

    // Renderizamos a resolución real del frame
    els.canvas.width = w;
    els.canvas.height = h;
    ctx.drawImage(els.video, 0, 0, w, h);

    els.canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        objectUrls.push(url);
        addThumb(url);

        // auto-scroll a la última
        requestAnimationFrame(() => {
            els.gallery.scrollTo({ left: els.gallery.scrollWidth, behavior: 'smooth' });
        });
    }, 'image/png', 1.0);
}

function addThumb(url) {
    const figure = document.createElement('figure');
    figure.className = 'thumb';
    figure.setAttribute('role', 'listitem');

    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Foto capturada';
    img.decoding = 'async';

    // (opcional) descarga rápida
    // const a = document.createElement('a');
    // a.href = url;
    // a.download = 'captura-' + new Date().toISOString().replace(/[:.]/g,'-') + '.png';
    // a.textContent = 'Descargar';
    // figure.appendChild(a);

    figure.appendChild(img);
    els.gallery.appendChild(figure);
}

function clearGallery() {
    for (const u of objectUrls) URL.revokeObjectURL(u);
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

// Recalcula tamaños si cambia el viewport (mantener paridad cámara/galería)
window.addEventListener('resize', () => {
    if (stream && els.video.videoWidth) setFrameVarsFromVideo();
});

// Buenas prácticas de liberación
window.addEventListener('pagehide', stopCamera);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') stopCamera(); });
window.addEventListener('beforeunload', stopCamera);
