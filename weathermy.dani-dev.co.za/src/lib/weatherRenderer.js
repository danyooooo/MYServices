// The atmosphere is drawn procedurally. Cloud textures are baked once, so the
// animation only composites cached sprites rather than recomputing noise.
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const mix = (a, b, amount) => a + (b - a) * amount

function random(seed) {
  let value = seed >>> 0
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0
    return value / 4294967296
  }
}

function hash(x, y, seed) {
  let value = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ seed
  value = Math.imul(value ^ (value >>> 13), 1274126177)
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295
}

function noise(x, y, seed) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  let fx = x - ix
  let fy = y - iy
  fx = fx * fx * (3 - 2 * fx)
  fy = fy * fy * (3 - 2 * fy)
  return mix(mix(hash(ix, iy, seed), hash(ix + 1, iy, seed), fx),
    mix(hash(ix, iy + 1, seed), hash(ix + 1, iy + 1, seed), fx), fy)
}

function fractal(x, y, seed) {
  return noise(x, y, seed) * .55 + noise(x * 2, y * 2, seed + 7) * .27 +
    noise(x * 4, y * 4, seed + 17) * .13 + noise(x * 8, y * 8, seed + 31) * .05
}

function makeCloud(seed) {
  const canvas = document.createElement('canvas')
  canvas.width = 384
  canvas.height = 160
  const context = canvas.getContext('2d')
  const image = context.createImageData(canvas.width, canvas.height)
  const rand = random(seed)
  const lobes = [{ x: .5, y: .64, rx: .46, ry: .22 }]
  for (let i = 0; i < 7; i++) lobes.push({ x: .14 + i * .12, y: .43 + rand() * .16, rx: .15 + rand() * .1, ry: .2 + rand() * .17 })
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const u = x / canvas.width
      const v = y / canvas.height
      let silhouette = -1
      for (const lobe of lobes) {
        const distance = 1 - ((u - lobe.x) / lobe.rx) ** 2 - ((v - lobe.y) / lobe.ry) ** 2
        silhouette = Math.max(silhouette, distance)
      }
      const texture = fractal(u * 6, v * 4, seed)
      const density = clamp((silhouette + (texture - .5) * .95) * 2.5, 0, 1)
      const edge = clamp(Math.min(u, 1 - u) * 14, 0, 1)
      const illumination = clamp(.65 + texture * .48 - v * .48, 0, 1)
      const index = (y * canvas.width + x) * 4
      image.data[index] = 100 + illumination * 133
      image.data[index + 1] = 119 + illumination * 120
      image.data[index + 2] = 141 + illumination * 107
      image.data[index + 3] = density * edge * 215
    }
  }
  context.putImageData(image, 0, 0)
  return canvas
}

const palettes = {
  neutral: { top: [12, 20, 32], bottom: [20, 33, 48] },
  'clear-day': { top: [30, 82, 134], bottom: [87, 147, 180] },
  'clear-night': { top: [8, 18, 36], bottom: [24, 43, 64] },
  'cloudy-day': { top: [45, 69, 92], bottom: [90, 122, 142] },
  'cloudy-night': { top: [13, 24, 41], bottom: [44, 62, 82] },
  'rain-day': { top: [24, 43, 61], bottom: [61, 86, 102] },
  'rain-night': { top: [8, 17, 30], bottom: [32, 48, 63] },
  'storm-day': { top: [20, 30, 43], bottom: [47, 61, 78] },
  'storm-night': { top: [7, 13, 25], bottom: [28, 36, 54] },
  'mist-day': { top: [63, 85, 102], bottom: [100, 126, 141] },
  'mist-night': { top: [21, 33, 46], bottom: [56, 73, 86] },
}

const rgb = color => `rgb(${color.map(Math.round).join(',')})`

