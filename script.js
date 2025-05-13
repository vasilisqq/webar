let camera, scene, renderer, model;
let isDragging = false;
let previousTouch;
let currentVideoStream = null;
let isFrontCamera = false;
let isModelLoaded = false;


let gestureState = {
  initialDistance: null,
  initialScale: 1,
  initialAngle: null,
  initialRotation: 0,
  isGestureActive: false
};

const ROTATION_SPEED = 0.05;
const ROTATION_SENSITIVITY = 0.1;
const SCALE_LIMITS = { min: 0.5, max: 5 };

// Инициализация
function init() {
  console.log("Initializing...38");
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
    canvas: document.querySelector("#render-canvas"),
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
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
  document.querySelector(".loading").style.display = "block";

  loader.load(
    "assets/models/model.glb",
    (gltf) => {
      model = gltf.scene;
      model.scale.set(1, 1, 1);
      model.position.set(0, 0, 0);
      model.rotation.order = 'YXZ';
      scene.add(model);
      isModelLoaded = true;
      document.querySelector(".loading").style.display = "none";
    },
    undefined,
    (error) => {
      console.error("Error loading model:", error);
      alert("Error loading 3D model!");
    }
  );
  startCamera();
  setupEventListeners();
}

function startCamera() {
  const video = document.getElementById("camera-feed");
  const constraints = {
    video: {
      facingMode: isFrontCamera ? "user" : "environment",
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  };

  if (currentVideoStream) {
    currentVideoStream.getTracks().forEach((track) => track.stop());
  }

  navigator.mediaDevices
    .getUserMedia(constraints)
    .then((stream) => {
      currentVideoStream = stream;
      video.srcObject = stream;
      video.style.transform = isFrontCamera ? "scaleX(-1)" : "none";
      animate();
    })
    .catch((err) => {
      console.error("Camera access error:", err);
      alert("Failed to access camera!");
    });
    document.getElementById('switch-camera').style.display = 'block'; // Добавьте эту строку
    
    navigator.mediaDevices.getUserMedia(constraints)
        .then((stream) => {
            // ... существующий код ...
            document.getElementById('switch-camera').style.opacity = '1'; // И эту
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
function handleTouchStart(e) {
  if (!isModelLoaded) return;
  
  if (e.touches.length === 1) {
    isDragging = true;
    previousTouch = e.touches[0];
  } else if (e.touches.length === 2) {
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    
    gestureState.initialDistance = getDistance(touch1, touch2);
    gestureState.initialScale = model.scale.x;
    gestureState.initialAngle = getAngle(touch1, touch2);
    gestureState.initialRotation = model.rotation.y;
    gestureState.isGestureActive = true;
    
    e.preventDefault();
  }
}

function handleTouchEnd(e) {
  isDragging = false;
  gestureState.isGestureActive = false;
  gestureState.initialDistance = null;
  gestureState.initialAngle = null;
}

function handleTouchMove(e) {
  if (!isModelLoaded || !gestureState.isGestureActive) return;

  if (e.touches.length === 1 && isDragging) {
    const touch = e.touches[0];
    const deltaX = touch.clientX - previousTouch.clientX;
    const deltaY = touch.clientY - previousTouch.clientY;
    
    model.position.x += deltaX * 0.01;
    model.position.y -= deltaY * 0.01;
    previousTouch = touch;
    
  } else if (e.touches.length === 2) {
    e.preventDefault();
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    
    const currentDistance = getDistance(touch1, touch2);
    const currentAngle = getAngle(touch1, touch2);
    
    // Масштабирование
    if (gestureState.initialDistance !== null && currentDistance > 0) {
      const scaleFactor = currentDistance / gestureState.initialDistance;
      const newScale = Math.min(
        Math.max(gestureState.initialScale * scaleFactor, SCALE_LIMITS.min), 
        SCALE_LIMITS.max
      );
      model.scale.set(newScale, newScale, newScale);
    }
    
    // Вращение
    if (gestureState.initialAngle !== null) {
      const angleDelta = currentAngle - gestureState.initialAngle;
      model.rotation.y = gestureState.initialRotation + angleDelta * ROTATION_SENSITIVITY;
    }
    
    // Обновление начальных значений
    gestureState.initialDistance = currentDistance;
    gestureState.initialAngle = currentAngle;
    gestureState.initialRotation = model.rotation.y;
  }
}
function getAngle(touch1, touch2) {
  const dx = touch2.clientX - touch1.clientX;
  const dy = touch2.clientY - touch1.clientY;
  return Math.atan2(dy, dx);
}

function getDistance(touch1, touch2) {
  return Math.hypot(
    touch2.clientX - touch1.clientX,
    touch2.clientY - touch1.clientY
  );
}

function setupEventListeners() {
  const container = document.getElementById("ar-container");

  // Кнопки управления
  document
    .getElementById("switch-camera")
    .addEventListener("click", toggleCamera);
  document
    .getElementById("capture-btn")
    .addEventListener("click", handleCapture);

  // Десктоп: перемещение мышью
  container.addEventListener("mousedown", () => (isDragging = true));
  container.addEventListener("mouseup", () => (isDragging = false));

  container.addEventListener("mousemove", (e) => {
    if (!isDragging || !model) return;

    const rect = container.getBoundingClientRect();
    model.position.x = ((e.clientX - rect.left) / rect.width) * 4 - 2;
    model.position.y = (-(e.clientY - rect.top) / rect.height) * 4 + 2;
  });

  // Мобильные: обработка жестов
  container.addEventListener("touchstart", handleTouchStart);
  container.addEventListener("touchend", handleTouchEnd);
  container.addEventListener("touchmove", handleTouchMove);
}

function handleCapture() {
  if (!isModelLoaded) {
    alert("Please wait until model is loaded!");
    return;
  }
  capturePhoto();
}

// Остальные функции обработки касаний остаются без изменений

function capturePhoto() {
  // Принудительный рендер сцены
  renderer.render(scene, camera);

  const video = document.getElementById("camera-feed");
  const dpi = window.devicePixelRatio;

  // Создаем холст с реальными размерами видео
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // Получаем реальные размеры видео
  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;

  // Устанавливаем размеры холста по размерам видео
  canvas.width = videoWidth;
  canvas.height = videoHeight;

  // Рассчитываем соотношение сторон
  const videoAspect = videoWidth / videoHeight;
  const screenAspect = window.innerWidth / window.innerHeight;

  // Вычисляем размеры для правильного отображения
  let drawWidth,
    drawHeight,
    offsetX = 0,
    offsetY = 0;

  if (videoAspect > screenAspect) {
    // Видео шире экрана - обрезаем по бокам
    drawHeight = videoHeight;
    drawWidth = drawHeight * screenAspect;
    offsetX = (videoWidth - drawWidth) / 2;
  } else {
    // Видео уже экрана - обрезаем сверху и снизу
    drawWidth = videoWidth;
    drawHeight = drawWidth / screenAspect;
    offsetY = (videoHeight - drawHeight) / 2;
  }

  // 1. Рисуем видео с правильным кадрированием
  ctx.drawImage(
    video,
    offsetX,
    offsetY,
    drawWidth,
    drawHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );

  // 2. Рисуем 3D-сцену с масштабированием
  const renderCanvas = renderer.domElement;
  ctx.drawImage(
    renderCanvas,
    0,
    0,
    renderCanvas.width,
    renderCanvas.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  // Создаем и скачиваем файл
  const link = document.createElement("a");
  link.download = `ar-photo-${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
window.addEventListener("load", init);
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
