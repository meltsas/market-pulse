# Market Pulse

**Discover investment opportunities. Understand unusual market activity.**

Market Pulse is an experimental market intelligence dashboard built with React and TypeScript. It combines longer-term investment research with live market monitoring to help individual investors identify **what deserves a closer look — and why**.

This is a personal software project, not a trading platform or an investment advisory service.

## What it aims to do

### Opportunity Radar

Find companies worth researching using price trends and selected fundamental metrics. Each opportunity should explain the underlying signals and their limitations rather than issue a buy recommendation.

### Live Market Monitor

Follow selected instruments, visualize changing prices, and surface unusual price or volume activity. A local simulator will make the real-time interface demonstrable without paid market data or API keys.

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
| Local demo API       | Node.js, TypeScript                       |

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

| Command                | Purpose                                             |
| ---------------------- | --------------------------------------------------- |
| `npm run dev`          | Start the Vite development server                   |
| `npm run build`        | Type-check and create a production build in `dist/` |
| `npm run preview`      | Serve the production build locally                  |
| `npm run typecheck`    | Run the TypeScript project check                    |
| `npm run lint`         | Run ESLint with type-aware rules                    |
| `npm run format`       | Format files with Prettier                          |
| `npm run format:check` | Check formatting without changing files             |
| `npm test`             | Run the test suite once                             |
| `npm run test:watch`   | Run tests in watch mode                             |

To override configuration locally, copy `.env.example` to `.env.local`. Only non-secret values belong there: every `VITE_*` variable is visible in the browser bundle.

The local mock API is not implemented yet (see Phase 2 in the roadmap), so the application does not request market data yet.

## Development plan

See [docs/ROADMAP.md](docs/ROADMAP.md) for implementation phases, mock-server endpoints, milestones, and acceptance criteria.

## Project status

Early development. The application foundation is in place: routing, the shared layout, a selectable light/dark theme, typed and validated API contracts, and the build, lint, and test tooling. Opportunity Radar, Live Market Monitor, and the mock API are **not** implemented yet; the features above describe the intended direction. Simulated data will be clearly labeled wherever displayed.

## Disclaimer

Market Pulse is for experimentation, education, and independent research. Market signals are not investment advice or guarantees of future performance. Real-data integrations, if added, will depend on data quality, availability, and licensing terms.
