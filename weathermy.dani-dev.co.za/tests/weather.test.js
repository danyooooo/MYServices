import test from 'node:test'
import assert from 'node:assert/strict'
import { belongsTo, formatTime, nearestForecastArea, newsUrl, number, placeContext, searchCatalog, stateName, warningIssued, warningStatus } from '../src/lib/weather.js'

test('warning expiry, scheduling and termination use the actual validity window', () => {
  const now = Date.parse('2026-10-01T15:00:00Z')
  const warning = { publishData: [{ timeFrom: '2026-10-01T22:00:00+08:00', timeUntil: '2026-10-02T02:00:00+08:00' }] }
  assert.equal(warningStatus(warning, now), 'active')
  assert.equal(warningStatus(warning, Date.parse('2026-10-01T18:00:00Z')), 'ended')
  assert.equal(warningStatus(warning, Date.parse('2026-10-01T13:00:00Z')), 'scheduled')
  assert.equal(warningStatus({ ...warning, terminatedAt: '2026-10-01T14:59:00Z' }, now), 'ended')
  assert.equal(warningStatus({ publishData: [] }, now), 'notice')
  assert.equal(warningStatus({ publishData: [{ timeUntil: 'invalid' }] }, now), 'notice')
})

test('all warning periods are considered before declaring a warning ended', () => {
  assert.equal(warningStatus({ publishData: [
    { timeUntil: '2026-10-01T14:00:00Z' }, { timeUntil: '2026-10-01T18:00:00Z' },
  ] }, Date.parse('2026-10-01T15:00:00Z')), 'active')
})

test('separate validity windows do not turn a future warning into an active one', () => {
  assert.equal(warningStatus({ publishData: [
    { timeFrom: '2026-10-01T12:00:00Z', timeUntil: '2026-10-01T14:00:00Z' },
    { timeFrom: '2026-10-01T17:00:00Z', timeUntil: '2026-10-01T18:00:00Z' },
  ] }, Date.parse('2026-10-01T15:00:00Z')), 'scheduled')
  assert.equal(warningStatus({ publishData: {} }), 'notice')
})

test('official issuance time takes priority over the later publication time', () => {
  assert.equal(warningIssued({ publishDate: '2026-10-01T14:46:50Z', publishData: [{ issuedTime: '2026-10-01T22:45:00+08:00' }] }), '2026-10-01T22:45:00+08:00')
})

test('East Malaysia divisions resolve to their state and hierarchy cycles terminate', () => {
  const state = { id: 'St501', name: 'Sarawak', type: 'east-states' }
  const division = { id: 'Dv501', name: 'Kuching', parentId: 'St501', type: 'east-divisions' }
  const district = { id: 'Ds504', parentId: 'Dv501', type: 'east-districts' }
  const lookup = new Map([state, division, district].map(p => [p.id, p]))
  assert.equal(stateName(district, lookup), 'Sarawak')
  assert.equal(placeContext(district, lookup), 'Kuching · Sarawak')
  assert.equal(belongsTo(district, 'St501', lookup), true)
  assert.equal(belongsTo(district, 'St502', lookup), false)
  const cycle = new Map([['A', { id: 'A', parentId: 'B' }], ['B', { id: 'B', parentId: 'A' }]])
  assert.equal(belongsTo(cycle.get('A'), 'C', cycle), false)
})

test('location lookup prioritises exact districts and excludes shipping areas', () => {
  const places = [
    { id: 'M1', name: 'Kuala Lumpur', type: 'west-mukim' },
    { id: 'D1', name: 'Kuala Lumpur', type: 'west-districts' },
    { id: 'Sh1', name: 'Kuala Lumpur', type: 'shipping-areas' },
  ]
  assert.deepEqual(searchCatalog(places, 'kuala lumpur').map(p => p.id), ['D1', 'M1'])
})

test('nearest area rejects overseas results and malformed coordinates', () => {
  const places = [{ id: 'D1', name: 'Kuala Lumpur', type: 'west-districts', 'center-coordinate': [3.14, 101.69] }]
  assert.equal(nearestForecastArea(places, 3.15, 101.7)?.id, 'D1')
  assert.equal(nearestForecastArea(places, 51.5, -0.1), null)
  assert.equal(nearestForecastArea(places, 'unknown', 101.7), null)
})

test('press release links stay on the verified official host', () => {
  assert.equal(newsUrl('/assets/content/siaran_media/test file.pdf'), 'https://www.met.gov.my/assets/content/siaran_media/test%20file.pdf')
  assert.equal(newsUrl('//other.example/secret'), null)
  assert.equal(newsUrl('javascript:alert(1)'), null)
  assert.equal(newsUrl('/assets/content/../../other.pdf'), null)
})

test('Malaysia time rolls over at UTC+8 and absent measurements stay absent', () => {
  assert.match(formatTime('2026-10-01T17:00:00Z'), /1:00\s?am/i)
  assert.equal(number(null), '—')
  assert.equal(number(0), '0')
})
