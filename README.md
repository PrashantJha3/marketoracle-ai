# MarketOracle

MarketOracle is a free stock intelligence dashboard built with React and Node.js. It fetches live stock data and intraday charts from Yahoo Finance through a backend proxy, then renders a polished dashboard in the browser.

## What this repo contains

- `apps/backend` — Express proxy API for live stock quotes and chart history
- `apps/frontend` — React + Vite dashboard UI for symbol lookup, charts, and live updates

## Local setup

1. Install dependencies from the workspace root:
   ```bash
   cd apps/backend
   npm install
   cd ../frontend
   npm install
   ```

2. Start backend and frontend together:
   - Option 1: run independently
     ```bash
     cd apps/backend
     npm run dev
     ```
     ```bash
     cd apps/frontend
     npm run dev
     ```

   - Option 2: from the root workspace (requires Turborepo dependencies installed):
     ```bash
     cd ../..
     npm install
     npm run dev
     ```

3. Open the app in your browser:
   - `http://localhost:5173`

## Notes

- The backend proxies Yahoo Finance data to avoid browser CORS restrictions.
- No API key is required for the live quote and chart endpoints.
- The dashboard refreshes quote data every 30 seconds.

## GitHub workflow

A GitHub Actions workflow is included to validate the backend and frontend packages on push.
