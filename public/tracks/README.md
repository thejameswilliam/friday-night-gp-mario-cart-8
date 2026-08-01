# Track images

Drop track images into this folder to replace the colored placeholder tiles.

- **Filename must be the track's slug + `.jpg`** — e.g. `mario-kart-stadium.jpg`,
  `rainbow-road.jpg`, `bowsers-castle.jpg`.
- Recommended size: 16:9, around 480×270px.
- Any track without an image just shows a colored tile with its name — the app
  keeps working with zero images.

To see every expected filename, run from the project root:

```bash
node -e "require('./tracks-catalog').TRACKS.forEach(t => console.log(t.slug + '.jpg'))"
```

Note: official Nintendo track thumbnails are copyrighted. Only add images you have
the right to use.
