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
  type RecordedMarketData,
} from './recordedData.ts';
import { createSyntheticMarketData } from './syntheticMarketData.ts';

const SYNTHETIC_DATA_FLAG = '--synthetic';

function isMissingFileError(error: unknown) {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

async function readRecordedMarketData(): Promise<RecordedMarketData | null> {
  if (process.argv.includes(SYNTHETIC_DATA_FLAG)) {
    return null;
  }
  try {
    return await readJsonFile(recordedMarketDataFile, recordedMarketDataSchema);
  } catch (error) {
    if (isMissingFileError(error)) {
      console.warn(
        'No recorded prices found, so the replay uses generated synthetic prices. Run `npm run mock-server:record-prices` to replay real market data (see README).',
      );
      return null;
    }
    throw error;
  }
}

const recordedMarketData = await readRecordedMarketData();
const { app } = createMockServer({
  instruments: demoInstruments,
  recordedMarketData:
    recordedMarketData ?? createSyntheticMarketData(demoInstruments),
  fundamentals: await readJsonFile(secFundamentalsFile, secFundamentalsSchema),
  isSyntheticData: recordedMarketData === null,
});

await app.listen({ port: MOCK_SERVER_PORT });
console.info(
  `Mock API on http://localhost:${String(MOCK_SERVER_PORT)} replays ${recordedMarketData ? 'recorded' : 'synthetic'} prices for ${REPLAY_START} – ${REPLAY_END} at ${String(REPLAY_SPEED_MULTIPLIER)}x speed`,
);
