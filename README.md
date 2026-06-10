# MarketOracle

MarketOracle is a free stock intelligence dashboard built with React and Node.js. It fetches live stock data and intraday charts from Yahoo Finance through a backend proxy, then renders a polished dashboard in the browser.

## What this repo contains

- `apps/backend` — Express proxy API for live stock quotes and chart history
- `apps/frontend` — React + Vite dashboard UI for symbol lookup, charts, and live updates

## Local setup

1. Install dependencies from the repository root:
   ```bash
   npm install
   ```

2. Start the backend and frontend together from the repository root:
   ```bash
   npm run dev
   ```

3. Start a single service directly:
   ```bash
   npm run dev:backend
   npm run dev:frontend
   ```

4. Copy the example environment file and configure local values:
   ```bash
   cp .env.example .env
   ```

5. Start the full stack with Docker Compose:
   ```bash
   npm run docker:up
   ```

6. Run Prisma setup for backend once the database is available:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate:dev
   ```

7. Open the dashboard:
   - `http://localhost:5173`

## Milestone 1: Monorepo Setup

This milestone includes:
- monorepo workspace structure with `apps/` and `packages/`
- root workspace scripts for `dev`, `build`, `lint`, and `format`
- Docker Compose for frontend, backend, AI engine, PostgreSQL, and Redis
- TypeScript configs for frontend and shared workspace
- ESLint and Prettier tooling across the monorepo
- local startup scripts and app metadata for service scaffolding

## Milestone 2: PostgreSQL + Prisma

This milestone includes:
- PostgreSQL schema scaffolding in `apps/backend/prisma/schema.prisma`
- Prisma client generation and migration scripts in `apps/backend/package.json`
- Docker Compose backend database config using `DATABASE_URL`
- local `.env.example` PostgreSQL and Redis examples
- backend environment loading via `dotenv`

## Notes

- The backend proxies Yahoo Finance data to avoid browser CORS restrictions.
- No API key is required for the live quote and chart endpoints.
- The dashboard refreshes quote data every 30 seconds.

## GitHub workflow

A GitHub Actions workflow is included to validate the backend and frontend packages on push.
