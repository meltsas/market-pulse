import type { AssetClass, DataSource } from '../../src/contracts/market.ts';
import type {
  Bias,
  DailyHistory,
  Opportunity,
  OpportunityList,
  ScreeningFactor,
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
const QUARTER_DAYS = 91;
const COMPARABLE_QUARTER_TOLERANCE_DAYS = 15;
const SHORT_AVERAGE_SESSIONS = 50;
const LONG_AVERAGE_SESSIONS = 200;
export const BENCHMARK_SYMBOL = 'SPX';
const RELATIVE_STRENGTH_THRESHOLD_POINTS = 5;
const REVENUE_GROWTH_LONG_PERCENT = 20;
const PRICE_TO_EARNINGS_LONG_MAX = 25;
const PRICE_TO_EARNINGS_SHORT_MIN = 50;
const BIAS_SCORE_THRESHOLD = 2;
const DRAWDOWN_RISK_PERCENT = 20;

const missingFundamentalsRisk: Record<Exclude<AssetClass, 'stock'>, string> = {
  index:
    'Company fundamentals such as revenue and earnings do not apply to an index.',
  crypto:
    'Company fundamentals such as revenue and earnings do not apply to a cryptocurrency.',
  currency:
    'Company fundamentals such as revenue and earnings do not apply to a currency pair.',
};

const reportDateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

interface ReplayAnalysisOptions {
  recordedMarketData: RecordedMarketData;
  marketTimeMs: number;
  dataSource: DataSource;
}

interface OpportunityListOptions extends ReplayAnalysisOptions {
  instruments: readonly DemoInstrument[];
  fundamentals: SecFundamentals;
}

interface DailyHistoryOptions extends ReplayAnalysisOptions {
  symbol: string;
}

interface RevenueGrowth {
  percent: number;
  quarterEnd: string;
  filed: string;
}

interface InstrumentScreening {
  instrument: DemoInstrument;
  completedBars: readonly DailyBar[];
  benchmarkReturnPercent: number | null;
  companyFundamentals: CompanyFundamentals | undefined;
  analysisDate: string;
}

// Screening runs on completed daily closes, as a nightly job at 00:00 UTC would.
export function createOpportunityList({
  instruments,
  recordedMarketData,
  fundamentals,
  marketTimeMs,
  dataSource,
}: OpportunityListOptions): OpportunityList {
  const analysisDate = toDate(marketTimeMs);
  const benchmarkReturnPercent = calculateThreeMonthReturn(
    findCompletedBars(recordedMarketData, BENCHMARK_SYMBOL, analysisDate),
  );

  const opportunities = instruments.flatMap((instrument) => {
    const opportunity = screenInstrument({
      instrument,
      completedBars: findCompletedBars(
        recordedMarketData,
        instrument.symbol,
        analysisDate,
      ),
      benchmarkReturnPercent:
        instrument.symbol === BENCHMARK_SYMBOL ? null : benchmarkReturnPercent,
      companyFundamentals: fundamentals.companies.find(
        ({ symbol }) => symbol === instrument.symbol,
      ),
      analysisDate,
    });
    return opportunity ? [opportunity] : [];
  });

  return {
    asOf: `${analysisDate}T00:00:00.000Z`,
    dataSource,
    opportunities,
  };
}

export function createDailyHistory({
  symbol,
  recordedMarketData,
  marketTimeMs,
  dataSource,
}: DailyHistoryOptions): DailyHistory | undefined {
  if (
    !recordedMarketData.instruments.some(
      (recorded) => recorded.symbol === symbol,
    )
  ) {
    return undefined;
  }
  const analysisDate = toDate(marketTimeMs);
  const completedBars = findCompletedBars(
    recordedMarketData,
    symbol,
    analysisDate,
  );
  const yearStartDate = shiftDate(analysisDate, -YEAR_DAYS);

  return {
    asOf: `${analysisDate}T00:00:00.000Z`,
    dataSource,
    symbol,
    bars: completedBars.flatMap((bar, barIndex) =>
      bar.date < yearStartDate
        ? []
        : [
            {
              date: bar.date,
              close: bar.close,
              movingAverage50: averageCloseEndingAt(
                completedBars,
                barIndex,
                SHORT_AVERAGE_SESSIONS,
              ),
              movingAverage200: averageCloseEndingAt(
                completedBars,
                barIndex,
                LONG_AVERAGE_SESSIONS,
              ),
            },
          ],
    ),
  };
}

function screenInstrument({
  instrument,
  completedBars,
  benchmarkReturnPercent,
  companyFundamentals,
  analysisDate,
}: InstrumentScreening): Opportunity | undefined {
  const latestBar = completedBars.at(-1);
  if (!latestBar) {
    return undefined;
  }

  const lastBarIndex = completedBars.length - 1;
  const fiftyTwoWeekHigh = Math.max(
    ...completedBars
      .filter((bar) => bar.date >= shiftDate(analysisDate, -YEAR_DAYS))
      .map((bar) => bar.high),
  );
  const drawdownFromHighPercent = Math.max(
    0,
    (1 - latestBar.close / fiftyTwoWeekHigh) * 100,
  );
  const movingAverage50 = averageCloseEndingAt(
    completedBars,
    lastBarIndex,
    SHORT_AVERAGE_SESSIONS,
  );
  const movingAverage200 = averageCloseEndingAt(
    completedBars,
    lastBarIndex,
    LONG_AVERAGE_SESSIONS,
  );
  const priceVs200DayAveragePercent =
    movingAverage200 === null
      ? null
      : (latestBar.close / movingAverage200 - 1) * 100;
  const threeMonthReturnPercent = calculateThreeMonthReturn(completedBars);
  const relativeStrengthPoints =
    threeMonthReturnPercent === null || benchmarkReturnPercent === null
      ? null
      : threeMonthReturnPercent - benchmarkReturnPercent;

  const { assetClass } = instrument;
  const isStock = assetClass === 'stock';
  const filedBeforeAnalysis = ({ filed }: ReportedValue) =>
    filed < analysisDate;
  const revenueGrowth = companyFundamentals
    ? calculateRevenueGrowth(
        companyFundamentals.quarterlyRevenue.filter(filedBeforeAnalysis),
      )
    : undefined;
  const latestAnnualEps = companyFundamentals?.annualDilutedEps
    .filter(filedBeforeAnalysis)
    .at(-1);
  const priceToEarnings =
    latestAnnualEps && latestAnnualEps.value > 0
      ? latestBar.close / latestAnnualEps.value
      : null;

  const factors: ScreeningFactor[] = [];
  if (priceVs200DayAveragePercent !== null) {
    factors.push(describeTrend(priceVs200DayAveragePercent));
  }
  if (
    relativeStrengthPoints !== null &&
    threeMonthReturnPercent !== null &&
    benchmarkReturnPercent !== null
  ) {
    factors.push(
      describeRelativeStrength(
        relativeStrengthPoints,
        threeMonthReturnPercent,
        benchmarkReturnPercent,
      ),
    );
  }
  if (isStock && revenueGrowth) {
    factors.push(describeRevenueGrowth(revenueGrowth));
  }
  if (isStock && latestAnnualEps) {
    factors.push(describeValuation(latestAnnualEps, priceToEarnings));
  }

  const longFactorCount = factors.filter(
    ({ direction }) => direction === 'long',
  ).length;
  const shortFactorCount = factors.filter(
    ({ direction }) => direction === 'short',
  ).length;
  const biasScore = longFactorCount - shortFactorCount;

  const risks: string[] = [];
  if (drawdownFromHighPercent >= DRAWDOWN_RISK_PERCENT) {
    risks.push(
      `Trades ${drawdownFromHighPercent.toFixed(1)}% below its 52-week high. A large drop does not by itself make it cheap; the decline may continue.`,
    );
  }
  if (longFactorCount > 0 && shortFactorCount > 0) {
    risks.push('Signals disagree: some rules point long and others short.');
  }
  if (movingAverage200 === null) {
    risks.push(
      'Fewer than 200 trading days of history, so there is no trend signal.',
    );
  }
  if (!isStock) {
    risks.push(missingFundamentalsRisk[assetClass]);
  } else {
    if (!revenueGrowth) {
      risks.push(
        'Revenue growth is unavailable: there is no comparable quarter from a year earlier.',
      );
    }
    if (!latestAnnualEps) {
      risks.push('No valuation signal: annual earnings data is not available.');
    }
  }

  return {
    ...toInstrument(instrument),
    price: latestBar.close,
    bias: toBias(biasScore),
    biasScore,
    factors,
    risks,
    metrics: {
      fiftyTwoWeekHigh,
      drawdownFromHighPercent,
      movingAverage50,
      movingAverage200,
      priceVs200DayAveragePercent,
      threeMonthReturnPercent,
      relativeStrengthPoints,
      revenueGrowthPercent: revenueGrowth?.percent ?? null,
      priceToEarnings,
    },
    freshness: {
      lastCloseDate: latestBar.date,
      revenueQuarterEnd: revenueGrowth?.quarterEnd ?? null,
      revenueFiledOn: revenueGrowth?.filed ?? null,
      earningsFiscalYearEnd: latestAnnualEps?.end ?? null,
    },
  };
}

function toBias(biasScore: number): Bias {
  if (biasScore >= BIAS_SCORE_THRESHOLD) {
    return 'long';
  }
  return biasScore <= -BIAS_SCORE_THRESHOLD ? 'short' : 'mixed';
}

function describeTrend(priceVs200DayAveragePercent: number): ScreeningFactor {
  const isAbove = priceVs200DayAveragePercent >= 0;
  return {
    rule: 'trend',
    direction: isAbove ? 'long' : 'short',
    title: isAbove ? 'Above its 200-day average' : 'Below its 200-day average',
    explanation: `The last close is ${Math.abs(priceVs200DayAveragePercent).toFixed(1)}% ${isAbove ? 'above' : 'below'} the average of the last 200 closes.`,
    ruleDescription: 'Long above the 200-day average, short below it.',
  };
}

function describeRelativeStrength(
  relativeStrengthPoints: number,
  threeMonthReturnPercent: number,
  benchmarkReturnPercent: number,
): ScreeningFactor {
  const explanation = `Three-month return of ${formatSignedPercent(threeMonthReturnPercent)} against ${formatSignedPercent(benchmarkReturnPercent)} for the S&P 500.`;
  const ruleDescription = `Long when the three-month return beats the S&P 500 by ${String(RELATIVE_STRENGTH_THRESHOLD_POINTS)} points or more, short when it trails by ${String(RELATIVE_STRENGTH_THRESHOLD_POINTS)} points or more.`;
  if (relativeStrengthPoints >= RELATIVE_STRENGTH_THRESHOLD_POINTS) {
    return {
      rule: 'relative-strength',
      direction: 'long',
      title: 'Outperforming the S&P 500',
      explanation,
      ruleDescription,
    };
  }
  if (relativeStrengthPoints <= -RELATIVE_STRENGTH_THRESHOLD_POINTS) {
    return {
      rule: 'relative-strength',
      direction: 'short',
      title: 'Underperforming the S&P 500',
      explanation,
      ruleDescription,
    };
  }
  return {
    rule: 'relative-strength',
    direction: 'neutral',
    title: 'In line with the S&P 500',
    explanation,
    ruleDescription,
  };
}

function describeRevenueGrowth({
  percent,
  quarterEnd,
}: RevenueGrowth): ScreeningFactor {
  const explanation = `Revenue ${percent < 0 ? 'fell' : 'grew'} ${Math.abs(percent).toFixed(1)}% year over year in the quarter ended ${formatReportDate(quarterEnd)}.`;
  const ruleDescription = `Long at ${String(REVENUE_GROWTH_LONG_PERCENT)}% year-over-year growth or more, short when revenue shrinks.`;
  if (percent >= REVENUE_GROWTH_LONG_PERCENT) {
    return {
      rule: 'revenue-growth',
      direction: 'long',
      title: 'Strong revenue growth',
      explanation,
      ruleDescription,
    };
  }
  return {
    rule: 'revenue-growth',
    direction: percent < 0 ? 'short' : 'neutral',
    title: percent < 0 ? 'Shrinking revenue' : 'Moderate revenue growth',
    explanation,
    ruleDescription,
  };
}

function describeValuation(
  annualEps: ReportedValue,
  priceToEarnings: number | null,
): ScreeningFactor {
  const fiscalYearEnd = formatReportDate(annualEps.end);
  const ruleDescription = `Long at a P/E of ${String(PRICE_TO_EARNINGS_LONG_MAX)} or less, short at ${String(PRICE_TO_EARNINGS_SHORT_MIN)} or more or when the company is unprofitable.`;
  if (priceToEarnings === null) {
    return {
      rule: 'valuation',
      direction: 'short',
      title: 'Unprofitable',
      explanation: `Diluted earnings per share were ${formatSignedNumber(annualEps.value, 2)} in the fiscal year ended ${fiscalYearEnd}, so there is no P/E ratio.`,
      ruleDescription,
    };
  }

  const explanation = `P/E of ${priceToEarnings.toFixed(1)}, based on diluted earnings for the fiscal year ended ${fiscalYearEnd} rather than the last twelve months.`;
  if (priceToEarnings <= PRICE_TO_EARNINGS_LONG_MAX) {
    return {
      rule: 'valuation',
      direction: 'long',
      title: 'Modest valuation',
      explanation,
      ruleDescription,
    };
  }
  return {
    rule: 'valuation',
    direction:
      priceToEarnings >= PRICE_TO_EARNINGS_SHORT_MIN ? 'short' : 'neutral',
    title:
      priceToEarnings >= PRICE_TO_EARNINGS_SHORT_MIN
        ? 'Expensive valuation'
        : 'Moderate valuation',
    explanation,
    ruleDescription,
  };
}

function findCompletedBars(
  recordedMarketData: RecordedMarketData,
  symbol: string,
  analysisDate: string,
) {
  return (
    recordedMarketData.instruments
      .find((recorded) => recorded.symbol === symbol)
      ?.dailyBars.filter((bar) => bar.date < analysisDate) ?? []
  );
}

function averageCloseEndingAt(
  bars: readonly DailyBar[],
  endIndex: number,
  sessions: number,
) {
  if (endIndex + 1 < sessions) {
    return null;
  }
  const window = bars.slice(endIndex + 1 - sessions, endIndex + 1);
  return window.reduce((sum, { close }) => sum + close, 0) / sessions;
}

function calculateThreeMonthReturn(completedBars: readonly DailyBar[]) {
  const latestBar = completedBars.at(-1);
  if (!latestBar) {
    return null;
  }
  const quarterStartDate = shiftDate(latestBar.date, -QUARTER_DAYS);
  const startBar = completedBars.findLast(
    (bar) => bar.date <= quarterStartDate,
  );
  return startBar ? (latestBar.close / startBar.close - 1) * 100 : null;
}

function calculateRevenueGrowth(
  quarterlyRevenue: readonly ReportedValue[],
): RevenueGrowth | undefined {
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
    filed: latestQuarter.filed,
  };
}

function toDate(timeMs: number) {
  return new Date(timeMs).toISOString().slice(0, 10);
}

function shiftDate(date: string, days: number) {
  return toDate(Date.parse(date) + days * DAY_MS);
}

function formatReportDate(date: string) {
  return reportDateFormat.format(new Date(date));
}

function formatSignedNumber(value: number, fractionDigits: number) {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toFixed(fractionDigits)}`;
}

function formatSignedPercent(percent: number) {
  return `${formatSignedNumber(percent, 1)}%`;
}
