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

| Area                 | Technology                                |
| -------------------- | ----------------------------------------- |
| Frontend             | React, TypeScript, Vite                   |
| Routing              | React Router                              |
| Client state         | Redux Toolkit                             |
| API data and caching | RTK Query                                 |
| Live updates         | Server-Sent Events (SSE)                  |
| Charts               | TradingView Lightweight Charts            |
| Styling              | SCSS Modules, Inter, Lucide icons         |
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

### Quick start

```bash
npm install
npm run mock-server:record-prices   # first time only, takes about 15 seconds
npm run dev
```

`npm run dev` starts the mock API and the UI together; their logs are prefixed with `api` and `ui`, and Ctrl+C stops both. Open the URL that Vite prints and go to **Live Monitor**. No API keys are needed.

The replay controls under the **Historical replay** notice pause and resume the replay, move it to any moment of the recorded period, change its speed, and jump straight to the 5 November sell-off.

### Scripts

| Command                                   | When to use it                                                                                                                      |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                             | Daily development: starts the mock API and the UI                                                                                   |
| `npm run dev:ui`                          | Starts only the UI, e.g. against a mock API in another terminal                                                                     |
| `npm run mock-server`                     | Starts only the mock API on port 4000; it restarts when its code changes                                                            |
| `npm run typecheck`                       | Runs the TypeScript project check                                                                                                   |
| `npm run lint`                            | Runs ESLint with type-aware rules                                                                                                   |
| `npm run format` / `format:check`         | Formats files with Prettier, or only checks them                                                                                    |
| `npm test` / `test:watch`                 | Runs the test suite once, or in watch mode                                                                                          |
| `npm run build` / `preview`               | Type-checks and builds into `dist/`, or serves that build locally                                                                   |
| `npm run mock-server:record-prices`       | **Once per clone:** downloads the replayed prices from Yahoo Finance into the gitignored `mock-server/data/recorded/`               |
| `npm run mock-server:record-fundamentals` | **Rarely:** refreshes the committed SEC fundamentals after companies file new reports; needs `SEC_USER_AGENT` in `.env` (see below) |

The two recording scripts only maintain the data the mock API replays. Without recorded prices, the mock API stops with a message that names the script to run.

To override configuration locally, copy `.env.example` to `.env.local`. Only non-secret values belong there: every `VITE_*` variable is visible in the browser bundle.

### Mock API

The mock API replays real market data from **4–6 November 2026**, including the 5 November sell-off. By default it runs at 300× speed, one 5-minute bar per second, and starts again from the beginning after 6 November. All responses label the data as a historical replay and include the replay window, speed, pause state, and market time. Vite proxies `/api` to the mock API.

| Endpoint                              | Purpose                                                                                               |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `GET /api/market/snapshot`            | Latest quotes at the current replay time                                                              |
| `GET /api/market/history?symbol=NVDA` | 5-minute prices and volume of one instrument up to the current replay time                            |
| `GET /api/market/anomalies`           | Unusual activity detected so far in the current replay                                                |
| `GET /api/opportunities`              | Screening results from completed daily closes and SEC fundamentals                                    |
| `GET /api/market/stream`              | SSE events: `quote.updated`, `anomaly.detected`, `replay.restarted`, `replay.changed`, `replay.clock` |
| `PATCH /api/replay`                   | Pauses or resumes the replay, moves it to a market time, or sets its speed (60×, 150×, 300×, or 900×) |

The replay clock lives in the mock API, so every open browser tab follows the same replay.

Instruments: S&P 500, Nasdaq-100, DAX, NVIDIA, AMD, Alphabet, Oracle, Eli Lilly, Strategy (MSTR), Bitcoin, and EUR/USD.

The mock API detects two kinds of unusual activity in the recorded data, and every alert states the rule behind it:

- **Price move:** the price changes within 30 minutes, or since the previous session, by at least 1% for indices, 3% for stocks, 2% for crypto, or 0.4% for currency pairs.
- **Heavy volume:** a stock's session volume reaches 1.5× its 20-day average daily volume. Index and crypto volume in the recorded data is not comparable with daily volume, and DAX and EUR/USD have none.

To see the stream recover from an outage, run the UI and the mock API in separate terminals (`npm run dev:ui` and `npm run mock-server`), stop the mock API for a few seconds while Live Monitor is open, then start it again. The page shows that live updates are paused and reloads its data once the stream is back. A restarted mock API begins the replay again from 4 November.

### Data sources and licensing

| Data                                  | Source        | In the repository                                               |
| ------------------------------------- | ------------- | --------------------------------------------------------------- |
| Daily and 5-minute prices             | Yahoo Finance | No. Recorded locally; Yahoo's terms do not allow redistribution |
| Quarterly revenue, annual diluted EPS | SEC EDGAR     | Yes, in `mock-server/data/sec-fundamentals.json`                |

Yahoo Finance has no 5-minute or 1-minute bars for US instruments and EUR/USD between 17:15 and 18:50 UTC on 5 November. The next bar reports the volume of the whole gap, so the mock API leaves that bar's volume out and does not attribute price moves to the missing period.

Yahoo Finance serves 5-minute bars only for roughly the last 60 days, so the 4–6 November window can be recorded until about early January 2027. Keep a private backup of `mock-server/data/recorded/` if you need the replay after that.

To re-record SEC fundamentals, set `SEC_USER_AGENT` in `.env` (see `.env.example`): the SEC requires a name and contact email for automated requests.

Charts use [TradingView Lightweight Charts™](https://www.tradingview.com/lightweight-charts/) (Apache License 2.0), Copyright © TradingView, Inc. As its license requires, every chart shows the TradingView attribution logo, which links to <https://www.tradingview.com/>.

## Development plan

See [docs/ROADMAP.md](docs/ROADMAP.md) for implementation phases, mock-server endpoints, milestones, and acceptance criteria.

## Project status

Early development. In place:

- **Live Market Monitor:** an instrument list with live prices, a price and volume chart for the selected instrument with alert markers, a feed of explained alerts, connection status, and automatic recovery from stream outages. A notice above the data labels it as a historical replay, shows the replay window, speed, data source, and current market time in your time zone, and lets you pause, move, speed up, or slow down the replay.
- **Settings:** a light, dark, or system theme, saved in the browser.
- **Foundation:** routing, a responsive layout, typed and validated API contracts, a mock API that replays recorded market data, and the build, lint, and test tooling.

Opportunity Radar and the watchlist are **not** implemented yet; their descriptions above describe the intended direction.

## Disclaimer

Market Pulse is for experimentation, education, and independent research. Market signals are not investment advice or guarantees of future performance. Real-data integrations, if added, will depend on data quality, availability, and licensing terms.
