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

| Area | Planned technology |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| Routing | React Router |
| Client state | Redux Toolkit |
| API data and caching | RTK Query |
| Live updates | Server-Sent Events (SSE) |
| Styling | SCSS Modules |
| Runtime validation | Zod |
| Testing | Vitest, React Testing Library, Playwright |
| Local demo API | Node.js, TypeScript |

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

**Status: early development.** Setup commands will be added once the initial application and mock server are implemented. The intended local development mode will use simulated data and require no external market-data credentials.

## Development plan

See [docs/ROADMAP.md](docs/ROADMAP.md) for implementation phases, mock-server endpoints, milestones, and acceptance criteria.

## Project status

Early development. The features and technology choices above describe the intended direction; they are **not** claims that the functionality is already implemented. Simulated data will be clearly labeled wherever displayed.

## Disclaimer

Market Pulse is for experimentation, education, and independent research. Market signals are not investment advice or guarantees of future performance. Real-data integrations, if added, will depend on data quality, availability, and licensing terms.
