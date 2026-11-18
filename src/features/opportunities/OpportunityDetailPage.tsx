import {
  Activity,
  ArrowLeft,
  CircleMinus,
  SearchX,
  TrendingDown,
  TrendingUp,
  TriangleExclamationPoint,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { marketPulseApi } from '../../api/marketPulseApi.ts';
import { liveMonitorInstrumentPath, routePaths } from '../../app/routePaths.ts';
import buttonStyles from '../../components/Button.module.scss';
import { EmptyState } from '../../components/EmptyState.tsx';
import { PageHeader } from '../../components/PageHeader.tsx';
import type { AssetClass } from '../../contracts/market.ts';
import type {
  Opportunity,
  ScreeningFactor,
} from '../../contracts/opportunities.ts';
import {
  formatCalendarDate,
  formatMarketDateTime,
  formatMetricPercent,
  formatPrice,
  formatRatio,
  formatSignedMetricPercent,
  formatSignedPoints,
} from '../../formatting/marketFormat.ts';
import { ReplayPanel } from '../replay/ReplayPanel.tsx';
import { WatchToggleButton } from '../watchlist/WatchToggleButton.tsx';
import { BiasBadge } from './BiasBadge.tsx';
import { DailyPriceChart } from './DailyPriceChart.tsx';
import styles from './OpportunityDetailPage.module.scss';
import { biasLabel } from './opportunityLabels.ts';
import { OPPORTUNITY_POLLING } from './opportunityPolling.ts';
import { ScreeningDisclaimer } from './ScreeningDisclaimer.tsx';

const assetClassLabel: Record<AssetClass, string> = {
  index: 'Index',
  stock: 'Stock',
  crypto: 'Crypto',
  currency: 'Currency pair',
};

const factorDirectionIcon: Record<ScreeningFactor['direction'], LucideIcon> = {
  long: TrendingUp,
  short: TrendingDown,
  neutral: CircleMinus,
};

const factorDirectionLabel: Record<ScreeningFactor['direction'], string> = {
  long: 'Points long',
  short: 'Points short',
  neutral: 'Neutral',
};

export function OpportunityDetailPage() {
  const { symbol = '' } = useParams();
  const { opportunity, screeningTime, hasScreening, isUnavailable } =
    marketPulseApi.useGetOpportunitiesQuery(undefined, {
      ...OPPORTUNITY_POLLING,
      selectFromResult: ({ data, isError }) => ({
        opportunity: data?.opportunities.find(
          (screened) => screened.symbol === symbol,
        ),
        screeningTime: data?.asOf,
        hasScreening: data !== undefined,
        isUnavailable: isError && data === undefined,
      }),
    });

  if (isUnavailable) {
    return (
      <DetailMessage
        title="Screening results are unavailable"
        description="The demo API did not respond. Make sure the mock API is running (npm run dev), then try again."
      />
    );
  }
  if (!hasScreening) {
    return (
      <div className={styles.skeleton} aria-busy="true">
        <title>Opportunity Radar · Market Pulse</title>
      </div>
    );
  }
  if (!opportunity || !screeningTime) {
    return (
      <DetailMessage
        title={`${symbol} is not part of the screening`}
        description="Opportunity Radar screens a fixed set of indices, stocks, Bitcoin, and EUR/USD."
      />
    );
  }

  return (
    <OpportunityDetail
      opportunity={opportunity}
      screeningTime={screeningTime}
    />
  );
}

function DetailMessage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <>
      <PageHeader
        title="Opportunity Radar"
        description="Details of a screened instrument."
      />
      <ReplayPanel />
      <EmptyState icon={SearchX} title={title} description={description}>
        <Link to={routePaths.opportunities} className={buttonStyles.secondary}>
          Back to Opportunity Radar
        </Link>
      </EmptyState>
    </>
  );
}

interface OpportunityDetailProps {
  opportunity: Opportunity;
  screeningTime: string;
}

