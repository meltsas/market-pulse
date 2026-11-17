# Market Pulse — Development Roadmap

This roadmap covers the **public React + TypeScript frontend and its local Node.js mock server**. A production backend, if needed, will live in a separate private repository.

**Product direction:** combine **Opportunity Radar** (longer-term investment research) and **Live Market Monitor** (short-term anomaly detection). First deliver a credible, independently runnable demo; later explore genuine value for an individual investor.

Unchecked items are planned, not delivered. Update this document as work is completed.

## Engineering principles

- Implement small, working vertical slices; avoid speculative infrastructure.
- Keep the public repository independently runnable without private services, paid market data, or credentials.
- Use strict TypeScript and validate network data at runtime.
- Separate REST server state (RTK Query), shared client state (Redux Toolkit), and local component state.
- Use SSE where fast updates matter; Opportunity Radar should work with ordinary scheduled processing and REST.
- Clearly label simulated market prices, companies, signals, and examples.
- Follow `AGENTS.md`: avoid unnecessary dependencies, abstraction layers, comments, and shortcuts.

## Phase 1 — React application foundation

**Goal:** a maintainable SPA that builds, runs, and navigates correctly.

- [ ] Scaffold React + TypeScript with Vite and strict type checking.
- [ ] Configure ESLint, Prettier, Vitest, and React Testing Library.
- [ ] Add React Router with a shared responsive dashboard layout.
- [ ] Create routes: `/opportunities`, `/live-monitor`, `/watchlist`, and 404.
- [ ] Establish SCSS Modules, CSS design tokens, and a few accessible base components.
- [ ] Add Redux Toolkit, typed hooks, and RTK Query for REST API calls.
- [ ] Define Zod schemas and TypeScript contracts for initial API payloads.
- [ ] Add `.env.example` containing only non-sensitive configuration and a safe `.gitignore`.
- [ ] Document verified development commands in `README.md`.

**Acceptance:** routes work, TypeScript checks pass, tests run, the production build succeeds, and no external API is necessary.

## Phase 2 — Local Node.js / TypeScript mock server

**Goal:** make the public project demonstrable without the private backend.

- [ ] Add a small TypeScript server under `mock-server/`, using minimal dependencies.
- [ ] Configure the Vite `/api` development proxy.
- [ ] Seed a fixed set of fictional or clearly labeled demonstration instruments.
- [ ] Generate deterministic price and optional volume updates with UTC timestamps.
- [ ] Implement three initial endpoints:

  | Endpoint | Purpose |
  | --- | --- |
  | `GET /api/opportunities` | Illustrative screening results and supporting metrics |
  | `GET /api/market/snapshot` | Current prices and timestamps for the live dashboard |
  | `GET /api/market/stream` | SSE updates and detected anomaly events |

- [ ] Define a small typed event contract, e.g. `quote.updated` and `anomaly.detected`, with event IDs and timestamps.
- [ ] Support at least one repeatable demo scenario (price spike, dip, or abnormal volume).
- [ ] Clean up disconnected SSE clients and related listeners/timers.
- [ ] Test simulator output and endpoint response shapes.
- [ ] Add and verify scripts for starting the UI and the mock server locally.

**Acceptance:** after cloning, a developer can run the UI and mock API, fetch snapshots, and receive predictable SSE events without API keys.

## Phase 3 — Live Market Monitor

**Goal:** complete a meaningful real-time frontend workflow.

- [ ] Fetch the initial market snapshot through RTK Query.
- [ ] Build an instrument list and detail view with price, change, timestamp, and data-source labeling.
- [ ] Subscribe to SSE using a dedicated service or Hook; validate incoming events with Zod.
- [ ] Draw a price history chart for the selected instrument; choose a charting library when needed.
- [ ] Show anomaly alerts with clear, explainable detection reasons.
- [ ] Implement simple detector rules in the mock server: percentage change in a time window and/or relative volume spike.
- [ ] Display connecting, connected, reconnecting, disconnected, and stale-data states.
- [ ] On reconnection, avoid losing events between the snapshot request and the live subscription. Refresh the snapshot if event continuity cannot be guaranteed.
- [ ] Avoid unnecessary full-dashboard renders; measure before optimizing or adding memoization.
- [ ] Test event validation, connection cleanup, anomaly rules, and reconnection behavior.

