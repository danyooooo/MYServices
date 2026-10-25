# TransportMY

Pink themed standalone transit page in the Dani Dev Malaysian services family.
It reads the public endpoints under `https://api.dani-dev.co.za/v2/transport` directly from the browser.

## Run locally

```sh
npm install
npm run dev
```

Use `npm run build` to create the static site in `dist/`.

## Public features

- **Rapid KL:** full line and station network map with visibility filters, train arrivals, fare estimates, geocoded journey planning with a selectable map for every returned route, bus-route directory, and expandable full notices with a load-more control.
- **GoKL:** city-wide route network map with visibility filters and reported bus positions, arrival lookup, published departures by day, nearby stops and routes, and notices when available.
- **SITS:** council route network map with visibility filters and positions reported for the selected stop, arrival lookup, published departures, nearby stops and routes, and notices when available.
- **KTMB:** stations followed by `/ktmb/timetable` with `fromId`, `toId`, and `onwardDate`. This workflow uses no session endpoint or token.
- **PLUS:** toll-plaza directory with search and filters, camera directory, and embedded continuously refreshed live camera GIFs.
- **WCE:** interchange directory, connected exits, vehicle classes, toll calculator, and published rate browser.
- **TBS:** origin and destination lists, trip search, current seat layout, live arrival/departure boards, and terminal guide.

The transit maps use the Rapid KL public tile endpoint. All available lines or routes are shown by default, and selecting a stop in the provider panel moves its map to that stop. SITS maps cover the selected council. GoKL and SITS route details load in small batches so the full network can appear progressively; missing routes can be retried. GoKL and SITS vehicle positions refresh every 60 seconds while the page is visible, and can be refreshed manually. Rapid KL train locations are not provided by its public ETA endpoint. The app omits authenticated endpoints and specialized upstream flows such as ticket purchase and bus tracking by schedule/plate. Arrival estimates can be unavailable when services are closed or vehicles are not tracked. TBS live boards display a retryable error when their upstream service times out. Scheduled departure times are labelled separately from live lookups.

Rapid KL journey maps use each returned leg's geometry and stop coordinates, including walking transfers. Other journey options remain visible as faint paths, and selecting an option highlights its route. Rapid KL bus route details and live bus positions are unavailable while the provider server is offline. Announcement HTML is sanitized before it is displayed.
