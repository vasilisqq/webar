if (typeof document !== 'undefined') {
  // Конфигурация XR контроллера
  if (typeof XrController !== 'undefined') {
    XrController.configure({
      camera: {
        resolution: 'high',
        frameRate: 'high',
        focusMode: 'continuous',
      },
    })
  }

  // Создание модального окна для превью
  const modal = document.createElement('div')
  modal.id = 'screenshotPreviewModal'
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    display: none;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    backdrop-filter: blur(5px);
  `

  const previewImg = document.createElement('img')
  previewImg.id = 'screenshotPreviewImg'
  previewImg.style.maxWidth = '90vw'
  previewImg.style.maxHeight = '90vh'
  previewImg.style.borderRadius = '8px'
  previewImg.style.boxShadow = '0 0 30px rgba(255,255,255,0.2)'

  const controls = document.createElement('div')
  controls.style.marginTop = '20px'
  controls.style.display = 'flex'
  controls.style.gap = '10px'
  controls.style.justifyContent = 'center'

  const downloadBtn = document.createElement('button')
  downloadBtn.id = 'confirmDownloadBtn'
  downloadBtn.textContent = 'Скачать'
  downloadBtn.style.cssText = `
    padding: 10px 20px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
  `

  const cancelBtn = document.createElement('button')
  cancelBtn.id = 'cancelPreviewBtn'
  cancelBtn.textContent = 'Отмена'
  cancelBtn.style.cssText = `
    padding: 10px 20px;
    background: #f44336;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
  `

  controls.appendChild(downloadBtn)
  controls.appendChild(cancelBtn)

  const modalContent = document.createElement('div')
  modalContent.style.display = 'flex'
  modalContent.style.flexDirection = 'column'
  modalContent.style.alignItems = 'center'
  modalContent.appendChild(previewImg)
  modalContent.appendChild(controls)

  modal.appendChild(modalContent)
  document.body.appendChild(modal)

  let currentScreenshotUrl = null

  // Функция скачивания скриншота
  function downloadHandler() {
    if (!currentScreenshotUrl) return

    try {
      const link = document.createElement('a')
      link.download = `photo_with_cat_${Date.now()}.png`
      link.href = currentScreenshotUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      closePreview()
    } catch (e) {
      console.error('Screenshot error:', e)
    }
  }

  downloadBtn.addEventListener('click', downloadHandler)

  // Закрытие превью
  function closePreview() {
    modal.style.display = 'none'
    currentScreenshotUrl = null

    const screenshotButton = document.getElementById('screenshotButton')
    if (screenshotButton) {
      screenshotButton.style.display = 'flex'
    }
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closePreview()
    }
  })

  cancelBtn.addEventListener('click', closePreview)

  // Регистрация кастомного компонента для анимации
  AFRAME.registerComponent('animation-mixer', {
    schema: {
      clip: {default: '*'},
      duration: {type: 'number'},
      clampWhenFinished: {default: false},
      crossFadeDuration: {type: 'number', default: 0},
      loop: {default: 'repeat', oneOf: ['once', 'repeat', 'pingpong']},
      repetitions: {type: 'number', default: Infinity},
      timeScale: {type: 'number', default: 1},
    },

    init() {
      this.model = null
      this.mixer = null
      this.activeActions = []

      const model = this.el.getObject3D('mesh')
      if (model) {
        this.load(model)
      } else {
        this.el.addEventListener('model-loaded', (e) => {
          this.load(e.detail.model)
        })
      }
    },

    load(model) {
      this.model = model
      this.mixer = new AFRAME.THREE.AnimationMixer(model)
      this.update()
    },

    update() {
      if (!this.mixer) return

      const system = this.el.sceneEl.systems['animation-mixer'] ||
                   (this.el.sceneEl.systems['animation-mixer'] = {mixers: []})

      if (system.mixers.indexOf(this.mixer) === -1) {
        system.mixers.push(this.mixer)
      }

      const {data} = this
      this.activeActions.forEach(action => action.stop())
      this.activeActions.length = 0

      if (!data.clip) return

      const clips = this.model.animations || (this.model.geometry || {}).animations || []
      if (!clips.length) return

      for (const clip of clips) {
        if (data.clip === '*' || clip.name === data.clip) {
          const action = this.mixer.clipAction(clip, this.model)
          action.enabled = true
          action.clampWhenFinished = data.clampWhenFinished
          if (data.duration) action.setDuration(data.duration)
          if (data.crossFadeDuration) action.crossFadeFrom(this.activeActions[0], data.crossFadeDuration)
          action.setLoop(AFRAME.THREE[data.loop.toUpperCase()], data.repetitions)
          action.timeScale = data.timeScale
          action.play()
          this.activeActions.push(action)
        }
      }
    },

    remove() {
      if (this.mixer) {
        const system = this.el.sceneEl.systems['animation-mixer']
        const index = system.mixers.indexOf(this.mixer)
        if (index > -1) system.mixers.splice(index, 1)
      }
    },
  })

  // Система для обновления анимаций
  AFRAME.registerSystem('animation-mixer', {
    init() {
      this.mixers = []
    },

    tick(t, dt) {
      for (const mixer of this.mixers) {
        mixer.update(dt / 1000)
      }
    },
  })

  // Создание кнопки скриншота
  function createScreenshotButton() {
    const button = document.getElementById('screenshotButton')
    button.addEventListener('click', () => {
      button.style.display = 'none'

      const canvas = document.querySelector('canvas')
      if (!canvas) return

      const tempCanvas = document.createElement('canvas')
      const ctx = tempCanvas.getContext('2d')
      const scale = 2

      tempCanvas.width = canvas.width * scale
      tempCanvas.height = canvas.height * scale

      ctx.scale(scale, scale)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)
      ctx.drawImage(canvas, 0, 0)

      currentScreenshotUrl = tempCanvas.toDataURL('image/png')

      previewImg.src = currentScreenshotUrl
      modal.style.display = 'flex'
    })
  }

  // Инициализация после загрузки
  window.addEventListener('xrloaded', () => {
    createScreenshotButton()

    const model = document.getElementById('model')
    if (model) {
      model.setAttribute('animation-mixer', 'clip: *; loop: repeat')
    }
  })
}
