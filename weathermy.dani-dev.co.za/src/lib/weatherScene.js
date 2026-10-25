const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

export function resolveWeatherScene(forecast, now = Date.now()) {
  const condition = String(forecast?.weather_summary?.condition || '').toLowerCase()
  const known = /sun|clear|cloud|overcast|rain|drizzle|shower|storm|thunder|fog|mist|haze|wind/.test(condition)
  const storm = /storm|thunder/.test(condition)
  const rain = storm || /rain|drizzle|shower/.test(condition)
  const mist = /fog|mist|haze/.test(condition)
  const partlyCloudy = /partly|few|scattered/.test(condition)
  const cloud = /cloud|overcast/.test(condition)
  const sunrise = Date.parse(forecast?.astronomy?.sun?.sunrise)
  const sunset = Date.parse(forecast?.astronomy?.sun?.sunset)
  const hour = new Date(now + 8 * 3600000).getUTCHours()
  const night = condition.includes('night') ||
    ((!known || mist || /wind/.test(condition)) && (Number.isFinite(sunrise) && Number.isFinite(sunset)
      ? now < sunrise || now >= sunset : hour < 7 || hour >= 19))
  const rawWind = Number(forecast?.widgets?.['wind-speed']?.value)
  const wind = Number.isFinite(rawWind) ? clamp(rawWind, 0, 80) : 3
  const directions = { N: 180, NE: 225, E: 270, SE: 315, S: 0, SW: 45, W: 90, NW: 135 }
  const bearing = directions[forecast?.widgets?.['wind-speed']?.additionalInfo] ?? 90
  const drift = Math.sin(bearing * Math.PI / 180)
  const rawPrecipitation = Number(forecast?.widgets?.precipitation?.value)
  const precipitation = Number.isFinite(rawPrecipitation) ? Math.max(0, rawPrecipitation) : 0
  const kind = !known ? 'neutral' : storm ? 'storm' : rain ? 'rain' : mist ? 'mist' : cloud ? 'cloudy' : 'clear'

  return {
    kind,
    night,
    cloudCover: !known ? 0 : storm ? 1 : rain ? .88 : mist ? .55 : partlyCloudy ? .38 : cloud ? .78 : .08,
    rainIntensity: rain ? clamp(.35 + precipitation / 12 + (storm ? .3 : 0), .35, 1) : 0,
    windSpeed: 5 + wind * .65,
    windDirection: Math.abs(drift) < .15 ? .15 : drift,
    moonPhase: Number.isFinite(forecast?.astronomy?.moon?.phase) ? clamp(forecast.astronomy.moon.phase, 0, 1) : .25,
  }
}
