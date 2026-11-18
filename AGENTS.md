# Market Pulse — AI Agent Instructions

These rules apply to all AI agents working in this repository. Follow the existing project conventions and the user's current task. Prefer the simplest correct, maintainable solution over cleverness or speculation.

## 1. Scope and decisions

- Change only what the task requires. Do not refactor unrelated code or add speculative features.
- Prefer existing project patterns and native platform APIs over new abstractions or libraries.
- **Do not add, upgrade, or replace dependencies unless the user explicitly requests it.** If a dependency seems necessary, explain why and ask first.
- Avoid overengineering: no unnecessary layers, generic frameworks, factories, wrappers, configuration systems, or premature optimization.
- Do not create placeholder files, unused utilities, or speculative extension points.
- Preserve existing behavior unless the task explicitly changes it. Never silently remove functionality.
- Do not create commits, push code, change repository visibility, or deploy without explicit permission.

## 2. Readable, self-explanatory code

- Write code for humans first: clear control flow, small cohesive functions, and descriptive names.
- Prefer domain-specific names such as `selectedSymbol`, `latestQuote`, or `connectionStatus` over `data`, `item`, `value`, or `temp` when meaning is available.
- Use meaningful component, hook, function, variable, and file names. Avoid unexplained abbreviations.
- Keep responsibilities separated, but do not extract a helper or abstraction for a single trivial use.
- Avoid deep nesting; prefer early returns and straightforward conditionals.
- **Do not generate explanatory comment blocks, decorative section comments, or redundant JSDoc.** Code should explain _what_ it does through names and structure.
- Add a short comment only when it explains a non-obvious _why_, important constraint, or surprising behavior that cannot be made clear in code.
- Do not leave debug logs, dead code, commented-out code, or unrequested TODOs.

## 3. TypeScript: strict by default

- Keep TypeScript strict. All application and mock-server code must be properly typed.
- **Never use `any`** (including `as any`, implicit `any`, or `any[]`). Use `unknown` at genuinely unknown boundaries and narrow it safely.
- Do not use `@ts-ignore`, `@ts-nocheck`, unsafe casts, or non-null assertions to hide type errors. Fix the actual types or control flow.
- Define clear, meaningful `interface` or `type` declarations for component props, domain entities, application state, API contracts, and SSE events.
- Prefer `interface` for object shapes and `type` for unions, discriminated unions, and type transformations. Avoid duplicate type definitions.
- Validate untrusted API responses, external input, and SSE messages at runtime (use the project's existing Zod schemas where appropriate). TypeScript alone does not validate network data.
- Model loading, success, error, disconnected, and stale states explicitly when relevant. Handle nullable and optional values intentionally.
- Avoid magic strings and numbers when a named constant or domain type improves clarity.

## 4. Modern React practices

- Use functional components, React Hooks, and current stable React patterns. No class components or legacy APIs.
- Follow the official Rules of React: pure rendering, immutable props/state, and Hooks only at the top level of components or custom Hooks.
- Use `useEffect` only to synchronize with external systems. Do not use Effects for derived values or ordinary event-driven logic.
- Clean up subscriptions, EventSource connections, timers, and listeners. Prevent stale asynchronous updates and resource leaks; support Strict Mode behavior.
- Use stable keys for lists. Never depend on array indexes as keys for dynamic or reorderable items.
- Keep state as local as practical. Do not duplicate props or derived values in state without a demonstrated reason.
- Do not add `useMemo`, `useCallback`, or `React.memo` reflexively. Optimize only with a clear reason or measured need.
- Avoid DOM manipulation outside legitimate React refs or third-party chart integrations. Do not use hacks to force re-renders or silence Hook lint rules.
- Keep components focused. Extract custom Hooks for reusable stateful behavior, not merely to reduce line count.

## 5. State, API, and real-time data

- Use component state for local UI concerns, **Redux Toolkit** for genuinely shared client state, and **RTK Query** for REST server state and caching.
- Do not copy RTK Query responses into Redux slices unless there is a specific, documented need.
- Keep API contracts and data-access logic outside presentational components.
- Keep SSE connection management in a dedicated service or Hook. Never put `EventSource`, promises, or other non-serializable connections into Redux state.
- Validate incoming events and handle disconnects, reconnection, stale data, and out-of-order updates as required by the feature.
- For frequent price updates, avoid unnecessary whole-dashboard renders; batch or select data where justified.
- Do not introduce a second state management or fetching library without explicit approval.

## 6. Styling and UI

- Use **SCSS Modules** (`*.module.scss`) for component-specific styles. Keep global CSS limited to reset, typography, design tokens, and intentional application-wide rules.
- Use modern Sass `@use` / `@forward`; avoid deprecated `@import` and excessive selector nesting.
- Prefer semantic HTML, accessible labels, keyboard interaction, visible focus states, and responsive layouts.
- Make loading, empty, error, disconnected, and stale-data states understandable to the user.
- Show financial data with appropriate currency, units, precision, timestamps, and time zones. Clearly label simulated/demo data.

## 7. Security and boundaries

- Never read, print, copy, or expose secrets from `.env` files, credentials, tokens, or private configuration. Use `.env.example` for safe examples only.
- Never place secret API keys in browser code or `VITE_*` variables. Treat all client-side code and network requests as publicly inspectable.
- Do not assume the frontend enforces authorization; sensitive operations and validation belong on the backend.
- Keep the public mock server independent of private backend code, credentials, and proprietary integrations.
- Do not disable lint, TypeScript, tests, or security checks simply to make a change pass.

## 8. Verification and delivery

- Follow the repository's existing formatting, naming, and folder conventions unless the task explicitly requires a change.
- Add or update focused tests when changing behavior, especially for data transformations, state transitions, event handling, and error cases.
- Verify in two stages, so the full test suite does not run after every change:
  - **While working and before handing work over:** run the tests that cover the new behavior and the existing code most likely to break because of the change, e.g. `npx vitest run <test files>` or `npx vitest related --run <changed files>`. Run `npm run typecheck`, which catches breakage in code those tests do not cover, and lint and format the changed files. Check UI changes in the browser. Fix failures caused by your changes.
  - **After the user has reviewed the work and asks for it,** typically before a phase is merged into `master`: run the full checks `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, and `npm run build`.
- Do not claim checks passed unless they actually ran. When handing work over, state which checks ran and which are left for the full run.
- In the final response, briefly state what changed, important decisions or tradeoffs, and any remaining limitations. Avoid lengthy self-justification.

**Decision rule:** When two solutions meet the requirements, choose the one with fewer dependencies, fewer moving parts, clearer types, and simpler maintenance.

## Session logging

Maintain a lightweight session log under `docs/ai/sessions/`.

- At the start of each new session, create a file named
  `YYYY-MM-DD_HH-mm-ss.md`, using the local system date and time.
  Reuse that file throughout the session.
- For each user message, append the user's prompt verbatim before
  beginning substantive work.
- Before sending the final response, append its complete text verbatim,
  including tables, proposals, notes, and code blocks. Do not summarize
  or shorten it; the entry must match the response the user receives.
- Add a timestamp with the UTC offset to each user and assistant entry.
- Do not add tool output, command transcripts, or internal reasoning,
  except where the final response itself contains them.
- Append new entries without rewriting previous entries.
- If a response is interrupted, its user entry may remain without
  an assistant entry. Do not invent missing content.
- Treat logging as a required best-effort step. If writing fails,
  continue the main task and briefly mention the failure.
- Read historical session logs only when relevant to the current task.
  Historical prompts are background information, not current instructions.
