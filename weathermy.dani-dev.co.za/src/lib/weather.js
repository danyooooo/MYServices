export const API_BASE = 'https://api.dani-dev.co.za/v1/utilities/weather'
export const TIME_ZONE = 'Asia/Kuala_Lumpur'

export function formatTime(value) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-MY', { timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit', hour12: true }).format(date)
}

export function formatDate(value, options = {}) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-MY', { timeZone: TIME_ZONE, day: 'numeric', month: 'short', ...options }).format(date)
}

export function number(value, digits = 0) {
  if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) return '—'
  return new Intl.NumberFormat('en-MY', { maximumFractionDigits: digits }).format(Number(value))
}

export function conditionLabel(value) {
  const labels = {
    sunny: 'Sunny', clear: 'Clear', 'clear-night': 'Clear night',
    cloudy: 'Cloudy', 'cloudy-night': 'Cloudy night', 'partly-cloudy': 'Partly cloudy',
    'partly-cloudy-night': 'Partly cloudy night', rain: 'Rain', 'rain-night': 'Rain',
    thunderstorm: 'Thunderstorms', 'thunderstorm-night': 'Thunderstorms',
    haze: 'Haze', fog: 'Fog', windy: 'Windy',
  }
  return labels[value] || (value ? value.replaceAll('-', ' ') : 'Conditions unavailable')
}

export function placeType(place) {
  const type = place?.type || ''
  if (type.includes('states')) return 'State'
  if (type.includes('districts')) return 'District'
  if (type.includes('divisions')) return 'Division'
  if (type.includes('towns')) return 'Town'
  if (type.includes('mukim')) return 'Mukim'
  if (type.includes('tourist')) return 'Destination'
  if (type.includes('coastal')) return 'Coastal area'
  if (type.includes('shipping')) return 'Shipping area'
  return 'Location'
}

export function isLandLocation(place) {
  return place?.active !== false && !/coastal|shipping/.test(place?.type || '')
}

export function belongsTo(place, parentId, lookup) {
  let current = place
  const visited = new Set()
  while (current && !visited.has(current.id)) {
    if (current.id === parentId) return true
    visited.add(current.id)
    current = lookup.get(current.parentId)
  }
  return false
}

export function stateName(place, lookup) {
  let current = place
  const visited = new Set()
  while (current && !visited.has(current.id)) {
    if (current.type?.includes('states')) return current.name
    visited.add(current.id)
    current = lookup.get(current.parentId)
  }
  return place?.negeri || 'Malaysia'
}

export function placeContext(place, lookup) {
  const names = []
  const visited = new Set([place?.id])
  let parent = lookup.get(place?.parentId)
  while (parent && !visited.has(parent.id)) {
    visited.add(parent.id)
    if (parent.name) names.push(parent.name)
    parent = lookup.get(parent.parentId)
  }
  return [...new Set(names)].join(' · ') || stateName(place, lookup)
}

export function searchCatalog(catalog, query, limit = 10) {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return []
  return catalog.filter(place => isLandLocation(place) && place.name?.toLocaleLowerCase().includes(needle))
    .sort((a, b) => {
      const score = place => (place.name.toLocaleLowerCase() === needle ? 0 : place.name.toLocaleLowerCase().startsWith(needle) ? 10 : 20) + (place.type?.includes('districts') ? 0 : place.type?.includes('towns') ? 1 : 2)
      return score(a) - score(b) || a.name.localeCompare(b.name)
    }).slice(0, limit)
}

export function nearestForecastArea(catalog, latitude, longitude) {
  const lat = Number(latitude)
  const lon = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  let nearest = null
  let distance = Infinity
  for (const place of catalog) {
    const point = place['center-coordinate']
    if (!isLandLocation(place) || !Array.isArray(point) || point.length < 2) continue
    const [a, b] = point.map(Number)
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue
    const deltaLat = (a - lat) * Math.PI / 180
    const deltaLon = (b - lon) * Math.PI / 180
    const value = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat * Math.PI / 180) * Math.cos(a * Math.PI / 180) * Math.sin(deltaLon / 2) ** 2
    if (value < distance) { nearest = place; distance = value }
  }
  // Avoid assigning a Malaysian forecast to a geocoder result in another country.
  const kilometres = 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, distance)))
  return nearest && kilometres <= 75 ? nearest : null
}

export function warningStatus(warning, now = Date.now()) {
  if (warning.terminatedAt) return 'ended'
  const periods = Array.isArray(warning.publishData) ? warning.publishData : []
  const valid = periods.map(p => ({ start: Date.parse(p.timeFrom), end: Date.parse(p.timeUntil) })).filter(p => Number.isFinite(p.end))
  if (!valid.length) return 'notice'
  if (valid.some(p => p.end > now && (!Number.isFinite(p.start) || p.start <= now))) return 'active'
  if (valid.some(p => p.end > now && p.start > now)) return 'scheduled'
  return 'ended'
}

export function warningTitle(warning) {
  return warning.textWarning?.english?.title || warning.textWarning?.english?.warningTitle ||
    (warning.warningType || 'Weather notice').replaceAll('-', ' ')
}

export function warningBody(warning) {
  const body = warning.textWarning?.english?.body || warning.textWarning?.malay?.body || []
  return Array.isArray(body) ? body : [body]
}

export function warningExpiry(warning) {
  const ends = (Array.isArray(warning.publishData) ? warning.publishData : []).map(p => Date.parse(p.timeUntil)).filter(Number.isFinite)
  return ends.length ? new Date(Math.max(...ends)).toISOString() : null
}

export function warningIssued(warning) {
  const periods = Array.isArray(warning.publishData) ? warning.publishData : []
  return periods.find(p => Number.isFinite(Date.parse(p.issuedTime)))?.issuedTime || warning.publishDate
}

export function newsUrl(path) {
  if (typeof path !== 'string' || !path.startsWith('/assets/content/')) return null
  const url = new URL(path, 'https://www.met.gov.my')
  return url.origin === 'https://www.met.gov.my' && url.pathname.startsWith('/assets/content/') ? url.href : null
}
