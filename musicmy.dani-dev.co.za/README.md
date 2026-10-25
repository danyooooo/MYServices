# MusicMY

MusicMY is a green-themed music metadata lookup built with Vue and Vite. It
uses [malaysian-api](https://github.com/danyooooo/malaysian-api) through
`https://api.dani-dev.co.za/v2/music`.

## Run locally

```sh
npm install
npm run dev
```

Use `npm run build` for a production build.

## What the page does

- Searches track, artist, and album records with `country=MY`.
- Shows the MY track chart feed as a starting point.
- Retrieves more fields for a selected record when the API has them.
- Lets visitors copy the displayed metadata as JSON.
- Shows source and artwork links when valid URLs are available.
- Keeps the search result fields visible if a detail lookup fails.

The page does not display lyric text or stream audio. The `/lyrics` endpoint
is used only to enrich track metadata; the returned lyric text is never
rendered or copied.

See [API_CONTENT.md](./API_CONTENT.md) for the endpoint inventory and live
response notes.
