const BASE = 'https://api.dani-dev.co.za/v2/transport'

export async function get(path, params = {}) {
  const url = new URL(BASE + path)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  }
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(response.status === 404 ? 'No current information was returned for this selection.' : `The service returned HTTP ${response.status}. Please try again.`)
  const json = await response.json()
  if (json?.success === false || json?.status === 'error') throw new Error(json.message || 'The service could not complete this request.')
  return json
}

export const dataOf = response => response?.data ?? response
export const errorText = error => error instanceof Error ? error.message : 'Something went wrong. Please try again.'

export function todayMYT() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const piece = type => parts.find(part => part.type === type)?.value
  return `${piece('year')}-${piece('month')}-${piece('day')}`
}

export function clockMYT(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('en-MY', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
}
