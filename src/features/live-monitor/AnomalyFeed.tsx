import { ChartColumn, TrendingDown, TrendingUp } from 'lucide-react';
import { Link } from 'react-router';
import { marketPulseApi } from '../../api/marketPulseApi.ts';
import { liveMonitorInstrumentPath } from '../../app/routePaths.ts';
import type { AnomalyDetectedEvent } from '../../contracts/anomalies.ts';
import { formatShortDateTime } from '../../formatting/marketFormat.ts';
import styles from './AnomalyFeed.module.scss';

interface AnomalyFeedProps {
  selectedSymbol: string;
}

const EMPTY_ANOMALIES: readonly AnomalyDetectedEvent[] = [];

function describeAnomalyKind({ anomaly }: AnomalyDetectedEvent) {
  if (anomaly.kind === 'relative-volume') {
    return { label: 'Heavy volume', tone: 'warning', icon: ChartColumn };
  }
  return anomaly.changePercent < 0
    ? { label: 'Price drop', tone: 'negative', icon: TrendingDown }
    : { label: 'Price jump', tone: 'positive', icon: TrendingUp };
}

export function AnomalyFeed({ selectedSymbol }: AnomalyFeedProps) {
  const { anomalies } = marketPulseApi.endpoints.getAnomalies.useQueryState(
    undefined,
    {
      selectFromResult: ({ data }) => ({
        anomalies: data?.anomalies ?? EMPTY_ANOMALIES,
      }),
    },
  );
  const newestFirst = anomalies.toReversed();
  const latestAnomaly = newestFirst[0];

  return (
    <section className={styles.panel} aria-labelledby="anomaly-feed-heading">
      <header className={styles.header}>
        <h2 id="anomaly-feed-heading" className={styles.heading}>
          Unusual activity
        </h2>
        <span className={styles.count}>{anomalies.length}</span>
      </header>
      <p className={styles.liveAnnouncement} aria-live="polite">
        {latestAnomaly && `Alert: ${latestAnomaly.anomaly.description}`}
      </p>
      {newestFirst.length === 0 ? (
        <p className={styles.empty}>
          Nothing unusual yet. Sharp price moves and heavy trading volume show
          up here as the replay detects them.
        </p>
      ) : (
        <ol className={styles.list}>
          {newestFirst.map((event) => {
            const { label, tone, icon: Icon } = describeAnomalyKind(event);
            const { symbol, description, rule } = event.anomaly;
            return (
              <li
                key={event.id}
                className={styles.item}
                data-selected={symbol === selectedSymbol}
              >
                <span className={styles.icon} data-tone={tone}>
                  <Icon size={16} aria-hidden="true" />
                </span>
                <div className={styles.body}>
                  <p className={styles.meta}>
                    <Link
                      to={liveMonitorInstrumentPath(symbol)}
                      className={styles.symbolLink}
                    >
                      {symbol}
                    </Link>
                    <span>{label}</span>
                    <time dateTime={event.occurredAt} className={styles.time}>
                      {formatShortDateTime(event.occurredAt)}
                    </time>
                  </p>
                  <p className={styles.description}>{description}</p>
                  <p className={styles.rule}>Rule: {rule}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
