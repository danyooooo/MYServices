const BASE_URL = 'https://api.dani-dev.co.za/v2/music'

export async function getMusic(endpoint, params = {}, signal) {
  const url = new URL(`${BASE_URL}/${endpoint}`)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  }

  let response
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' }, signal })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('Could not reach the music service. Check your connection and try again.')
  }

  let data
  try {
    data = await response.json()
  } catch {
    throw new Error('The music service returned an unreadable response.')
  }

  if (!response.ok || data?.error) {
    throw new Error(data?.error?.message || `The music service returned an error (${response.status}).`)
  }
  return data
}

export function recordArtist(record) {
  if (typeof record?.artist === 'string') return record.artist
  if (record?.artist?.name) return record.artist.name
  if (typeof record?.mainArtist === 'string') return record.mainArtist
  if (record?.mainArtist?.name) return record.mainArtist.name
  if (Array.isArray(record?.artists)) {
    return record.artists.map((artist) => artist?.name).filter(Boolean).join(', ')
  }
  return ''
}

export function recordTitle(record, type) {
  return type === 'artist' ? record?.name : record?.title
}

export function displayGenres(value) {
  if (!Array.isArray(value)) return typeof value === 'string' ? value : ''
  return value.map((genre) => typeof genre === 'string' ? genre : genre?.name || genre?.title).filter(Boolean).join(', ')
}

export function safeWebUrl(value) {
  if (typeof value !== 'string') return ''
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}
