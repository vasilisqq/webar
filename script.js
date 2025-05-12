// Инициализация сцены, камеры и рендерера
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('scene-container').appendChild(renderer.domElement);

// Позиция камеры
camera.position.z = 5;

// Добавляем свет
const light = new THREE.AmbientLight(0xffffff, 1);
scene.add(light);

// Загрузка 3D-модели (формат GLB)
const loader = new THREE.GLTFLoader();
loader.load(
    'assets/model.glb',
    (gltf) => {
        const model = gltf.scene;
        scene.add(model);
        model.position.set(0, 0, 0);
        model.scale.set(0.5, 0.5, 0.5);
    },
    undefined,
    (error) => {
        console.error('Ошибка загрузки модели:', error);
    }
);

// Включение камеры устройства
const video = document.createElement('video');
navigator.mediaDevices.getUserMedia({ video: true })
    .then((stream) => {
        video.srcObject = stream;
        video.play();
    })
    .catch((err) => {
        console.error("Ошибка доступа к камере:", err);
    });

// Перемещение объекта мышью
document.addEventListener('mousemove', (event) => {
    const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    const model = scene.children.find(child => child.type === 'Group');
    if (model) {
        model.position.x = mouseX * 2;
        model.position.y = mouseY * 2;
    }
});

// Кнопка "Сфотографировать"
document.getElementById('capture-btn').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = '3d-photo.png';
    link.href = renderer.domElement.toDataURL('image/png');
    link.click();
});

// Анимация
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();