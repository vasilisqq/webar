let camera, scene, renderer, model;
let isDragging = false;
let previousTouch;
let initialDistance = null;
let initialScale = 1;

// Инициализация
function init() {
    console.log("Initializing...23");
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
           console.log("Model position:", model.position);
           model.scale.set(1, 1, 1);
           model.position.set(0,0,0);
           scene.add(model);
           document.querySelector('.loading').style.display = 'none';
       },
       undefined,
       (error) => {
           console.error('Error loading model:', error);
           alert('Error loading 3D model!');
       }
    );

    const video = document.getElementById('camera-feed');
    navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
            video.srcObject = stream;
            animate();
        })
        .catch((err) => {
            console.error("Camera access error:", err);
            alert('Failed to access camera!');
        });

    setupEventListeners();
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

function setupEventListeners() {
    const container = document.getElementById('ar-container');
    
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

function handleTouchStart(e) {
    if (e.touches.length === 1) {
        // Одиночное касание - начало перемещения
        isDragging = true;
        previousTouch = e.touches[0];
    } else if (e.touches.length === 2) {
        // Два пальца - начало масштабирования
        isDragging = false;
        initialDistance = getDistance(e.touches[0], e.touches[1]);
        initialScale = model.scale.x;
    }
}

function handleTouchEnd(e) {
    isDragging = false;
    initialDistance = null;
}

function handleTouchMove(e) {
    if (!model) return;

    if (e.touches.length === 1 && isDragging) {
        // Перемещение одним пальцем
        const touch = e.touches[0];
        const deltaX = touch.clientX - previousTouch.clientX;
        const deltaY = touch.clientY - previousTouch.clientY;
        
        model.position.x += deltaX * 0.01;
        model.position.y -= deltaY * 0.01;
        previousTouch = touch;
    } else if (e.touches.length === 2) {
        // Масштабирование двумя пальцами
        e.preventDefault();
        const currentDistance = getDistance(e.touches[0], e.touches[1]);
        
        if (initialDistance !== null) {
            const scaleFactor = currentDistance / initialDistance;
            const newScale = initialScale * scaleFactor;
            
            // Ограничение масштаба
            model.scale.set(
                Math.min(Math.max(newScale, 0.5), 3),
                Math.min(Math.max(newScale, 0.5), 3),
                Math.min(Math.max(newScale, 0.5), 3)
            );
        }
    }
}

function getDistance(touch1, touch2) {
    return Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
    );
}

// Фотографирование (остается без изменений)
function capturePhoto() {
    renderer.render(scene, camera);
    const dpi = window.devicePixelRatio;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth * dpi;
    canvas.height = window.innerHeight * dpi;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(dpi, dpi);

    ctx.drawImage(document.querySelector('#camera-feed'), 0, 0, window.innerWidth, window.innerHeight);
    ctx.drawImage(renderer.domElement, 0, 0, window.innerWidth, window.innerHeight);

    const link = document.createElement('a');
    link.download = 'ar-photo.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

window.addEventListener('load', init);
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});