function OpportunityDetail({
  opportunity,
  screeningTime,
}: OpportunityDetailProps) {
  const { symbol, name, assetClass, bias, factors, risks, freshness } =
    opportunity;
  const { data: dailyHistory, isError: isHistoryUnavailable } =
    marketPulseApi.useGetDailyHistoryQuery(symbol, OPPORTUNITY_POLLING);
  const countFactors = (direction: ScreeningFactor['direction']) =>
    factors.filter((factor) => factor.direction === direction).length;

  return (
    <>
      <title>{`${name} · Opportunity Radar · Market Pulse`}</title>
      <Link to={routePaths.opportunities} className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden="true" />
        Opportunity Radar
      </Link>

      <header className={styles.header}>
        <div className={styles.identity}>
          <div className={styles.titleRow}>
            <h1 className={styles.name}>{name}</h1>
            <span className={styles.chip}>{symbol}</span>
            <span className={styles.chip}>{assetClassLabel[assetClass]}</span>
          </div>
          <p className={styles.price}>
            {formatPrice(opportunity.price, opportunity)}
            <span className={styles.priceNote}>
              {`Close on ${formatCalendarDate(freshness.lastCloseDate)}`}
            </span>
          </p>
        </div>
        <div className={styles.actions}>
          <WatchToggleButton symbol={symbol} showLabel />
          <Link
            to={liveMonitorInstrumentPath(symbol)}
            className={buttonStyles.secondary}
          >
            <Activity size={16} aria-hidden="true" />
            Open in Live Monitor
          </Link>
        </div>
      </header>

      <ReplayPanel />

      <div className={styles.layout}>
        <div className={styles.mainColumn}>
          <section className={styles.card} aria-labelledby="bias-heading">
            <div className={styles.biasSummary}>
              <h2 id="bias-heading" className={styles.cardTitle}>
                Why it surfaced
              </h2>
              <BiasBadge bias={bias} size="large" />
            </div>
            <p className={styles.biasExplanation}>
              {`${biasLabel[bias]}: ${String(countFactors('long'))} of ${String(factors.length)} rules point long and ${String(countFactors('short'))} point short. A long or short bias needs at least two more signals on one side than on the other.`}
            </p>
            <ul className={styles.factorList}>
              {factors.map((factor) => (
                <FactorItem key={factor.rule} factor={factor} />
              ))}
            </ul>
          </section>

          <section className={styles.card} aria-labelledby="chart-heading">
            <h2 id="chart-heading" className={styles.cardTitle}>
              Price over the last year
            </h2>
            {dailyHistory ? (
              <DailyPriceChart
                instrument={opportunity}
                bars={dailyHistory.bars}
                fiftyTwoWeekHigh={opportunity.metrics.fiftyTwoWeekHigh}
              />
            ) : (
              <div className={styles.chartPlaceholder}>
                {isHistoryUnavailable ? (
                  <p>Price history is unavailable right now.</p>
                ) : (
                  <span className={styles.chartSkeleton} aria-hidden="true" />
                )}
              </div>
            )}
          </section>
        </div>

        <aside className={styles.sideColumn} aria-label="Metrics and risks">
          <section className={styles.card} aria-labelledby="risks-heading">
            <h2 id="risks-heading" className={styles.cardTitle}>
              Risks and caveats
            </h2>
            {risks.length === 0 ? (
              <p className={styles.muted}>
                No specific risks were flagged. Screening rules still miss news,
                earnings dates, and other events.
              </p>
            ) : (
              <ul className={styles.riskList}>
                {risks.map((risk) => (
                  <li key={risk}>
                    <TriangleExclamationPoint size={16} aria-hidden="true" />
                    {risk}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.card} aria-labelledby="metrics-heading">
            <h2 id="metrics-heading" className={styles.cardTitle}>
              Key metrics
            </h2>
            <MetricList opportunity={opportunity} />
          </section>

          <section className={styles.card} aria-labelledby="freshness-heading">
            <h2 id="freshness-heading" className={styles.cardTitle}>
              Data freshness
            </h2>
            <dl className={styles.metricList}>
              <Metric label="Screening run">
                {formatMarketDateTime(screeningTime)}
              </Metric>
              <Metric label="Prices">
                {`Daily close of ${formatCalendarDate(freshness.lastCloseDate)}`}
              </Metric>
              <Metric label="Revenue">
                {freshness.revenueQuarterEnd && freshness.revenueFiledOn
                  ? `Quarter ended ${formatCalendarDate(freshness.revenueQuarterEnd)}, filed ${formatCalendarDate(freshness.revenueFiledOn)}`
                  : notAvailableReason(assetClass)}
              </Metric>
              <Metric label="Earnings">
                {freshness.earningsFiscalYearEnd
                  ? `Fiscal year ended ${formatCalendarDate(freshness.earningsFiscalYearEnd)}`
                  : notAvailableReason(assetClass)}
              </Metric>
            </dl>
          </section>
        </aside>
      </div>

      <ScreeningDisclaimer />
    </>
  );
}

function notAvailableReason(assetClass: AssetClass) {
  return assetClass === 'stock' ? 'Not available' : 'Does not apply';
}

function describePriceToEarnings({
  metrics,
  freshness,
  assetClass,
}: Opportunity) {
  if (metrics.priceToEarnings !== null) {
    return formatRatio(metrics.priceToEarnings);
  }
  // Earnings were reported but not positive, so a P/E ratio would be meaningless.
  return freshness.earningsFiscalYearEnd
    ? 'Unprofitable'
    : notAvailableReason(assetClass);
}

function FactorItem({ factor }: { factor: ScreeningFactor }) {
  const Icon = factorDirectionIcon[factor.direction];
  return (
    <li className={styles.factor} data-direction={factor.direction}>
      <span className={styles.factorIcon}>
        <Icon size={16} aria-hidden="true" />
      </span>
      <div className={styles.factorText}>
        <p className={styles.factorTitle}>
          {factor.title}
          <span className={styles.factorDirection}>
            {factorDirectionLabel[factor.direction]}
          </span>
        </p>
        <p>{factor.explanation}</p>
        <p className={styles.factorRule}>{`Rule: ${factor.ruleDescription}`}</p>
      </div>
    </li>
  );
}

function Metric({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.metric}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function MetricList({ opportunity }: { opportunity: Opportunity }) {
  const { metrics, assetClass } = opportunity;
  const missing = notAvailableReason(assetClass);
  const optional = (value: number | null, format: (value: number) => string) =>
    value === null ? 'Not available' : format(value);
  const formatAmount = (value: number) => formatPrice(value, opportunity);

  return (
    <dl className={styles.metricList}>
      <Metric label="52-week high">
        {formatAmount(metrics.fiftyTwoWeekHigh)}
      </Metric>
      <Metric label="Below 52-week high">
        {formatMetricPercent(metrics.drawdownFromHighPercent)}
      </Metric>
      <Metric label="50-day average">
        {optional(metrics.movingAverage50, formatAmount)}
      </Metric>
      <Metric label="200-day average">
        {optional(metrics.movingAverage200, formatAmount)}
      </Metric>
      <Metric label="vs 200-day average">
        {optional(
          metrics.priceVs200DayAveragePercent,
          formatSignedMetricPercent,
        )}
      </Metric>
      <Metric label="3-month return">
        {optional(metrics.threeMonthReturnPercent, formatSignedMetricPercent)}
      </Metric>
      <Metric label="3 months vs S&P 500">
        {optional(metrics.relativeStrengthPoints, formatSignedPoints)}
      </Metric>
      <Metric label="Revenue growth (YoY)">
        {metrics.revenueGrowthPercent === null
          ? missing
          : formatSignedMetricPercent(metrics.revenueGrowthPercent)}
      </Metric>
      <Metric label="P/E (fiscal year)">
        {describePriceToEarnings(opportunity)}
      </Metric>
    </dl>
  );
}
