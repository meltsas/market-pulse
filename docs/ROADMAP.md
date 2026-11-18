# Market Pulse — Development Roadmap

This roadmap covers the **public React + TypeScript frontend and its local Node.js mock server**. A production backend, if needed, will live in a separate private repository.

**Product direction:** combine **Opportunity Radar** (longer-term investment research) and **Live Market Monitor** (short-term anomaly detection). First deliver a credible, independently runnable demo; later explore genuine value for an individual investor.

**Status:** Phases 1–5 are complete: the public demo runs from a fresh clone, with real recorded prices or generated synthetic ones. Phase 6 and the later enhancements are plans, not commitments. Unchecked items are planned, not delivered.

## Engineering principles

- Implement small, working vertical slices; avoid speculative infrastructure.
- Keep the public repository independently runnable without private services, paid market data, or credentials.
- Use strict TypeScript and validate network data at runtime.
- Separate REST server state (RTK Query), shared client state (Redux Toolkit), and local component state.
- Use SSE where fast updates matter; Opportunity Radar should work with ordinary scheduled processing and REST.
- Clearly label simulated market prices, companies, signals, and examples.
- Follow `AGENTS.md`: avoid unnecessary dependencies, abstraction layers, comments, and shortcuts.

## Phase 1 — React application foundation (complete)

**Goal:** a maintainable SPA that builds, runs, and navigates correctly.

- [x] Scaffold React + TypeScript with Vite and strict type checking.
- [x] Configure ESLint, Prettier, Vitest, and React Testing Library.
- [x] Add React Router with a shared responsive dashboard layout.
- [x] Create routes: `/opportunities`, `/live-monitor`, `/watchlist`, and 404.
- [x] Establish SCSS Modules, CSS design tokens, and a few accessible base components.
- [x] Add Redux Toolkit, typed hooks, and RTK Query for REST API calls.
- [x] Define Zod schemas and TypeScript contracts for initial API payloads.
- [x] Add `.env.example` containing only non-sensitive configuration and a safe `.gitignore`.
- [x] Document verified development commands in `README.md`.

**Acceptance:** routes work, TypeScript checks pass, tests run, the production build succeeds, and no external API is necessary.

TypeScript stays on 6.0.x until `typescript-eslint` supports TypeScript 7.

## Phase 2 — Local Node.js / TypeScript mock server (complete)

**Goal:** make the public project demonstrable without the private backend.

- [x] Add a small TypeScript server under `mock-server/` using Fastify, run with Node's built-in TypeScript type stripping (no `tsx` or build step).
- [x] Reuse the Zod contracts in `src/contracts/` rather than duplicating API types.
- [x] Record real market data once into JSON files and derive REST responses and SSE events from it (historical replay).
- [x] Configure the Vite `/api` development proxy.
- [x] Use a fixed set of clearly labeled demonstration instruments: three indices, six US stocks, Bitcoin, and EUR/USD.
- [x] Replay recorded 5-minute bars deterministically with UTC market timestamps and session volume.
- [x] Implement three initial endpoints:

  | Endpoint                   | Purpose                                               |
  | -------------------------- | ----------------------------------------------------- |
  | `GET /api/opportunities`   | Illustrative screening results and supporting metrics |
  | `GET /api/market/snapshot` | Current prices and timestamps for the live dashboard  |
  | `GET /api/market/stream`   | SSE updates and detected anomaly events               |

- [x] Define a small typed event contract, e.g. `quote.updated` and `anomaly.detected`, with event IDs and timestamps.
- [x] Support at least one repeatable demo scenario (price spike, dip, or abnormal volume): the 5 November 2026 sell-off.
- [x] Clean up disconnected SSE clients and related listeners/timers.
- [x] Test simulator output and endpoint response shapes.
- [x] Add and verify scripts for starting the UI and the mock server locally.
- [x] Run without recorded data: the mock API then generates deterministic synthetic prices for the same instruments and scenario and labels them as synthetic. Yahoo Finance serves 5-minute bars only for about 60 days, so the 4–6 November window cannot be recorded after early January 2027 (done in Phase 5).

**Acceptance:** after cloning, a developer can run the UI and mock API, fetch snapshots, and receive predictable SSE events without API keys.

Data licensing: Yahoo Finance prices are recorded locally into a gitignored folder and never committed. SEC EDGAR fundamentals and ECB statistics (reusable with attribution) may be committed.

## Phase 3 — Live Market Monitor (complete)

**Goal:** complete a meaningful real-time frontend workflow.

- [x] Fetch the initial market snapshot through RTK Query, plus price history (`GET /api/market/history`) and detected anomalies (`GET /api/market/anomalies`).
- [x] Build an instrument list and detail view with price, change, timestamp, and data-source labeling. The selected instrument is part of the URL (`/live-monitor/NVDA`); narrow screens show the list and the detail one at a time.
- [x] Show a persistent demo-data notice whenever mock data is displayed: replay window, speed, current market date and time with time zone, and data providers.
- [x] Subscribe to SSE using a dedicated service or Hook; validate incoming events with Zod.
- [x] Draw a price history chart for the selected instrument with TradingView Lightweight Charts: 5-minute closes, volume, the previous close, and alert markers.
- [x] Show anomaly alerts with clear, explainable detection reasons: each alert states the rule that triggered it.
- [x] Add a relative volume rule to the mock server detector: a stock's session volume reaches 1.5× its 20-day average daily volume.
- [x] Display connecting, connected, reconnecting, disconnected, and stale-data states. A `replay.clock` event every second lets the client reconnect when the stream goes silent.
- [x] On reconnection, avoid losing events between the snapshot request and the live subscription. Market data is fetched only after the stream opens, events arriving during the fetch are applied afterwards, and events never move cached data backwards.
- [x] Avoid unnecessary full-dashboard renders: each component subscribes to its own part of the cache; no memoization was needed.
- [x] Test event validation, connection cleanup, anomaly rules, and reconnection behavior.
- [x] Control the replay from the demo notice: pause and resume, move to any moment of the recorded period, choose a speed (60×, 150×, 300×, or 900×), and jump to a bookmarked moment such as the 5 November sell-off. The replay clock lives in the mock API (`PATCH /api/replay`), so all open tabs follow the same replay.
- [x] Let viewers reset the chart view after zooming or scrolling.
- [x] Start the UI and the mock API with one command (`npm run dev`).

