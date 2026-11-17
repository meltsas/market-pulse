import { createMockServer } from './app.ts';
import {
  MOCK_SERVER_PORT,
  REPLAY_END,
  REPLAY_SPEED_MULTIPLIER,
  REPLAY_START,
} from './config.ts';
import { demoInstruments } from './instruments.ts';
import {
  readJsonFile,
  recordedMarketDataFile,
  recordedMarketDataSchema,
  secFundamentalsFile,
  secFundamentalsSchema,
} from './recordedData.ts';

function isMissingFileError(error: unknown) {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

async function readRecordedMarketData() {
  try {
    return await readJsonFile(recordedMarketDataFile, recordedMarketDataSchema);
  } catch (error) {
    if (isMissingFileError(error)) {
      console.error(
        'Recorded market data is missing. Run `npm run mock-server:record` first (see README).',
      );
      process.exit(1);
    }
    throw error;
  }
}

const { app } = createMockServer({
  instruments: demoInstruments,
  recordedMarketData: await readRecordedMarketData(),
  fundamentals: await readJsonFile(secFundamentalsFile, secFundamentalsSchema),
});

await app.listen({ port: MOCK_SERVER_PORT });
console.info(
  `Mock API on http://localhost:${String(MOCK_SERVER_PORT)} replays ${REPLAY_START} – ${REPLAY_END} at ${String(REPLAY_SPEED_MULTIPLIER)}x speed`,
);
