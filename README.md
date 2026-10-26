# Cascade Prevention Engine — Interactive Dashboard

An interactive **simulation dashboard** for exploring disruption scenarios, visualizing cascading impact across regions, and reviewing explainability-style risk and mitigation signals.

This is the companion presentation/demo for [AI-Cascade-Prevention-Engine](https://github.com/lnginyard/AI-Cascade-Prevention-Engine).

## Important scope note

The dashboard uses local demo/scenario data. It is intended to demonstrate a workflow and interface, not to claim live AWS telemetry ingestion or production incident prevention. Treat scenario outcomes and risk metrics as simulated unless a specific live integration is documented and verified.

## Highlights

- Globe-based cascade visualization and region hotspots
- Scenario presets, including baseline and disruption examples
- Failover/reroute controls for comparing simulation outcomes
- Risk explanation and suggested mitigation panels
- Event/observability log panel for user actions
- Report export options documented by the application (CSV, PDF, JSON, PNG, and incident playbook)
- Responsive React/Vite interface
- Docker-based local run option
- GitHub Actions workflow configured to install dependencies and run a production build

## Technology

- React
- Vite
- JavaScript / JSX
- Tailwind CSS
- D3 geographic utilities and TopoJSON/world-atlas data
- Docker / Docker Compose
- GitHub Actions

## Run locally

Requirements: Node.js 20+ and npm 10+.

```bash
npm ci
npm run dev
```

Vite prints the local development URL in the terminal.

Build and preview the production bundle:

```bash
npm run build
npm run preview
```

Run the scripted demo:

```bash
bash scripts/demo.sh
```

Run with Docker Compose:

```bash
docker compose up --build
```

Then open `http://localhost:4173` if that is the port published by the current Compose configuration.

## Suggested demo walkthrough

1. Choose a scenario preset such as **AWS Outage Ripple**.
2. Run the simulation and inspect the globe and affected regions.
3. Toggle the cross-region reroute/failover control and run the scenario again.
4. Compare the risk explanation and mitigation suggestions.
5. Export the report artifacts and inspect the event log.

Feature availability should be verified against the current branch before presenting this walkthrough.

## Project structure

- `src/App.jsx` — application layout and major dashboard panels
- `src/state/Store.jsx` — shared state and simulation workflow
- `src/hooks/useData.js` — local data hook
- `src/data/` — scenario data and UI components
- `scripts/demo.sh` — scripted demo helper
- `.github/workflows/ci.yml` — dependency installation and build workflow

## Relationship to AICPE

The dashboard illustrates the user-facing simulation and decision-support experience. The separate engine repository contains the AWS/TypeScript infrastructure and handler foundations. The dashboard should not be described as proof that the engine is connected to live AWS telemetry unless that connection has been implemented and tested.

## Before a production deployment

- Replace or explicitly label all demo data.
- Connect only through authenticated, least-privilege APIs.
- Add end-to-end and accessibility tests.
- Validate export contents, error states, and large-scenario performance.
- Never commit credentials or `.env` files.
