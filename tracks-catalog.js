// Mario Kart 8 Deluxe — full track catalog (96 tracks across 24 cups).
// Base game (48) + Booster Course Pass (48).
// `slug` is used for image lookup: drop public/tracks/<slug>.jpg to override the placeholder.

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const CUPS = [
  // ---- Base game ----
  { cup: 'Mushroom Cup', set: 'Base', tracks: ['Mario Kart Stadium', 'Water Park', 'Sweet Sweet Canyon', 'Thwomp Ruins'] },
  { cup: 'Flower Cup', set: 'Base', tracks: ['Mario Circuit', 'Toad Harbor', 'Twisted Mansion', 'Shy Guy Falls'] },
  { cup: 'Star Cup', set: 'Base', tracks: ['Sunshine Airport', 'Dolphin Shoals', 'Electrodrome', 'Mount Wario'] },
  { cup: 'Special Cup', set: 'Base', tracks: ['Cloudtop Cruise', 'Bone-Dry Dunes', "Bowser's Castle", 'Rainbow Road'] },
  { cup: 'Shell Cup', set: 'Base', tracks: ['Moo Moo Meadows', 'Mario Circuit (GBA)', 'Cheep Cheep Beach', "Toad's Turnpike"] },
  { cup: 'Banana Cup', set: 'Base', tracks: ['Dry Dry Desert', 'Donut Plains 3', 'Royal Raceway', 'DK Jungle'] },
  { cup: 'Leaf Cup', set: 'Base', tracks: ['Wario Stadium', 'Sherbet Land', 'Music Park', 'Yoshi Valley'] },
  { cup: 'Lightning Cup', set: 'Base', tracks: ['Tick-Tock Clock', 'Piranha Plant Slide', 'Grumble Volcano', 'Rainbow Road (N64)'] },
  { cup: 'Egg Cup', set: 'Base', tracks: ['Yoshi Circuit', 'Excitebike Arena', 'Dragon Driftway', 'Mute City'] },
  { cup: 'Triforce Cup', set: 'Base', tracks: ["Wario's Gold Mine", 'Rainbow Road (SNES)', 'Ice Ice Outpost', 'Hyrule Circuit'] },
  { cup: 'Crossing Cup', set: 'Base', tracks: ['Baby Park', 'Cheese Land', 'Wild Woods', 'Animal Crossing'] },
  { cup: 'Bell Cup', set: 'Base', tracks: ['Neo Bowser City', 'Ribbon Road', 'Super Bell Subway', 'Big Blue'] },
  // ---- Booster Course Pass ----
  { cup: 'Golden Dash Cup', set: 'DLC', tracks: ['Paris Promenade', 'Toad Circuit', 'Choco Mountain', 'Coconut Mall'] },
  { cup: 'Lucky Cat Cup', set: 'DLC', tracks: ['Tokyo Blur', 'Shroom Ridge', 'Sky Garden', 'Ninja Hideaway'] },
  { cup: 'Turnip Cup', set: 'DLC', tracks: ['New York Minute', 'Mario Circuit 3', 'Kalimari Desert', 'Waluigi Pinball'] },
  { cup: 'Propeller Cup', set: 'DLC', tracks: ['Sydney Sprint', 'Snow Land', 'Mushroom Gorge', 'Sky-High Sundae'] },
  { cup: 'Rock Cup', set: 'DLC', tracks: ['London Loop', 'Boo Lake', 'Rock Rock Mountain', 'Maple Treeway'] },
  { cup: 'Moon Cup', set: 'DLC', tracks: ['Berlin Byways', 'Peach Gardens', 'Merry Mountain', 'Rainbow Road (3DS)'] },
  { cup: 'Fruit Cup', set: 'DLC', tracks: ['Amsterdam Drift', 'Riverside Park', 'DK Summit', "Yoshi's Island"] },
  { cup: 'Boomerang Cup', set: 'DLC', tracks: ['Bangkok Rush', 'Mario Circuit (DS)', 'Waluigi Stadium', 'Singapore Speedway'] },
  { cup: 'Feather Cup', set: 'DLC', tracks: ['Athens Dash', 'Daisy Cruiser', 'Moonview Highway', 'Squeaky Clean Sprint'] },
  { cup: 'Cherry Cup', set: 'DLC', tracks: ['Los Angeles Laps', 'Sunset Wilds', 'Koopa Cape', 'Vancouver Velocity'] },
  { cup: 'Acorn Cup', set: 'DLC', tracks: ['Rome Avanti', 'DK Mountain', 'Daisy Circuit', 'Piranha Plant Cove'] },
  { cup: 'Spiny Cup', set: 'DLC', tracks: ["Rosalina's Ice World", 'Bowser Castle 3', 'Rainbow Road (Wii)', 'Madrid Drive'] },
];

// Flatten into an ordered list of tracks with a stable sort order.
const TRACKS = [];
let order = 0;
for (const { cup, set, tracks } of CUPS) {
  for (const name of tracks) {
    TRACKS.push({
      slug: slugify(name),
      name,
      cup,
      set,
      sort_order: order++,
    });
  }
}

module.exports = { CUPS, TRACKS, slugify };
