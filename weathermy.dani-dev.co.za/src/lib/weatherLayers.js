import { API_BASE } from './weather.js'

export function rasterUrl(path, kind) {
  if (typeof path !== 'string' || !path.startsWith(`/${kind}/cog/`) || !path.toLowerCase().endsWith('.tif')) return ''
  return `${API_BASE}${path}`
}

export function manifestFrames(manifest, kind) {
  if (!Array.isArray(manifest?.frames)) return []
  const frames = manifest.frames.filter(frame => rasterUrl(frame?.url, kind))
  if (kind === 'rains') {
    const bases = new Set(frames.map(frame => Number(frame.baseEpochMili)).filter(Number.isFinite))
    const latest = bases.has(Number(manifest.latestBaseEpochMili))
      ? Number(manifest.latestBaseEpochMili)
      : Math.max(0, ...bases)
    return frames.filter(frame => frame.baseEpochMili === latest).sort((a, b) => a.validEpochMili - b.validEpochMili)
  }
  return frames.sort((a, b) => a.epochMili - b.epochMili)
}

export function rasterColor(value, kind) {
  if (!Number.isFinite(value)) return [0, 0, 0, 0]
  const intensity = kind === 'rains' ? value * 3600 : value
  const breaks = kind === 'rains'
    ? [[.1, [56, 189, 248]], [1, [34, 197, 94]], [5, [250, 204, 21]], [15, [251, 146, 60]], [30, [244, 63, 94]], [60, [168, 85, 247]]]
    : [[5, [56, 189, 248]], [20, [34, 197, 94]], [35, [250, 204, 21]], [45, [251, 146, 60]], [55, [244, 63, 94]], [65, [168, 85, 247]]]
  if (intensity < breaks[0][0]) return [0, 0, 0, 0]
  for (let index = breaks.length - 1; index >= 0; index--) {
    if (intensity >= breaks[index][0]) return [...breaks[index][1], 190]
  }
  return [0, 0, 0, 0]
}

export async function loadRaster(path, kind, nodata, signal) {
  const url = rasterUrl(path, kind)
  if (!url) throw new Error('The manifest contains an unsupported raster URL.')
  const response = await fetch(url, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`Raster image returned ${response.status}.`)
  const { fromArrayBuffer } = await import('geotiff')
  const tiff = await fromArrayBuffer(await response.arrayBuffer())
  const image = await tiff.getImage()
  const scale = Math.min(1, 1100 / image.getWidth())
  const width = Math.max(1, Math.round(image.getWidth() * scale))
  const height = Math.max(1, Math.round(image.getHeight() * scale))
  const [band] = await image.readRasters({ samples: [0], width, height, resampleMethod: 'nearest' })
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  const pixels = context.createImageData(width, height)
  const imageNodata = Number(image.getGDALNoData())
  const isNoData = value => !Number.isFinite(value) ||
    (Number.isFinite(nodata) && Math.abs(value - nodata) / Math.max(1, Math.abs(nodata)) < 1e-6) ||
    (Number.isFinite(imageNodata) && Math.abs(value - imageNodata) / Math.max(1, Math.abs(imageNodata)) < 1e-6) ||
    (kind === 'rains' && value > 1e10)
  for (let index = 0; index < band.length; index++) {
    const value = band[index]
    const color = isNoData(value) ? [0, 0, 0, 0] : rasterColor(value, kind)
    pixels.data.set(color, index * 4)
  }
  context.putImageData(pixels, 0, 0)
  return canvas.toDataURL('image/png')
}
