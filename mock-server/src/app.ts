import Fastify, { type FastifyInstance } from 'fastify';
import type { DataSource } from '../../src/contracts/market.ts';
import type { MarketStreamEvent } from '../../src/contracts/marketStream.ts';
import {
  REPLAY_END,
  REPLAY_SPEED_MULTIPLIER,
  REPLAY_START,
  STREAM_TICK_INTERVAL_MS,
} from './config.ts';
import type { DemoInstrument } from './instruments.ts';
import { createMarketSnapshot } from './marketSnapshot.ts';
import { createMarketStream, type MarketStream } from './marketStream.ts';
import { buildMarketTimeline } from './marketTimeline.ts';
import { createOpportunityList } from './opportunities.ts';
import { createReplayClock } from './replayClock.ts';
import type { RecordedMarketData, SecFundamentals } from './recordedData.ts';

interface MockServerOptions {
  instruments: readonly DemoInstrument[];
  recordedMarketData: RecordedMarketData;
  fundamentals: SecFundamentals;
  now?: () => number;
  tickIntervalMs?: number;
}

export interface MockServer {
  app: FastifyInstance;
  marketStream: MarketStream;
}

export function createMockServer({
  instruments,
  recordedMarketData,
  fundamentals,
  now = Date.now,
  tickIntervalMs = STREAM_TICK_INTERVAL_MS,
}: MockServerOptions): MockServer {
  const clock = createReplayClock({
    startMs: Date.parse(REPLAY_START),
    endMs: Date.parse(REPLAY_END),
    speedMultiplier: REPLAY_SPEED_MULTIPLIER,
    startedAtMs: now(),
  });
  const timeline = buildMarketTimeline(instruments, recordedMarketData);
  const marketStream = createMarketStream({
    timeline,
    clock,
    tickIntervalMs,
    now,
  });

  const replayDataSource = (providers: string[]): DataSource => ({
    kind: 'historical-replay',
    providers,
    replayStart: REPLAY_START,
    replayEnd: REPLAY_END,
    speedMultiplier: REPLAY_SPEED_MULTIPLIER,
  });
  const marketDataSource = replayDataSource([recordedMarketData.provider]);
  const opportunityDataSource = replayDataSource([
    recordedMarketData.provider,
    fundamentals.provider,
  ]);

  const app = Fastify({
    logger: { level: 'warn' },
    forceCloseConnections: true,
  });

  app.get('/api/market/snapshot', (_request, reply) =>
    reply.send(
      createMarketSnapshot(
        instruments,
        timeline,
        clock.positionAt(now()).marketTimeMs,
        marketDataSource,
      ),
    ),
  );

  app.get('/api/opportunities', (_request, reply) =>
    reply.send(
      createOpportunityList({
        instruments,
        recordedMarketData,
        fundamentals,
        marketTimeMs: clock.positionAt(now()).marketTimeMs,
        dataSource: opportunityDataSource,
      }),
    ),
  );

  app.get('/api/market/stream', (_request, reply) => {
    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    reply.raw.flushHeaders();

    const unsubscribe = marketStream.subscribe((event) => {
      reply.raw.write(formatServerSentEvent(event));
    });
    reply.raw.on('close', unsubscribe);
  });

  return { app, marketStream };
}

function formatServerSentEvent(event: MarketStreamEvent) {
  return `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}
