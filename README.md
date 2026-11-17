# Market Pulse

**Discover investment opportunities. Understand unusual market activity.**

Market Pulse is an experimental market intelligence dashboard built with React and TypeScript. It combines longer-term investment research with live market monitoring to help individual investors identify **what deserves a closer look — and why**.

This is a personal software project, not a trading platform or an investment advisory service.

## What it aims to do

### Opportunity Radar

Find companies worth researching using price trends and selected fundamental metrics. Each opportunity should explain the underlying signals and their limitations rather than issue a buy recommendation.

### Live Market Monitor

Follow selected instruments, visualize changing prices, and surface unusual price or volume activity. A local mock API replays recorded market data, so the real-time interface is demonstrable without paid market data or API keys.

## Tech stack

| Area                 | Planned technology                        |
| -------------------- | ----------------------------------------- |
| Frontend             | React, TypeScript, Vite                   |
| Routing              | React Router                              |
| Client state         | Redux Toolkit                             |
| API data and caching | RTK Query                                 |
| Live updates         | Server-Sent Events (SSE)                  |
| Styling              | SCSS Modules                              |
| Runtime validation   | Zod                                       |
| Testing              | Vitest, React Testing Library, Playwright |
| Local demo API       | Node.js, TypeScript, Fastify              |

The frontend is designed around a feature-based structure, typed API contracts, and a clear separation between UI, data access, and live connections. Dependencies will be added only when a feature requires them.

## Architecture

```text
                   REST: snapshots, opportunities
React + TypeScript <----------------------------- Node mock API
        |                                               |
        +<-------------- SSE: live events ---------------+

                 Later: separate private backend
```

- **REST** supplies initial market snapshots, historical data, and opportunity results.
- **SSE** delivers live price updates and anomaly events; the UI handles connection and stale-data states.
- **RTK Query** caches API data; **Redux Toolkit** holds shared client-side state when needed.
- The public repository will include a **self-contained mock server**. Real market-data integrations and server-side analysis may live in a separate private service.

Private backend source code is not a substitute for securing its deployed API. No API secrets belong in the browser bundle.

## Running locally

**Requirements:** Node.js 24 (`.nvmrc` pins 24.16.0). Installation fails on unsupported Node versions because `engine-strict` is enabled in `.npmrc`.

```bash
npm install
npm run dev
```

The development server prints its local URL. No API keys or external services are needed.

| Command                                   | Purpose                                               |
| ----------------------------------------- | ----------------------------------------------------- |
| `npm run dev`                             | Start the Vite development server                     |
| `npm run build`                           | Type-check and create a production build in `dist/`   |
| `npm run preview`                         | Serve the production build locally                    |
| `npm run typecheck`                       | Run the TypeScript project check                      |
| `npm run lint`                            | Run ESLint with type-aware rules                      |
| `npm run format`                          | Format files with Prettier                            |
| `npm run format:check`                    | Check formatting without changing files               |
| `npm test`                                | Run the test suite once                               |
| `npm run test:watch`                      | Run tests in watch mode                               |
| `npm run mock-server`                     | Start the mock API on port 4000 (restarts on changes) |
| `npm run mock-server:record`              | Record the replayed market data (see below)           |
| `npm run mock-server:record-fundamentals` | Re-record SEC fundamentals (see below)                |

To override configuration locally, copy `.env.example` to `.env.local`. Only non-secret values belong there: every `VITE_*` variable is visible in the browser bundle.

### Mock API

The mock API replays real market data from **4–6 November 2026**, including the 5 November sell-off, at 300× speed: one 5-minute bar per second, restarting from the beginning after 6 November. All responses label the data as a historical replay and include the replay window, speed, and market time.

1. Record the market data once. No API key is needed; the files are saved to `mock-server/data/recorded/`, which is gitignored.

   ```bash
   npm run mock-server:record
   ```

2. Start the mock API and the UI in separate terminals. Vite proxies `/api` to the mock API.

   ```bash
   npm run mock-server
   npm run dev
   ```

| Endpoint                   | Purpose                                                             |
| -------------------------- | ------------------------------------------------------------------- |
| `GET /api/market/snapshot` | Latest quotes at the current replay time                            |
| `GET /api/opportunities`   | Screening results from completed daily closes and SEC fundamentals  |
| `GET /api/market/stream`   | SSE events: `quote.updated`, `anomaly.detected`, `replay.restarted` |

Instruments: S&P 500, Nasdaq-100, DAX, NVIDIA, AMD, Alphabet, Oracle, Eli Lilly, Strategy (MSTR), Bitcoin, and EUR/USD.

### Data sources and licensing

| Data                                  | Source        | In the repository                                               |
| ------------------------------------- | ------------- | --------------------------------------------------------------- |
| Daily and 5-minute prices             | Yahoo Finance | No. Recorded locally; Yahoo's terms do not allow redistribution |
| Quarterly revenue, annual diluted EPS | SEC EDGAR     | Yes, in `mock-server/data/sec-fundamentals.json`                |

Yahoo Finance serves 5-minute bars only for roughly the last 60 days, so the 4–6 November window can be recorded until about early January 2027. Keep a private backup of `mock-server/data/recorded/` if you need the replay after that.

To re-record SEC fundamentals, set `SEC_USER_AGENT` in `.env` (see `.env.example`): the SEC requires a name and contact email for automated requests.

## Development plan

See [docs/ROADMAP.md](docs/ROADMAP.md) for implementation phases, mock-server endpoints, milestones, and acceptance criteria.

## Project status

Early development. The application foundation and the mock API are in place: routing, the shared layout, a selectable light/dark theme, typed and validated API contracts, a mock API that replays recorded market data, and the build, lint, and test tooling. The Opportunity Radar and Live Market Monitor views are **not** implemented yet; the features above describe the intended direction. Replayed and simulated data will be clearly labeled wherever displayed.

## Disclaimer

Market Pulse is for experimentation, education, and independent research. Market signals are not investment advice or guarantees of future performance. Real-data integrations, if added, will depend on data quality, availability, and licensing terms.
