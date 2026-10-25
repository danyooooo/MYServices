import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveWeatherScene } from '../src/lib/weatherScene.js'

const forecast = (condition, extra = {}) => ({ weather_summary: { condition }, ...extra })

test('current conditions select sky, cloud cover and precipitation effects', () => {
  const clear = resolveWeatherScene(forecast('sunny'))
  const partial = resolveWeatherScene(forecast('partly-cloudy'))
  const cloudy = resolveWeatherScene(forecast('cloudy-night'))
  assert.equal(clear.kind, 'clear')
  assert.equal(clear.night, false)
  assert.equal(cloudy.night, true)
  assert.ok(clear.cloudCover < partial.cloudCover && partial.cloudCover < cloudy.cloudCover)
  assert.equal(cloudy.rainIntensity, 0)
  assert.equal(resolveWeatherScene(forecast('rain-night')).kind, 'rain')
  assert.equal(resolveWeatherScene(forecast('thunderstorm')).kind, 'storm')
  assert.equal(resolveWeatherScene(forecast('haze')).kind, 'mist')
})

test('future rain predictions do not change the current sky', () => {
  const scene = resolveWeatherScene(forecast('cloudy', { raining: { timestamp: '2026-10-02T03:00:00Z', level: 'heavy' }, widgets: { precipitation: { value: 20 } } }))
  assert.equal(scene.kind, 'cloudy')
  assert.equal(scene.rainIntensity, 0)
})

test('rain intensity and wind are bounded, and wind travels away from its reported source', () => {
  const scene = resolveWeatherScene(forecast('thunderstorm-night', { widgets: { precipitation: { value: 1000 }, 'wind-speed': { value: 500, additionalInfo: 'E' } } }))
  assert.equal(scene.rainIntensity, 1)
  assert.equal(scene.windSpeed, 57)
  assert.equal(scene.windDirection, -1)
  assert.equal(resolveWeatherScene(forecast('rain', { widgets: { precipitation: { value: -10 } } })).rainIntensity, .35)
})

test('absent or unknown conditions produce a neutral scene without invented rain', () => {
  assert.equal(resolveWeatherScene(null).kind, 'neutral')
  assert.equal(resolveWeatherScene(forecast('unavailable')).cloudCover, 0)
  assert.equal(resolveWeatherScene(null, Date.parse('2026-10-01T15:00:00Z')).night, true)
  assert.equal(resolveWeatherScene(null, Date.parse('2026-10-01T04:00:00Z')).night, false)
  assert.equal(resolveWeatherScene(forecast('fog'), Date.parse('2026-10-01T15:00:00Z')).night, true)
})