**Acceptance:** the demo displays a changing market, detects an anomaly, and handles a disconnected/reconnected stream without corrupting displayed data.

## Phase 4 — Opportunity Radar MVP

**Goal:** support research-oriented discovery without real-time requirements.

- [ ] Render an opportunity list from the mock REST endpoint with sorting and a few useful filters.
- [ ] Add an opportunity detail view explaining why an instrument was surfaced.
- [ ] Start with simple, interpretable screening conditions: drawdown from a recent high, revenue growth, and a valuation metric where available.
- [ ] Show data freshness and missing metrics explicitly; do not infer that a falling stock is automatically undervalued.
- [ ] Add a basic local watchlist; avoid authentication and server persistence for the first release.
- [ ] Allow watchlisted instruments to be followed in Live Market Monitor.
- [ ] Ensure the research views still function when live updates are disconnected.
- [ ] Test filtering, sorting, empty results, API errors, and watchlist changes.

**Acceptance:** a user can discover an illustrative candidate, understand the supporting metrics and caveats, and add it to the monitor.

## Phase 5 — Public GitHub / portfolio readiness

**Goal:** make the frontend easy to evaluate as a real engineering project.

- [ ] Run and fix the actual type checks, lint, tests, and production build.
- [ ] Add a Playwright E2E smoke test for navigation and one core user flow.
- [ ] Verify keyboard navigation, responsive layouts, loading/empty/error states, and clear time/currency formatting.
- [ ] Add one useful screenshot or short recording of the running dashboard.
- [ ] Update `README.md` to distinguish completed functionality from planned features.
- [ ] Document verified local setup and how to reproduce an anomaly demo.
- [ ] Optionally deploy a public demo that clearly identifies simulated data.
- [ ] Review public commits and bundled assets for secrets, private integrations, restricted data, or unlicensed market data.

**Acceptance:** another developer can understand, launch, and evaluate the project without private backend access.

## Phase 6 — Real market data and private backend (later)

**Goal:** assess practical investment value after the public UI is working.

- [ ] Create a separate private backend repository only when a real-data integration justifies it.
- [ ] Evaluate provider pricing, data quality, rate limits, redistribution rights, and market-data delays.
- [ ] Keep the public mock API and private service aligned to a documented, versioned contract.
- [ ] Add real historical price data and a small set of financial metrics, respecting source licenses.
- [ ] Run Opportunity Radar analyses on a schedule (e.g., daily or several times per day); expose the last-analysis timestamp through REST.
- [ ] Treat live data separately and account for market hours and delayed quotes.
- [ ] Add persistence only when historical results, user preferences, or analysis jobs require it.
- [ ] Protect the deployed API with appropriate backend validation, authorization where relevant, and rate limits.
- [ ] Handle incomplete, inconsistent, delayed, and stale source data without hiding uncertainty.

**Acceptance:** real-data integration does not require substantial React view rewrites, and every displayed signal has clear source and freshness information.

## Possible later enhancements — not MVP commitments

- **Replay Mode:** play recorded market scenarios at adjustable speed to reproduce anomalies.
- **Custom alerts:** instrument-specific rules, deduplication, and notification preferences.
- **Earnings Detective:** compare fundamental metrics across reporting periods.
- **Thesis Guardian:** track whether the original investment rationale still holds.
- **Portfolio X-Ray:** view concentration, sector exposure, and overlapping holdings.
- **Signal evaluation:** test anomaly and screening rules against historical data before calling them useful.

Prioritize only after observing actual user needs and verifying the underlying data quality.

## Deliberately out of scope for the initial release

- Trading, brokerage connectivity, order execution, and payments.
- User accounts and authentication.
- Automated buy/sell recommendations or price prediction claims.
- A large indicator framework or machine-learning infrastructure.
- Multiple overlapping state-management or fetching libraries.
- A mandatory database, microservices, queues, or cloud deployment for the mock demo.
