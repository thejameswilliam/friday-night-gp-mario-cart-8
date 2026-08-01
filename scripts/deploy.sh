#!/usr/bin/env bash
# Runs ON THE DROPLET, invoked by the GitHub Actions deploy workflow after it has
# rsynced the latest code into /opt/mk-tournament. Safe to run by hand too.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Installing production dependencies"
if [ -f package-lock.json ]; then
  npm ci --omit=dev
else
  npm install --omit=dev
fi

echo "==> Restarting service"
# Requires a NOPASSWD sudoers rule for this exact command (see README).
sudo systemctl restart mk-tournament

echo "==> Done. Service status:"
# 'status' is readable without sudo, so no extra sudoers rule is needed here.
systemctl status mk-tournament --no-pager --lines=0 || true
