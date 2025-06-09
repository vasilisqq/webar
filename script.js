let camera, scene, renderer, model;
let isDragging = false;
let previousTouch;
let currentVideoStream = null;
let isFrontCamera = false;
let isModelLoaded = false;
let currentPhotoData = null;
// Параметры жестов
let gestureState = {
  scale: {
    initialDistance: null,
    startScale: 1
  },
  rotate: {
    initialAngle: null,
    startRotation: 0
  }
};

const ROTATION_SENSITIVITY = 0.5;
const SCALE_LIMITS = { min: 0.3, max: 5 };

// Инициализация
function init() {
  console.log("Initializing..59");
  console.log("Initializing AR Scene");
  // 1. Настройка Three.js сцены
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    10000
  );

  renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector("#render-canvas"),
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  // 2. Позиция камеры
  camera.position.z = 5;

  // 3. Освещение
  const ambientLight = new THREE.AmbientLight(0xffffff, 2);
  scene.add(ambientLight);

  // 4. Загрузка 3D-модели
  const loader = new THREE.GLTFLoader();
  document.querySelector(".loading").style.display = "block";

  loader.load(
    "assets/models/cat.glb",
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
    const [touch1, touch2] = e.touches;
    
    // Инициализация масштабирования
    gestureState.scale.initialDistance = getDistance(touch1, touch2);
    gestureState.scale.startScale = model.scale.x;
    
    // Инициализация вращения
    gestureState.rotate.initialAngle = getAngle(touch1, touch2);
    gestureState.rotate.startRotation = model.rotation.y;
    
    e.preventDefault();
  }
}

function handleTouchMove(e) {
  if (!isModelLoaded) return;

  if (e.touches.length === 1 && isDragging) {
    // Перемещение
    const touch = e.touches[0];
    const deltaX = touch.clientX - previousTouch.clientX;
    const deltaY = touch.clientY - previousTouch.clientY;
    
    model.position.x += deltaX * 0.01;
    model.position.y -= deltaY * 0.01;
    previousTouch = touch;
    
  } else if (e.touches.length === 2) {
    // Масштабирование и вращение
    e.preventDefault();
    const [touch1, touch2] = e.touches;
    
    // Масштабирование
    const currentDistance = getDistance(touch1, touch2);
    if (gestureState.scale.initialDistance && currentDistance > 0) {
      const scale = (currentDistance / gestureState.scale.initialDistance) * gestureState.scale.startScale;
      model.scale.setScalar(Math.min(Math.max(scale, SCALE_LIMITS.min), SCALE_LIMITS.max));
    }
    
    // Вращение
    const currentAngle = getAngle(touch1, touch2);
    if (gestureState.rotate.initialAngle !== null) {
      const angleDelta = currentAngle - gestureState.rotate.initialAngle;
      model.rotation.y = gestureState.rotate.startRotation + angleDelta * ROTATION_SENSITIVITY;
    }
  }
}

function handleTouchEnd(e) {
  isDragging = false;
  gestureState.scale.initialDistance = null;
  gestureState.rotate.initialAngle = null;
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

document.getElementById("cancel-preview").addEventListener("click", closePreview);
document.getElementById("save-photo").addEventListener("click", handleSavePhoto);
}

function handleSavePhoto() {
  if (!currentPhotoData) {
    alert("No photo to save!");
    return;
  }
  
  try {
    const link = document.createElement("a");
    link.download = `ar-photo-${Date.now()}.png`;
    link.href = currentPhotoData;
    
    // Добавляем временно в DOM
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Save error:", error);
    alert("Error saving photo!");
  }
  
  closePreview();
}
function handleCapture() {
  if (!isModelLoaded) {
    alert("Please wait until model is loaded!");
    return;
  }
  capturePhoto();
}

function capturePhoto() {
  // Принудительный рендер сцены
  renderer.render(scene, camera);

  const video = document.getElementById("camera-feed");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  
  // Добавляем определение renderCanvas
  const renderCanvas = renderer.domElement;

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
  let drawWidth, drawHeight, offsetX = 0, offsetY = 0;

  if (videoAspect > screenAspect) {
    drawHeight = videoHeight;
    drawWidth = drawHeight * screenAspect;
    offsetX = (videoWidth - drawWidth) / 2;
  } else {
    drawWidth = videoWidth;
    drawHeight = drawWidth / screenAspect;
    offsetY = (videoHeight - drawHeight) / 2;
  }
  const originalTransform = video.style.transform;
  video.style.transform = 'none';
  ctx.save();
  if (isFrontCamera) {
    // Зеркалим только по горизонтали
    ctx.scale(-1, 1);
    ctx.translate(-videoWidth, 0);
  }
  // 1. Сначала рисуем видео
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
  ctx.restore();
  // 2. Затем рисуем 3D-сцену поверх видео
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
  video.style.transform = originalTransform;
  currentPhotoData = canvas.toDataURL("image/png");
  showPreview();
}

function showPreview() {
  const previewModal = document.getElementById("preview-modal");
  const previewImage = document.getElementById("preview-image");
  
  previewImage.src = currentPhotoData;
  previewModal.style.display = "flex";
  
  // Блокируем фоновые элементы
  document.getElementById("ar-container").style.pointerEvents = "none";
  document.querySelectorAll("button:not(.modal-buttons button)").forEach(btn => {
    btn.style.pointerEvents = "none";
    btn.style.opacity = "0.5";
  });
}

function closePreview() {
  const previewModal = document.getElementById("preview-modal");
  previewModal.style.display = "none";
  currentPhotoData = null;
  
  // Восстанавливаем взаимодействие
  document.getElementById("ar-container").style.pointerEvents = "auto";
  document.querySelectorAll("button").forEach(btn => {
    btn.style.pointerEvents = "auto";
    btn.style.opacity = "1";
  });
}
window.addEventListener("load", init);
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  // Добавьте обновление матрицы проекции
  if (model) {
    model.updateMatrixWorld();
  }
});
