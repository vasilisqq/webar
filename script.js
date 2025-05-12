let camera, scene, renderer, model;
let isDragging = false;
let previousTouch;

// Инициализация
function init() {
    console.log("вапвп");
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
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // 2. Позиция камеры
    camera.position.z = 2;

    // 3. Освещение
    //const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    //scene.add(ambientLight);

    // 4. Загрузка 3D-модели
    //const loader = new THREE.GLTFLoader();
    //document.querySelector('.loading').style.display = 'block';
    
    //loader.load(
    //    'assets/models/model.glb',
    //    (gltf) => {

        //    model = gltf.scene;
         //   console.log("Позиция модели:", model.position); // Должно быть (0,0,0)
          //  console.log("Позиция камеры:", camera.position); // Должно быть (0,0,5)
            //model.scale.set(1, 1, 1);
    //        model.position.set(0,0,0);
      //      scene.add(model);
        //    document.querySelector('.loading').style.display = 'none';
    //    },
    //    undefined,
    //    (error) => {
    //        console.error('Ошибка загрузки модели:', error);
    //        alert('Ошибка загрузки 3D-модели!');
    //    }
    //);
    const geometry = new THREE.BoxGeometry(1,1,1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    console.log("куб добавлен");
    console.log(cube.position);
    // 5. Запуск камеры устройства
    const video = document.getElementById('camera-feed');
    navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
            video.srcObject = stream;
            animate();
            console.log("аырфлраолыфд");
        })
        .catch((err) => {
            console.error("Ошибка доступа к камере:", err);
            alert('Не удалось получить доступ к камере!');
        });

    // 6. Обработчики событий
    setupEventListeners();
}
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera); // Рендеринг кадра
}
// Управление объектом
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

    // Мобильные: перемещение тачем
    container.addEventListener('touchstart', (e) => {
        isDragging = true;
        previousTouch = e.touches[0];
    });

    container.addEventListener('touchend', () => isDragging = false);
    
    container.addEventListener('touchmove', (e) => {
        if (!isDragging || !model) return;
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - previousTouch.clientX;
        const deltaY = touch.clientY - previousTouch.clientY;
        
        model.position.x += deltaX * 0.01;
        model.position.y -= deltaY * 0.01;
        previousTouch = touch;
    });

    // Кнопка фотографирования
    document.getElementById('capture-btn').addEventListener('click', capturePhoto);
}

// Фотографирование
function capturePhoto() {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // Размеры как у окна
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Собираем финальное изображение
    context.drawImage(document.querySelector('#camera-feed'), 0, 0);
    context.drawImage(renderer.domElement, 0, 0);
    
    // Сохранение
    const link = document.createElement('a');
    link.download = 'ar-photo.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// Запуск приложения
window.addEventListener('load', init);
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});