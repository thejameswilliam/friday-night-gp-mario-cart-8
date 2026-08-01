require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const { db, transaction } = require('./db');
const { CUPS, TRACKS, slugify } = require('./tracks-catalog');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-insecure-secret-change-me';
// Set BEHIND_PROXY=true in production when served via Nginx over HTTPS.
// It makes Express trust the proxy and marks the session cookie Secure.
const BEHIND_PROXY = process.env.BEHIND_PROXY === 'true';

const VARIANTS = ['normal', 'mirror'];
const trackBySlug = new Map(TRACKS.map((t) => [t.slug, t]));
const allSlugs = new Set(TRACKS.map((t) => t.slug));

// The full catalog grouped by cup, with resolved track objects. Static, built once.
const catalogCups = CUPS.map((c) => ({
  cup: c.cup,
  set: c.set,
  tracks: c.tracks.map((name) => trackBySlug.get(slugify(name))),
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
if (BEHIND_PROXY) app.set('trust proxy', 1); // trust Nginx for X-Forwarded-* / secure cookies
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      sameSite: 'lax',
      secure: BEHIND_PROXY, // only send the cookie over HTTPS in production
    },
  })
);

// Make admin flag + a color helper available to every view.
app.use((req, res, next) => {
  res.locals.isAdmin = !!req.session.isAdmin;
  res.locals.slugColor = slugColor;
  next();
});

// ---------- helpers ----------

// Deterministic pleasant color per track slug, for the placeholder tiles.
function slugColor(slug) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) % 360;
  return { h, from: `hsl(${h} 70% 55%)`, to: `hsl(${(h + 40) % 360} 75% 42%)` };
}

function requireAdmin(req, res, next) {
  if (req.session.isAdmin) return next();
  return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
}

function getTournament(id) {
  return db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id);
}

function getPlayers(tournamentId) {
  return db
    .prepare('SELECT * FROM players WHERE tournament_id = ? ORDER BY sort_order, id')
    .all(tournamentId);
}

// Set of track slugs a tournament includes.
function getTournamentTracks(tournamentId) {
  const rows = db.prepare('SELECT track_slug FROM tournament_tracks WHERE tournament_id = ?').all(tournamentId);
  return new Set(rows.map((r) => r.track_slug));
}

function getTournamentTrackCount(tournamentId) {
  return db.prepare('SELECT COUNT(*) AS n FROM tournament_tracks WHERE tournament_id = ?').get(tournamentId).n;
}

function tournamentHasTrack(tournamentId, slug) {
  return !!db
    .prepare('SELECT 1 FROM tournament_tracks WHERE tournament_id = ? AND track_slug = ?')
    .get(tournamentId, slug);
}

// Returns { [player_id]: totalPoints } for a tournament.
function getStandings(tournamentId) {
  const rows = db
    .prepare('SELECT player_id, SUM(points) AS total FROM scores WHERE tournament_id = ? GROUP BY player_id')
    .all(tournamentId);
  const totals = {};
  for (const r of rows) totals[r.player_id] = r.total || 0;
  return totals;
}

// Count of scored (track,variant) races in a tournament.
function getProgress(tournamentId) {
  const row = db
    .prepare(
      `SELECT COUNT(DISTINCT track_slug || '|' || variant) AS done
       FROM scores WHERE tournament_id = ?`
    )
    .get(tournamentId);
  const totalRaces = getTournamentTrackCount(tournamentId) * VARIANTS.length;
  return { done: row.done || 0, total: totalRaces };
}

// ---------- routes ----------

app.get('/', (req, res) => {
  const tournaments = db.prepare('SELECT * FROM tournaments ORDER BY created_at DESC, id DESC').all();
  const enriched = tournaments.map((t) => {
    const players = getPlayers(t.id);
    const totals = getStandings(t.id);
    const ranked = players
      .map((p) => ({ ...p, total: totals[p.id] || 0 }))
      .sort((a, b) => b.total - a.total);
    return { ...t, players: ranked, progress: getProgress(t.id) };
  });
  res.render('home', { tournaments: enriched });
});

// ----- auth -----
app.get('/login', (req, res) => {
  res.render('login', { next: req.query.next || '/', error: null });
});

