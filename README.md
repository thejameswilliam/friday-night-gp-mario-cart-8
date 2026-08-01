# 🏁 Mario Kart 8 Deluxe Tournament Tracker

A simple Node.js web app for running a Mario Kart 8 Deluxe tournament across every
track. Play all **96 tracks** in both **Normal** and **Mirror** (192 races), enter each
player's Mario Kart points per race, and the app keeps a running leaderboard. The
highest total across all races wins.

- **2–4 players** per tournament, unlimited tournaments
- Public read-only view; **editing is behind a shared admin password**
- **SQLite** storage (single file, easy backup) via Node's built-in `node:sqlite`
- No build step, no native dependencies — plain Express + EJS

## Requirements

- **Node.js 22.5+** (Node 24 recommended). The app uses the built-in `node:sqlite`
  module, so there is nothing to compile.

## Run locally

```bash
npm install
cp .env.example .env      # then edit .env and set a real ADMIN_PASSWORD + SESSION_SECRET
npm start
```

Open http://localhost:3000. Click **Admin login** (top right) and enter your
`ADMIN_PASSWORD` to create tournaments and enter scores.

For auto-reload during development:

```bash
npm run dev
```

## How it works

- **Home** lists every tournament with a mini leaderboard and race progress.
- **Create tournament** (admin) — name it and add 2–4 players.
- **Tournament page** shows the standings up top, then all 24 cups. Each track has a
  **Normal** and **Mirror** button; a green ✓ means that race has been scored.
- **Track page** — enter each player's points for that track + variant, then Save.
  Leaving a field blank leaves that player's existing score untouched.

### Scores

You enter the **Mario Kart points directly** (whatever value you want per player), not
the finishing position. The winner is simply the highest sum across all races.

### Track images

Tracks show a colored placeholder tile with the track name by default. To use real
images, drop files into [`public/tracks/`](public/tracks/) named `<slug>.jpg`
(e.g. `rainbow-road.jpg`). See [public/tracks/README.md](public/tracks/README.md) for
the full filename list. Official Nintendo art is copyrighted — only add images you have
the right to use.

## Configuration (`.env`)

| Variable | Purpose |
| --- | --- |
| `PORT` | Port to listen on (default `3000`) |
| `ADMIN_PASSWORD` | Shared password for editing. **Set this.** |
| `SESSION_SECRET` | Random string signing session cookies. **Set this.** |
| `DB_PATH` | Optional path to the SQLite file (default `./data/tournament.db`) |

Generate a strong session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Deploy to a DigitalOcean droplet

Below is a minimal Ubuntu 22.04/24.04 droplet setup. (You can also use DigitalOcean
App Platform — point it at this repo, set the env vars, and use `npm start` as the run
command with an attached volume for the SQLite file.)

### 1. Create the droplet and install Node 24

```bash
# on the droplet, as root or with sudo
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get install -y nodejs git
```

### 2. Get the code and install

```bash
git clone <your-repo-url> /opt/mk-tournament
cd /opt/mk-tournament
npm install --omit=dev
cp .env.example .env
nano .env          # set ADMIN_PASSWORD and SESSION_SECRET
```

### 3. Run it under systemd (auto-restart, starts on boot)

Create `/etc/systemd/system/mk-tournament.service`:

```ini
[Unit]
Description=Mario Kart Tournament Tracker
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/mk-tournament
ExecStart=/usr/bin/node server.js
EnvironmentFile=/opt/mk-tournament/.env
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

Make sure the app directory (and the `data/` folder it creates) is writable by the
service user, then:

```bash
chown -R www-data:www-data /opt/mk-tournament
systemctl daemon-reload
systemctl enable --now mk-tournament
systemctl status mk-tournament
```

### 4. Put Nginx in front (recommended, enables HTTPS)

```bash
apt-get install -y nginx
```

`/etc/nginx/sites-available/mk-tournament`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/mk-tournament /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

Then add HTTPS with Let's Encrypt:

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

> If you serve over HTTPS, uncomment/adjust the session cookie to `secure: true` in
> `server.js` for hardened cookies. Behind Nginx you may also want
> `app.set('trust proxy', 1)`.

## Backups

Everything lives in one SQLite file (`data/tournament.db`). To back up, just copy it
(the app uses WAL mode, so `sqlite3 data/tournament.db ".backup backup.db"` is safest):

```bash
sqlite3 /opt/mk-tournament/data/tournament.db ".backup /root/mk-backup-$(date +%F).db"
```

## Project layout

```
server.js            Express app + all routes
db.js                SQLite setup, schema, transaction helper
tracks-catalog.js    The 96-track catalog (24 cups)
views/               EJS templates
public/              CSS and track images
data/                SQLite database (created at runtime, git-ignored)
```
