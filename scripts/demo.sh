#!/usr/bin/env bash
set -euo pipefail

echo "[demo] Installing dependencies"
npm ci

echo "[demo] Building app"
npm run build

echo "[demo] Starting preview on http://localhost:4173"
npm run preview -- --host 0.0.0.0 --port 4173
