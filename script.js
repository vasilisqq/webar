let camera, scene, renderer, model;
let isDragging = false;
let previousTouch;
let initialDistance = null;
let initialScale = 1;
let currentVideoStream = null;
let isFrontCamera = false;
let isModelLoaded = false;

// Инициализация
function init() {
    console.log("Initializing...25");
    console.log("Initializing AR Scene");
    // 1. Настройка Three.js сцены
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    
    renderer = new THREE.WebGLRenderer({
        canvas: document.querySelector('#render-canvas'),
        alpha: true,
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // 2. Позиция камеры
    camera.position.z = 2;

    // 3. Освещение
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);

    // 4. Загрузка 3D-модели
    const loader = new THREE.GLTFLoader();
    document.querySelector('.loading').style.display = 'block';
    
    loader.load(
       'assets/models/model.glb',
       (gltf) => {
           model = gltf.scene;
           model.scale.set(1, 1, 1);
           model.position.set(0,0,0);
           scene.add(model);
           isModelLoaded = true;
           document.querySelector('.loading').style.display = 'none';
       },
       undefined,
       (error) => {
           console.error('Error loading model:', error);
           alert('Error loading 3D model!');
       }
    );

    startCamera();
    setupEventListeners();
}

function startCamera() {
    const video = document.getElementById('camera-feed');
    const constraints = {
        video: {
            facingMode: isFrontCamera ? "user" : "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 }
        }
    };

    if (currentVideoStream) {
        currentVideoStream.getTracks().forEach(track => track.stop());
    }

    navigator.mediaDevices.getUserMedia(constraints)
        .then((stream) => {
            currentVideoStream = stream;
            video.srcObject = stream;
            video.style.transform = isFrontCamera ? 'scaleX(-1)' : 'none';
            animate();
        })
        .catch((err) => {
            console.error("Camera access error:", err);
            alert('Failed to access camera!');
        });
}

function toggleCamera() {
    isFrontCamera = !isFrontCamera;
    startCamera();
}

function animate() {
    requestAnimationFrame(animate);
    if (isModelLoaded) {
        renderer.render(scene, camera);
    }
}

function setupEventListeners() {
    const container = document.getElementById('ar-container');
    
    // Кнопки управления
    document.getElementById('switch-camera').addEventListener('click', toggleCamera);
    document.getElementById('capture-btn').addEventListener('click', handleCapture);

    // Десктоп: перемещение мышью
    container.addEventListener('mousedown', () => isDragging = true);
    container.addEventListener('mouseup', () => isDragging = false);
    
    container.addEventListener('mousemove', (e) => {
        if (!isDragging || !model) return;
        
        const rect = container.getBoundingClientRect();
        model.position.x = (e.clientX - rect.left) / rect.width * 4 - 2;
        model.position.y = -(e.clientY - rect.top) / rect.height * 4 + 2;
    });

    // Мобильные: обработка жестов
    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchmove', handleTouchMove);
}

function handleCapture() {
    if (!isModelLoaded) {
        alert('Please wait until model is loaded!');
        return;
    }
    capturePhoto();
}

// Остальные функции обработки касаний остаются без изменений

function capturePhoto() {
    // Создаем временный рендерер для захвата
    const tempRenderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true
    });
    tempRenderer.setSize(window.innerWidth, window.innerHeight);
    tempRenderer.render(scene, camera);

    const video = document.getElementById('camera-feed');
    const dpi = window.devicePixelRatio;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth * dpi;
    canvas.height = window.innerHeight * dpi;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(dpi, dpi);

    // Рисуем видео
    ctx.drawImage(video, 0, 0, window.innerWidth, window.innerHeight);
    
    // Рисуем 3D-сцену поверх видео
    ctx.drawImage(tempRenderer.domElement, 0, 0);

    // Сохранение
    const link = document.createElement('a');
    link.download = `ar-photo-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    tempRenderer.dispose();
}

window.addEventListener('load', init);
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});