app.post('/login', (req, res) => {
  const { password, next } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.redirect(next && next.startsWith('/') ? next : '/');
  }
  res.status(401).render('login', { next: next || '/', error: 'Incorrect password.' });
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// ----- create tournament -----
app.get('/tournaments/new', requireAdmin, (req, res) => {
  res.render('new-tournament', {
    error: null,
    cups: catalogCups,
    form: { name: '', players: ['', '', '', ''], selected: new Set(allSlugs) }, // default: all courses
  });
});

app.post('/tournaments', requireAdmin, (req, res) => {
  const name = (req.body.name || '').trim();
  const rawPlayers = [req.body.p1, req.body.p2, req.body.p3, req.body.p4].map((n) => (n || '').trim());
  const playerNames = rawPlayers.filter(Boolean);

  // Selected courses: checkboxes named "tracks". Can be a single string or array.
  let picked = req.body.tracks || [];
  if (typeof picked === 'string') picked = [picked];
  const selected = picked.filter((s) => allSlugs.has(s));

  const rerender = (error) =>
    res.status(400).render('new-tournament', {
      error,
      cups: catalogCups,
      form: { name, players: rawPlayers, selected: new Set(selected) },
    });

  if (!name) return rerender('Tournament name is required.');
  if (playerNames.length < 2 || playerNames.length > 4) return rerender('Enter between 2 and 4 players.');
  if (selected.length === 0) return rerender('Select at least one course.');

  const insertTournament = db.prepare('INSERT INTO tournaments (name) VALUES (?)');
  const insertPlayer = db.prepare('INSERT INTO players (tournament_id, name, sort_order) VALUES (?, ?, ?)');
  const insertTrack = db.prepare('INSERT INTO tournament_tracks (tournament_id, track_slug) VALUES (?, ?)');
  const id = transaction(() => {
    const { lastInsertRowid } = insertTournament.run(name);
    playerNames.forEach((pn, i) => insertPlayer.run(lastInsertRowid, pn, i));
    // Insert in catalog order so the dashboard stays consistently ordered.
    for (const t of TRACKS) if (selected.includes(t.slug)) insertTrack.run(lastInsertRowid, t.slug);
    return lastInsertRowid;
  });
  res.redirect('/tournaments/' + id);
});

app.post('/tournaments/:id/delete', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM tournaments WHERE id = ?').run(req.params.id);
  res.redirect('/');
});

// ----- tournament dashboard -----
app.get('/tournaments/:id', (req, res) => {
  const tournament = getTournament(req.params.id);
  if (!tournament) return res.status(404).render('404');

  const players = getPlayers(tournament.id);
  const totals = getStandings(tournament.id);
  const standings = players
    .map((p) => ({ ...p, total: totals[p.id] || 0 }))
    .sort((a, b) => b.total - a.total);

  // Which (slug,variant) races have any score entered.
  const scoredRows = db
    .prepare('SELECT DISTINCT track_slug, variant FROM scores WHERE tournament_id = ?')
    .all(tournament.id);
  const scored = new Set(scoredRows.map((r) => r.track_slug + '|' + r.variant));

  // Only show the courses this tournament includes; drop cups with none.
  const included = getTournamentTracks(tournament.id);
  const cups = catalogCups
    .map((c) => ({ ...c, tracks: c.tracks.filter((t) => included.has(t.slug)) }))
    .filter((c) => c.tracks.length > 0);

  res.render('tournament', {
    tournament,
    players,
    standings,
    cups,
    variants: VARIANTS,
    scored,
    progress: getProgress(tournament.id),
  });
});

// ----- score entry for a single track+variant -----
app.get('/tournaments/:id/track/:slug/:variant', (req, res) => {
  const tournament = getTournament(req.params.id);
  const track = trackBySlug.get(req.params.slug);
  const variant = req.params.variant;
  if (!tournament || !track || !VARIANTS.includes(variant)) return res.status(404).render('404');
  if (!tournamentHasTrack(tournament.id, track.slug)) return res.status(404).render('404');

  const players = getPlayers(tournament.id);
  const scoreRows = db
    .prepare('SELECT player_id, points FROM scores WHERE tournament_id = ? AND track_slug = ? AND variant = ?')
    .all(tournament.id, track.slug, variant);
  const scoreMap = {};
  for (const r of scoreRows) scoreMap[r.player_id] = r.points;

  res.render('track', { tournament, track, variant, players, scoreMap });
});

app.post('/tournaments/:id/track/:slug/:variant', requireAdmin, (req, res) => {
  const tournament = getTournament(req.params.id);
  const track = trackBySlug.get(req.params.slug);
  const variant = req.params.variant;
  if (!tournament || !track || !VARIANTS.includes(variant)) return res.status(404).render('404');
  if (!tournamentHasTrack(tournament.id, track.slug)) return res.status(404).render('404');

  const players = getPlayers(tournament.id);
  const upsert = db.prepare(`
    INSERT INTO scores (tournament_id, track_slug, variant, player_id, points, updated_at)
    VALUES (@tid, @slug, @variant, @pid, @points, datetime('now'))
    ON CONFLICT (tournament_id, track_slug, variant, player_id)
    DO UPDATE SET points = excluded.points, updated_at = datetime('now')
  `);
  transaction(() => {
    for (const p of players) {
      const raw = req.body['points_' + p.id];
      if (raw === undefined || raw === '') continue; // leave blank untouched
      const points = parseInt(raw, 10);
      if (Number.isNaN(points)) continue;
      upsert.run({ tid: tournament.id, slug: track.slug, variant, pid: p.id, points });
    }
  });
  res.redirect('/tournaments/' + tournament.id + '#' + track.slug);
});

app.use((req, res) => res.status(404).render('404'));

app.listen(PORT, () => {
  console.log(`🏁 Mario Kart tournament tracker running on http://localhost:${PORT}`);
  if (ADMIN_PASSWORD === 'changeme') {
    console.warn('⚠️  Using default ADMIN_PASSWORD "changeme" — set ADMIN_PASSWORD in your .env for production.');
  }
});
