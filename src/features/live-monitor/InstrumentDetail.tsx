import { ArrowLeft, SearchX } from 'lucide-react';
import { Link } from 'react-router';
import { marketPulseApi } from '../../api/marketPulseApi.ts';
import { liveMonitorInstrumentPath, routePaths } from '../../app/routePaths.ts';
import type { AnomalyDetectedEvent } from '../../contracts/anomalies.ts';
import type { AssetClass } from '../../contracts/market.ts';
import buttonStyles from '../../components/Button.module.scss';
import { EmptyState } from '../../components/EmptyState.tsx';
import {
  formatMarketDateTime,
  formatPrice,
  formatPriceChange,
  formatVolume,
  getTimeZoneLabel,
} from '../../formatting/marketFormat.ts';
import { ChangeBadge } from './ChangeBadge.tsx';
import styles from './InstrumentDetail.module.scss';
import { DEFAULT_SYMBOL } from './liveMonitorDefaults.ts';
import { PriceChart } from './PriceChart.tsx';
import { TickingPrice } from './TickingPrice.tsx';

interface InstrumentDetailProps {
  selectedSymbol: string;
}

const assetClassLabel: Record<AssetClass, string> = {
  index: 'Index',
  stock: 'Stock',
  crypto: 'Crypto',
  currency: 'Currency pair',
};

const EMPTY_ANOMALIES: readonly AnomalyDetectedEvent[] = [];

export function InstrumentDetail({ selectedSymbol }: InstrumentDetailProps) {
  const { quote } = marketPulseApi.endpoints.getMarketSnapshot.useQueryState(
    undefined,
    {
      selectFromResult: ({ data }) => ({
        quote: data?.quotes.find(({ symbol }) => symbol === selectedSymbol),
      }),
    },
  );
  const { pricePoints, isHistoryUnavailable } =
    marketPulseApi.endpoints.getPriceHistory.useQueryState(selectedSymbol, {
      selectFromResult: ({ data, isError }) => ({
        pricePoints: data?.points,
        isHistoryUnavailable: isError && !data,
      }),
    });
  const { anomalies } = marketPulseApi.endpoints.getAnomalies.useQueryState(
    undefined,
    {
      selectFromResult: ({ data }) => ({
        anomalies: data?.anomalies ?? EMPTY_ANOMALIES,
      }),
    },
  );

  if (!quote) {
    return (
      <EmptyState
        icon={SearchX}
        title={`${selectedSymbol} is not tracked`}
        description="The demo follows a fixed set of indices, stocks, Bitcoin, and EUR/USD."
      >
        <Link
          to={liveMonitorInstrumentPath(DEFAULT_SYMBOL)}
          className={buttonStyles.secondary}
        >
          Show the S&amp;P 500
        </Link>
      </EmptyState>
    );
  }

  const instrumentAnomalies = anomalies.filter(
    ({ anomaly }) => anomaly.symbol === quote.symbol,
  );
  const isUp = quote.change >= 0;

  return (
    <article className={styles.panel} aria-labelledby="instrument-heading">
      <Link to={routePaths.liveMonitor} className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden="true" />
        All markets
      </Link>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h2 id="instrument-heading" className={styles.name}>
            {quote.name}
          </h2>
          <span className={styles.chip}>{quote.symbol}</span>
          <span className={styles.chip}>
            {assetClassLabel[quote.assetClass]}
          </span>
        </div>
        <div className={styles.priceRow}>
          <TickingPrice quote={quote} className={styles.price} />
          <span className={styles.change} data-direction={isUp ? 'up' : 'down'}>
            {formatPriceChange(quote.change, quote)}
          </span>
          <ChangeBadge changePercent={quote.changePercent} size="large" />
        </div>
        <p className={styles.timestamp}>
          Last update{' '}
          <time dateTime={quote.timestamp}>
            {formatMarketDateTime(quote.timestamp)}
          </time>
        </p>
      </header>

      <dl className={styles.stats}>
        <div className={styles.stat}>
          <dt>Previous close</dt>
          <dd>{formatPrice(quote.previousClose, quote)}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Session volume</dt>
          <dd>
            {quote.sessionVolume === null
              ? 'Not available'
              : formatVolume(quote.sessionVolume)}
          </dd>
        </div>
        <div className={styles.stat}>
          <dt>Quoted in</dt>
          <dd>{quote.currency}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Alerts in replay</dt>
          <dd>{instrumentAnomalies.length}</dd>
        </div>
      </dl>

      <figure className={styles.chartFigure}>
        {pricePoints ? (
          <PriceChart
            key={quote.symbol}
            instrument={quote}
            pricePoints={pricePoints}
            anomalies={instrumentAnomalies}
            previousClose={quote.previousClose}
            trend={isUp ? 'up' : 'down'}
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
        <figcaption className={styles.caption}>
          {`5-minute closing prices${quote.sessionVolume === null ? '' : ' and volume'}. `}
          {`Times in ${getTimeZoneLabel(quote.timestamp)}. `}
          Markers show detected unusual activity.
        </figcaption>
      </figure>
    </article>
  );
}
