import type { AssetClass, DataSource } from '../../src/contracts/market.ts';
import type {
  Opportunity,
  OpportunityList,
} from '../../src/contracts/opportunities.ts';
import { toInstrument, type DemoInstrument } from './instruments.ts';
import type {
  CompanyFundamentals,
  DailyBar,
  RecordedMarketData,
  ReportedValue,
  SecFundamentals,
} from './recordedData.ts';

const DAY_MS = 86_400_000;
const YEAR_DAYS = 365;
const COMPARABLE_QUARTER_TOLERANCE_DAYS = 15;
const DRAWDOWN_SIGNAL_PERCENT = 20;
const REVENUE_GROWTH_SIGNAL_PERCENT = 20;

const missingFundamentalsCaveat: Record<
  Exclude<AssetClass, 'stock'>,
  string
> = {
  index: 'Company fundamentals do not apply to an index',
  crypto: 'Company fundamentals do not apply to a cryptocurrency',
  currency: 'Company fundamentals do not apply to a currency pair',
};

interface OpportunityListOptions {
  instruments: readonly DemoInstrument[];
  recordedMarketData: RecordedMarketData;
  fundamentals: SecFundamentals;
  marketTimeMs: number;
  dataSource: DataSource;
}

// Screening runs on completed daily closes, as a nightly job at 00:00 UTC would.
export function createOpportunityList({
  instruments,
  recordedMarketData,
  fundamentals,
  marketTimeMs,
  dataSource,
}: OpportunityListOptions): OpportunityList {
  const asOfDate = new Date(marketTimeMs).toISOString().slice(0, 10);

  const opportunities = instruments.flatMap((instrument) => {
    const dailyBars =
      recordedMarketData.instruments.find(
        ({ symbol }) => symbol === instrument.symbol,
      )?.dailyBars ?? [];
    const companyFundamentals = fundamentals.companies.find(
      ({ symbol }) => symbol === instrument.symbol,
    );
    const opportunity = screenInstrument(
      instrument,
      dailyBars.filter((bar) => bar.date < asOfDate),
      companyFundamentals,
      asOfDate,
    );
    return opportunity && opportunity.signals.length > 0 ? [opportunity] : [];
  });

  return {
    asOf: `${asOfDate}T00:00:00.000Z`,
    dataSource,
    opportunities,
  };
}

function screenInstrument(
  instrument: DemoInstrument,
  completedDailyBars: readonly DailyBar[],
  companyFundamentals: CompanyFundamentals | undefined,
  asOfDate: string,
): Opportunity | undefined {
  const latestBar = completedDailyBars.at(-1);
  if (!latestBar) {
    return undefined;
  }

  const drawdownFromHighPercent = calculateDrawdownFromHigh(
    completedDailyBars,
    latestBar,
    asOfDate,
  );
  const knownFundamentals = companyFundamentals && {
    quarterlyRevenue: companyFundamentals.quarterlyRevenue.filter(
      ({ filed }) => filed < asOfDate,
    ),
    annualDilutedEps: companyFundamentals.annualDilutedEps.filter(
      ({ filed }) => filed < asOfDate,
    ),
  };
  const revenueGrowth = knownFundamentals
    ? calculateRevenueGrowth(knownFundamentals.quarterlyRevenue)
    : undefined;
  const latestAnnualEps = knownFundamentals?.annualDilutedEps.at(-1);

  const signals: string[] = [];
  const caveats: string[] = [];

  if (drawdownFromHighPercent >= DRAWDOWN_SIGNAL_PERCENT) {
    signals.push(
      `Trading ${drawdownFromHighPercent.toFixed(1)}% below its 52-week high`,
    );
    caveats.push(
      'A large drawdown alone does not mean the asset is undervalued',
    );
  }
  if (revenueGrowth && revenueGrowth.percent >= REVENUE_GROWTH_SIGNAL_PERCENT) {
    signals.push(
      `Revenue grew ${revenueGrowth.percent.toFixed(1)}% year over year in the quarter ended ${revenueGrowth.quarterEnd}`,
    );
  }

  if (instrument.assetClass !== 'stock') {
    caveats.push(missingFundamentalsCaveat[instrument.assetClass]);
  } else if (!latestAnnualEps) {
    caveats.push('No P/E ratio: annual earnings data is not available');
  } else if (latestAnnualEps.value <= 0) {
    caveats.push(
      `No P/E ratio: diluted EPS was not positive for the fiscal year ended ${latestAnnualEps.end}`,
    );
  } else {
    caveats.push(
      `P/E uses diluted EPS for the fiscal year ended ${latestAnnualEps.end}`,
    );
  }

  return {
    ...toInstrument(instrument),
    price: latestBar.close,
    metrics: {
      drawdownFromHighPercent,
      revenueGrowthPercent: revenueGrowth?.percent ?? null,
      priceToEarnings:
        latestAnnualEps && latestAnnualEps.value > 0
          ? latestBar.close / latestAnnualEps.value
          : null,
    },
    signals,
    caveats,
  };
}

function calculateDrawdownFromHigh(
  completedDailyBars: readonly DailyBar[],
  latestBar: DailyBar,
  asOfDate: string,
) {
  const yearStartDate = new Date(Date.parse(asOfDate) - YEAR_DAYS * DAY_MS)
    .toISOString()
    .slice(0, 10);
  const yearHigh = Math.max(
    ...completedDailyBars
      .filter((bar) => bar.date >= yearStartDate)
      .map((bar) => bar.high),
  );
  return Math.max(0, (1 - latestBar.close / yearHigh) * 100);
}

function calculateRevenueGrowth(quarterlyRevenue: readonly ReportedValue[]) {
  const latestQuarter = quarterlyRevenue.at(-1);
  if (!latestQuarter) {
    return undefined;
  }

  const yearEarlierEndMs = Date.parse(latestQuarter.end) - YEAR_DAYS * DAY_MS;
  const comparableQuarter = quarterlyRevenue.find(
    ({ end }) =>
      Math.abs(Date.parse(end) - yearEarlierEndMs) <=
      COMPARABLE_QUARTER_TOLERANCE_DAYS * DAY_MS,
  );
  if (!comparableQuarter || comparableQuarter.value <= 0) {
    return undefined;
  }

  return {
    percent: (latestQuarter.value / comparableQuarter.value - 1) * 100,
    quarterEnd: latestQuarter.end,
  };
}
