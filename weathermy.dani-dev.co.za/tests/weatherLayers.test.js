import test from 'node:test'
import assert from 'node:assert/strict'
import { manifestFrames, rasterColor, rasterUrl } from '../src/lib/weatherLayers.js'

test('RaINS timeline keeps only the latest model run and orders lead times', () => {
  const manifest = { latestBaseEpochMili: 2000, frames: [
    { baseEpochMili: 1000, validEpochMili: 1000, url: '/rains/cog/old.tif' },
    { baseEpochMili: 2000, validEpochMili: 2600, url: '/rains/cog/later.tif' },
    { baseEpochMili: 2000, validEpochMili: 2000, url: '/rains/cog/now.tif' },
  ] }
  assert.deepEqual(manifestFrames(manifest, 'rains').map(frame => frame.url), ['/rains/cog/now.tif', '/rains/cog/later.tif'])
  assert.deepEqual(manifestFrames({ ...manifest, latestBaseEpochMili: 3000 }, 'rains').map(frame => frame.url), ['/rains/cog/now.tif', '/rains/cog/later.tif'])
})

test('raster paths stay on the weather API and rain units are converted to mm/h colors', () => {
  assert.equal(rasterUrl('/rains/cog/frame.tif', 'rains'), 'https://api.dani-dev.co.za/v1/utilities/weather/rains/cog/frame.tif')
  assert.equal(rasterUrl('https://example.org/frame.tif', 'rains'), '')
  assert.deepEqual(rasterColor(0, 'rains'), [0, 0, 0, 0])
  assert.deepEqual(rasterColor(1 / 3600, 'rains'), [34, 197, 94, 190])
})