Data note: Yahoo Finance has no intraday bars for US instruments and EUR/USD between 17:15 and 18:50 UTC on 5 November 2026. The chart joins the bars on either side of the gap, the volume of the first bar after it is left out because it covers the whole gap, and no price move is attributed to the missing period.

**Acceptance:** the demo displays a changing market, detects an anomaly, and handles a disconnected/reconnected stream without corrupting displayed data.

## Phase 4 — Opportunity Radar MVP (complete)

**Goal:** support research-oriented discovery without real-time requirements.

- [x] Render an opportunity list from the mock REST endpoint with sorting and a few useful filters: asset class, bias, and search. Filters and sorting are part of the URL; narrow screens show cards.
- [x] Add an opportunity detail view explaining why an instrument was surfaced, with a year of daily closes and 50- and 200-day averages (`GET /api/market/daily-history`).
- [x] Start with simple, interpretable screening conditions: trend against the 200-day average, three-month strength against the S&P 500, revenue growth, and P/E on last fiscal-year earnings. A drawdown from the 52-week high is shown as a risk.
- [x] Give each result a long/short bias with its reasons and risks, never a buy or sell recommendation.
- [x] Show data freshness and missing metrics explicitly; do not infer that a falling stock is automatically undervalued.
- [x] Add a basic local watchlist; avoid authentication and server persistence for the first release. It is a Redux Toolkit slice saved in `localStorage`.
- [x] Allow watchlisted instruments to be followed in Live Market Monitor (`/live-monitor?list=watchlist`).
- [x] Ensure the research views still function when live updates are disconnected: they load data over REST and fall back to refreshing every 30 seconds.
- [x] Show the same replay panel, with replay controls and connection status, on every page with market data. One stream connection serves the whole app, so a pause or jump made on one page shows on every page at once and screening results reload immediately.
- [x] Test filtering, sorting, empty results, API errors, and watchlist changes.

P/E uses diluted earnings for the last fiscal year, and every result says so. Trailing twelve-month earnings would be more current; they are planned with the real-data work in Phase 6.

**Acceptance:** a user can discover an illustrative candidate, understand the supporting metrics and caveats, and add it to the monitor.

## Phase 5 — Public GitHub / portfolio readiness (complete)

**Goal:** make the project easy to evaluate as a real engineering project.

- [x] Run type checks, lint, formatting, tests, and the production build in GitHub Actions on every push and pull request.
- [x] Keyboard navigation, responsive layouts, loading, empty, and error states, and time and currency formatting were checked in the browser while building each phase.
- [x] Add screenshots of the running dashboard to `README.md`.
- [x] Rewrite `README.md` around what the project does today and how it is built; move the mock API reference to `docs/mock-api.md`.
- [x] Document the local setup and a short tour that reproduces the sell-off alerts.
- [x] Let a fresh clone run without recorded data by generating synthetic prices.
- [x] Review commits and bundled assets for secrets, private integrations, restricted data, and unlicensed market data. Yahoo Finance prices are never committed.
- [x] Add an MIT license and accept Node.js 24.16 or newer.

Moved to later enhancements: a Playwright end-to-end smoke test and a public demo deployment.

**Acceptance:** another developer can understand, launch, and evaluate the project without private backend access.

## Phase 6 — Real market data and private backend (later)

**Goal:** assess practical investment value after the public UI is working.

- [ ] Create a separate private backend repository only when a real-data integration justifies it.
- [ ] Evaluate provider pricing, data quality, rate limits, redistribution rights, and market-data delays.
- [ ] Keep the public mock API and private service aligned to a documented, versioned contract.
- [ ] Add real historical price data and a small set of financial metrics, respecting source licenses.
- [ ] Compute P/E from trailing twelve-month earnings. This needs quarterly diluted EPS from SEC filings, with the fourth quarter derived from the annual report.
- [ ] Run Opportunity Radar analyses on a schedule (e.g., daily or several times per day); expose the last-analysis timestamp through REST.
- [ ] Treat live data separately and account for market hours and delayed quotes.
- [ ] Add persistence only when historical results, user preferences, or analysis jobs require it.
- [ ] Protect the deployed API with appropriate backend validation, authorization where relevant, and rate limits.
- [ ] Handle incomplete, inconsistent, delayed, and stale source data without hiding uncertainty.

**Acceptance:** real-data integration does not require substantial React view rewrites, and every displayed signal has clear source and freshness information.

## Possible later enhancements — not MVP commitments

- **End-to-end tests:** a Playwright smoke test of navigation and one core flow, run against the mock API with synthetic prices.
- **Public demo:** deploy the UI and mock API with synthetic prices, which can be shared freely, and clearly label them.
- **Per-viewer replay:** give each visitor an independent replay clock if the demo is ever deployed publicly; the mock API currently shares one clock.
- **Longer replay periods:** record more days while the provider still serves intraday data, now that the replay can be paused and moved.
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
