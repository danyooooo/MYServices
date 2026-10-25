# WeatherMY

Vite + Vue foundation for a Malaysian weather service.

## Development

```sh
npm install
npm run dev
```

```sh
npm run build
npm run preview
```

## Styling

The supplied stylesheet is preserved in `design/reference-base.css`.
Source: https://dani-dev.pages.dev/assets/index-DTYsqIt7.css

`src/styles/base.css` contains the reference's shared design tokens, reset,
glass cards, pills, buttons, animations, and scrollbar styling.
`src/styles/reference-shell.css` restores the original glass header and footer
rules with the original Vue scope selectors removed. WeatherMY layout styles are in
`src/styles/weather.css`. Font loading matches the original HTML, preserved in
`design/reference-index.html`.

## Weather services

WeatherMY calls `https://api.dani-dev.co.za/v1/utilities/weather` directly.
The service currently allows cross-origin browser requests without credentials.

- Forecast: current conditions, hourly and daily outlooks, weather measurements,
  and sun/moon information. Defaults to Kuala Lumpur (`Ds058`).
- Warnings: official text, issue/expiry times, validity status, and regional
  earthquakes. All date/time displays use `Asia/Kuala_Lumpur`.
- Locations: searchable forecast catalog, state/district filters, coastal and
  shipping area lists. State detail requests use IDs returned by the states
  endpoint (for example `St013`, rather than the directory's failing `01`).
- Place search: matches forecast names locally, then uses `/locations/search`
  on submission when needed. Geocoder results are labelled as a nearest forecast
  area; overseas/distant matches are rejected.
- News: Malay press releases link to verified `www.met.gov.my` document paths.
- Maps: radar and RaINS manifests provide a frame timeline and geographic bounds.
  GeoTIFF frames are decoded with geotiff.js and drawn over an OpenStreetMap
  basemap. RaINS precipitation rate is converted from kg/(m² s) to mm/h for
  display. The source raster endpoint currently responds with 404, so the map
  reports that error until the API serves those files.
- Wind: available models, cycles and elevations come from `/wind/metadata`;
  selecting a run loads `/wind/run` and shows U/V component ranges.
- Cyclones: searchable advisories, latest-per-cyclone and full archive lists,
  forecast track maps, forecast positions and original advisory text.

Coastal/shipping endpoints provide area lists, so those views link to national
warnings rather than fabricating marine forecasts. Each request has a timeout and retry state;
changing locations cancels the previous forecast request. Use Refresh for the
latest forecasts and warnings. Warning validity updates every minute.

## Verification

```sh
npm test
npm run build
```

Tests cover warning validity, Malaysia timezone handling, location hierarchy,
search/nearby-area mapping, official document URL validation, and weather scene
selection.

## Animated weather background

The background follows `weather_summary.condition` for the selected location.
`src/components/WeatherBackground.vue` controls a canvas renderer with cached
procedural cloud textures, drifting clouds, sun/moon, stars, rain, fog, and subtle
thunderstorm lightning. Wind affects drift; current precipitation affects rain
intensity only when the current condition reports rain. The `raining` prediction
for later hours does not trigger a rain background.

Missing conditions use a neutral sky. Animation pauses when the page is hidden,
and reduced-motion preferences display a still scene with no lightning flashes.
Canvas resolution and rain counts are capped for mobile. The original colored
glow background has been removed, while the glass interface remains.

`tests/weather-scenes.html`, served through Vite, is a development-only scene
preview for checking each condition and still rendering. It is outside the
production application entrypoint.

On this Windows machine, if the PowerShell `npm.ps1` shim is unavailable,
use `npm.cmd` for the same commands.
