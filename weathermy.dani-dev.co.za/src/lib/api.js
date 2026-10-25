import { API_BASE } from './weather'

export async function request(path, signal) {
  const timeout = AbortSignal.timeout(20000)
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout
  const response = await fetch(`${API_BASE}${path}`, { signal: combined })
  if (!response.ok) throw new Error(`Weather service returned ${response.status}.`)
  const data = await response.json()
  if (data?.error) throw new Error('This information is unavailable from the weather service.')
  return data
}

export const api = {
  forecast: (id, signal) => request(`/forecast?locationId=${encodeURIComponent(id)}`, signal),
  alerts: signal => request('/alerts', signal),
  catalog: signal => request('/locations/catalog', signal),
  states: signal => request('/locations/states', signal),
  districts: signal => request('/locations/districts', signal),
  marine: signal => request('/locations/marine', signal),
  coastal: signal => request('/locations/coastal', signal),
  stateDetails: (id, signal) => request(`/locations/states/${encodeURIComponent(id)}?tree=1&format=geojson`, signal),
  search: (query, signal) => request(`/locations/search?q=${encodeURIComponent(query)}`, signal),
  news: signal => request('/news?lang=ms', signal),
  radarManifest: signal => request('/radar/manifest', signal),
  rainsManifest: signal => request('/rains/manifest', signal),
  windMetadata: signal => request('/wind/metadata', signal),
  windRun: (model, cycle, signal) => request(`/wind/run?model=${encodeURIComponent(model)}&cycle=${encodeURIComponent(cycle)}`, signal),
  cyclones: signal => request('/cyclones', signal),
  cyclone: (id, signal) => request(`/cyclones/${encodeURIComponent(id)}`, signal),
}
