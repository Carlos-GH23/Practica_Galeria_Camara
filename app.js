// Lógica PWA Cámara con galería horizontal, limpiar y cambio de cámara
const els = {
    open: document.getElementById('openCamera'),
    snap: document.getElementById('takePhoto'),
    flip: document.getElementById('switchCamera'),
    clear: document.getElementById('clearGallery'),
    container: document.getElementById('cameraContainer'),
    video: document.getElementById('video'),
    canvas: document.getElementById('canvas'),
    gallery: document.getElementById('gallery'),
};

const ctx = els.canvas.getContext('2d');

let stream = null;
let facing = 'environment'; // 'user' = frontal
const objectUrls = []; // URLs temporales (blob:) durante esta sesión

async function startCamera() {
    stopCamera();

    // Intento 1: exact facing; 2: ideal; 3: cualquiera disponible
    let constraints = { video: { facingMode: { exact: facing }, width: { ideal: 320 }, height: { ideal: 240 } }, audio: false };
    try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
        try {
            constraints = { video: { facingMode: facing }, audio: false };
            stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (e2) {
            try {
                constraints = { video: true, audio: false };
                stream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (e3) {
                console.error('No se pudo abrir cámara:', e3);
                alert('No se pudo abrir la cámara. Verifica permisos y que estés en HTTPS/localhost.');
                return;
            }
        }
    }

    els.video.srcObject = stream;
    els.container.style.display = 'block';
    els.open.textContent = 'Cámara abierta';
    els.open.disabled = true;
    updateFlipLabel();
}

function stopCamera() {
    if (stream) {
        for (const t of stream.getTracks()) t.stop();
    }
    stream = null;
    els.video.srcObject = null;
    els.container.style.display = 'none';
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
    els.canvas.width = w;
    els.canvas.height = h;
    ctx.drawImage(els.video, 0, 0, w, h);

    els.canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob); // URL temporal
        objectUrls.push(url);
        addThumb(url);

        // Auto-scroll al final para ver la última
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

    const a = document.createElement('a');
    a.href = url;
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = 'captura-' + ts + '.png';
    a.textContent = 'Descargar';

    figure.appendChild(img);
    figure.appendChild(a);
    els.gallery.appendChild(figure);
}

function clearGallery() {
    for (const u of objectUrls) URL.revokeObjectURL(u); // liberar memoria
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

// Buenas prácticas de liberación
window.addEventListener('pagehide', stopCamera);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') stopCamera(); });
window.addEventListener('beforeunload', stopCamera);
