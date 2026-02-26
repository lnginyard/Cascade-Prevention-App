# Cascade Prevention Engine Dashboard

Interactive resilience simulation dashboard with a broadcast-style globe, event-driven cascade propagation, explainable AI risk analysis, full report exports, and demo presets.

## Quickstart

- Requirements: Node.js 20+, npm 10+
- Install: `npm ci`
- Run dev: `npm run dev`
- Build: `npm run build`
- Preview build: `npm run preview`

## Demo Script (for judges)

1. Open app and choose **AWS Outage Ripple** preset.
2. Run simulation and drag/rotate the globe.
3. Click region hotspots to zoom and inspect propagation.
4. Toggle **Cross-region reroute** and run simulation again.
5. Compare risk explainability, cost impact, and action alerts.
6. Export artifacts: CSV, PDF, JSON, PNG, and incident playbook.
7. Review observability log panel for timestamped user actions.

## What to look at

- **State + Data flow**: centralized reducer store (`src/state/Store.jsx`) with local data hook (`src/hooks/useData.js`).
- **Scenarios**: calm baseline, hurricane impact, AWS outage ripple.
- **Resilience controls**: failover toggle alters cascade intensity and risk metrics.
- **Explainability**: AI panel shows why risk changed and suggested mitigations.
- **Exportability**: full-report exports (not graph-only) for reproducible review.

## Reproducible Demo Harness

- Scripted run: `bash scripts/demo.sh`
- Docker:
  - Build + run with compose: `docker compose up --build`
  - Open: `http://localhost:4173`

## CI

- GitHub Actions workflow runs `npm ci` and `npm run build` on pushes/PRs.

## Security notes

- App uses local JSON demo data and does not require secrets.
- Do not commit `.env` files or hardcode credentials.
- For production, fetch event data from secure services (e.g., API Gateway/S3) with IAM-backed access.
