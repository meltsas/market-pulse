import Fastify, { type FastifyInstance } from 'fastify';
import type { AnomalyList } from '../../src/contracts/anomalies.ts';
import type { DataSource, PriceHistory } from '../../src/contracts/market.ts';
import {
  replayControlSchema,
  type ReplayStatus,
} from '../../src/contracts/replay.ts';
import type { MarketStreamEvent } from '../../src/contracts/marketStream.ts';
import {
  REPLAY_BOOKMARKS,
  REPLAY_END,
  REPLAY_SPEED_MULTIPLIER,
  REPLAY_START,
  STREAM_TICK_INTERVAL_MS,
} from './config.ts';
import type { DemoInstrument } from './instruments.ts';
import { createMarketSnapshot } from './marketSnapshot.ts';
import {
  collectAnomaliesUntil,
  createMarketStream,
  type MarketStream,
} from './marketStream.ts';
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

  const marketProviders = [recordedMarketData.provider];
  const opportunityProviders = [
    recordedMarketData.provider,
    fundamentals.provider,
  ];
  const replayDataSource = (providers: string[]): DataSource => ({
    kind: 'historical-replay',
    providers,
    replayStart: REPLAY_START,
    replayEnd: REPLAY_END,
    ...clock.playback(),
    bookmarks: REPLAY_BOOKMARKS,
  });
  const currentMarketTime = () =>
    new Date(clock.positionAt(now()).marketTimeMs).toISOString();

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
        replayDataSource(marketProviders),
      ),
    ),
  );

  app.get<{ Querystring: { symbol?: string } }>(
    '/api/market/history',
    (request, reply) => {
      const { symbol } = request.query;
      if (!symbol) {
        return reply
          .code(400)
          .send({ message: 'The symbol query parameter is required' });
      }
      const pricePoints = timeline.pricePointsBySymbol.get(symbol);
      if (!pricePoints) {
        return reply
          .code(404)
          .send({ message: `Unknown instrument: ${symbol}` });
      }

      const { marketTimeMs } = clock.positionAt(now());
      return reply.send({
        asOf: new Date(marketTimeMs).toISOString(),
        dataSource: replayDataSource(marketProviders),
        symbol,
        points: pricePoints.filter(
          ({ time }) => Date.parse(time) <= marketTimeMs,
        ),
      } satisfies PriceHistory);
    },
  );

  app.get('/api/market/anomalies', (_request, reply) => {
    const position = clock.positionAt(now());
    return reply.send({
      asOf: new Date(position.marketTimeMs).toISOString(),
      dataSource: replayDataSource(marketProviders),
      anomalies: collectAnomaliesUntil(timeline, clock.startMs, position),
    } satisfies AnomalyList);
  });

  app.patch('/api/replay', (request, reply) => {
    const parsedControl = replayControlSchema.safeParse(request.body);
    if (!parsedControl.success) {
      return reply.code(400).send({
        message: parsedControl.error.issues
          .map(({ message }) => message)
          .join('; '),
      });
    }
    const { marketTime, ...playbackChange } = parsedControl.data;
    const marketTimeMs =
      marketTime === undefined ? undefined : Date.parse(marketTime);
    if (
      marketTimeMs !== undefined &&
      (marketTimeMs < clock.startMs || marketTimeMs >= clock.endMs)
    ) {
      return reply.code(400).send({
        message: `Market time must be within ${REPLAY_START} – ${REPLAY_END}`,
      });
    }

    clock.change({ ...playbackChange, marketTimeMs }, now());
    marketStream.announceReplayChange();
    return reply.send({
      asOf: currentMarketTime(),
      dataSource: replayDataSource(marketProviders),
    } satisfies ReplayStatus);
  });

  app.get('/api/opportunities', (_request, reply) =>
    reply.send(
      createOpportunityList({
        instruments,
        recordedMarketData,
        fundamentals,
        marketTimeMs: clock.positionAt(now()).marketTimeMs,
        dataSource: replayDataSource(opportunityProviders),
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