export function createWeatherRenderer(canvas) {
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) return { setScene() {}, resize() {}, setMotion() {}, destroy() {} }
  const cloudSprites = [makeCloud(42), makeCloud(137), makeCloud(271)]
  const rand = random(83)
  const stars = Array.from({ length: 85 }, () => ({ x: rand(), y: rand() * .62, size: .5 + rand() * 1.1, phase: rand() * Math.PI * 2 }))
  const drops = Array.from({ length: 180 }, () => ({ x: rand(), y: rand(), depth: .3 + rand() * .7 }))
  const clouds = Array.from({ length: 9 }, (_, i) => ({ x: rand() * 1.5 - .25, y: -.13 + rand() * .72, scale: .55 + rand() * .7, depth: .35 + i / 15, sprite: i % 3 }))
  const moonCanvas = document.createElement('canvas')
  moonCanvas.width = moonCanvas.height = 96
  const moonContext = moonCanvas.getContext('2d')
  let scene = { kind: 'neutral', night: true, cloudCover: 0, rainIntensity: 0, windSpeed: 6, windDirection: 1, moonPhase: .25 }
  let width = 1
  let height = 1
  let dpr = 1
  let frame = 0
  let previousTime = 0
  let elapsed = 0
  let moving = false
  let destroyed = false
  let lightning = 0
  let nextLightning = 10
  let cloudCover = 0
  let rainIntensity = 0
  let sky = palettes.neutral
  let targetSky = sky

  function bakeMoon(phase) {
    const image = moonContext.createImageData(96, 96)
    const lx = Math.sin(phase * Math.PI * 2)
    const lz = -Math.cos(phase * Math.PI * 2)
    for (let y = 0; y < 96; y++) {
      for (let x = 0; x < 96; x++) {
        const nx = (x - 47.5) / 46
        const ny = (y - 47.5) / 46
        const radius = nx * nx + ny * ny
        if (radius > 1) continue
        const nz = Math.sqrt(1 - radius)
        const light = Math.max(0, nx * lx + nz * lz)
        const texture = .92 + noise(x / 5, y / 5, 94) * .08
        const index = (y * 96 + x) * 4
        image.data[index] = (35 + light * 201) * texture
        image.data[index + 1] = (50 + light * 190) * texture
        image.data[index + 2] = (71 + light * 178) * texture
        image.data[index + 3] = clamp((1 - radius) * 30, 0, 1) * 255
      }
    }
    moonContext.putImageData(image, 0, 0)
  }

  function drawSky() {
    const atmosphere = context.createLinearGradient(0, 0, 0, height)
    atmosphere.addColorStop(0, rgb(sky.top))
    atmosphere.addColorStop(1, rgb(sky.bottom))
    context.fillStyle = atmosphere
    context.fillRect(0, 0, width, height)
    if (scene.kind === 'neutral') return
    const celestialX = width * .79
    const celestialY = height * .19
    const size = Math.min(width, height) * (scene.night ? .047 : .06)
    if (scene.night && (scene.kind === 'clear' || scene.kind === 'cloudy') && cloudCover < .65) {
      for (const star of stars) {
        context.globalAlpha = (.3 + .2 * Math.sin(elapsed * .35 + star.phase)) * (1 - cloudCover)
        context.fillStyle = '#d9e9ff'
        context.beginPath()
        context.arc(star.x * width, star.y * height, star.size, 0, Math.PI * 2)
        context.fill()
      }
      context.globalAlpha = 1
    }
    if (scene.kind === 'mist' || scene.kind === 'rain' || scene.kind === 'storm') return
    const halo = context.createRadialGradient(celestialX, celestialY, size * .3, celestialX, celestialY, size * 5)
    halo.addColorStop(0, scene.night ? '#a6c9f51c' : '#ffe7b361')
    halo.addColorStop(1, scene.night ? '#a6c9f500' : '#ffe7b300')
    context.fillStyle = halo
    context.fillRect(celestialX - size * 5, celestialY - size * 5, size * 10, size * 10)
    if (scene.night) context.drawImage(moonCanvas, celestialX - size, celestialY - size, size * 2, size * 2)
    else {
      context.shadowColor = '#fff4d3'
      context.shadowBlur = 25
      context.fillStyle = '#fff4d3'
      context.beginPath()
      context.arc(celestialX, celestialY, size * .65, 0, Math.PI * 2)
      context.fill()
      context.shadowBlur = 0
    }
  }

  function drawClouds() {
    const amount = Math.ceil(cloudCover * clouds.length)
    for (let i = 0; i < amount; i++) {
      const cloud = clouds[i]
      const cloudWidth = Math.max(520, width * .85) * cloud.scale
      const cloudHeight = cloudWidth * .38
      const travel = elapsed * scene.windSpeed * scene.windDirection * cloud.depth
      const span = width + cloudWidth * 2
      const x = ((cloud.x * width + travel + cloudWidth) % span + span) % span - cloudWidth
      const y = cloud.y * height + Math.sin(elapsed * .018 + i) * 12
      context.globalAlpha = cloudCover * (scene.night ? .3 : .55) * (i < 3 ? .75 : 1)
      context.drawImage(cloudSprites[cloud.sprite], x, y, cloudWidth, cloudHeight)
    }
    context.globalAlpha = 1
    if (scene.kind === 'mist') {
      const mist = context.createLinearGradient(0, height * .25, 0, height)
      mist.addColorStop(0, '#b1c6d200')
      mist.addColorStop(1, '#b1c6d240')
      context.fillStyle = mist
      context.fillRect(0, 0, width, height)
    }
  }

  function drawRain() {
    if (rainIntensity < .01) return
    const amount = Math.min(drops.length, Math.round((width < 600 ? 70 : 150) * rainIntensity))
    const slant = scene.windDirection * (8 + scene.windSpeed * .35)
    context.strokeStyle = '#c3def2'
    for (let i = 0; i < amount; i++) {
      const drop = drops[i]
      const speed = 340 + drop.depth * 500
      const distance = elapsed * speed
      const y = (drop.y * height + distance) % (height + 60) - 30
      const x = ((drop.x * width + distance * slant / 500) % (width + 60) + width + 60) % (width + 60) - 30
      const length = 12 + drop.depth * 25
      context.globalAlpha = (.12 + drop.depth * .2) * rainIntensity
      context.lineWidth = .55 + drop.depth * .75
      context.beginPath()
      context.moveTo(x, y)
      context.lineTo(x + slant * length / 100, y + length)
      context.stroke()
    }
    context.globalAlpha = 1
  }

  function drawLightning(delta) {
    if (scene.kind !== 'storm' || !moving) { lightning = 0; return }
    if (elapsed >= nextLightning) {
      lightning = 1
      nextLightning = elapsed + 12 + rand() * 10
    }
    if (lightning <= 0) return
    lightning = Math.max(0, lightning - delta * 3)
    const glow = context.createRadialGradient(width * .68, 0, 0, width * .68, 0, width * .6)
    glow.addColorStop(0, `rgba(192,211,246,${lightning * .16})`)
    glow.addColorStop(1, 'rgba(192,211,246,0)')
    context.fillStyle = glow
    context.fillRect(0, 0, width, height)
    context.globalAlpha = lightning * .38
    context.strokeStyle = '#c5dcff'
    context.lineWidth = 1.3
    context.beginPath()
    context.moveTo(width * .68, 0)
    context.lineTo(width * .66, height * .09)
    context.lineTo(width * .685, height * .085)
    context.lineTo(width * .65, height * .19)
    context.stroke()
    context.globalAlpha = 1
  }

  function draw(timestamp = 0) {
    if (destroyed) return
    const delta = previousTime && moving ? Math.min((timestamp - previousTime) / 1000, .05) : 0
    previousTime = timestamp
    elapsed += delta
    const transition = moving ? 1 - Math.exp(-delta * 1.6) : 1
    sky = { top: sky.top.map((value, i) => mix(value, targetSky.top[i], transition)), bottom: sky.bottom.map((value, i) => mix(value, targetSky.bottom[i], transition)) }
    cloudCover = mix(cloudCover, scene.cloudCover, transition)
    rainIntensity = mix(rainIntensity, scene.rainIntensity, transition)
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawSky()
    drawClouds()
    drawRain()
    drawLightning(delta)
    if (moving) frame = requestAnimationFrame(draw)
  }

  function resize() {
    if (destroyed) return
    width = canvas.clientWidth || window.innerWidth
    height = canvas.clientHeight || window.innerHeight
    // Limit the backing buffer on high-density mobile screens.
    dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    if (!moving) draw()
  }

  function setScene(next) {
    scene = next
    targetSky = palettes[next.kind === 'neutral' ? 'neutral' : `${next.kind}-${next.night ? 'night' : 'day'}`] || palettes.neutral
    nextLightning = elapsed + 10
    bakeMoon(next.moonPhase)
    if (!moving) draw()
  }

  function setMotion(enabled) {
    if (destroyed || moving === enabled) return
    moving = enabled
    cancelAnimationFrame(frame)
    previousTime = 0
    if (moving) frame = requestAnimationFrame(draw)
    else draw()
  }

  function destroy() {
    destroyed = true
    moving = false
    cancelAnimationFrame(frame)
  }

  bakeMoon(scene.moonPhase)
  resize()
  return { setScene, resize, setMotion, destroy }
}
