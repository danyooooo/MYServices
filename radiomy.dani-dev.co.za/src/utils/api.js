export const API_BASE = 'https://api.dani-dev.co.za/v2/stream';

export function apiUrl(path, params = {}) {
  const url = new URL(`${API_BASE}/${path.replace(/^\/+/, '')}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  });
  return url.toString();
}

export function embedUrl(provider, slug) {
  return apiUrl(`${encodeURIComponent(provider)}/embed/${encodeURIComponent(slug)}`);
}

export async function fetchJson(path, params = {}, options = {}) {
  const response = await fetch(apiUrl(path, params), options);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
