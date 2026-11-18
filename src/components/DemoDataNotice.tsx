import { Rewind } from 'lucide-react';
import type { ReactNode } from 'react';
import type { DataSource } from '../contracts/market.ts';
import {
  formatMarketDateTime,
  formatReplayWindow,
} from '../formatting/marketFormat.ts';
import styles from './DemoDataNotice.module.scss';

interface DemoDataNoticeProps {
  dataSource: DataSource;
  marketTime: string;
  statusIndicator?: ReactNode;
  children?: ReactNode;
}

const SECONDS_PER_MINUTE = 60;

export function DemoDataNotice({
  dataSource,
  marketTime,
  statusIndicator,
  children,
}: DemoDataNoticeProps) {
  const { kind, replayStart, replayEnd, speedMultiplier, isPaused, providers } =
    dataSource;
  const replayedMinutesPerSecond = speedMultiplier / SECONDS_PER_MINUTE;
  const isSynthetic = kind === 'synthetic-replay';
  const dataDescription = isSynthetic
    ? `Generated prices, not real market data, for ${formatReplayWindow(replayStart, replayEnd)}`
    : `Recorded market data from ${formatReplayWindow(replayStart, replayEnd)}`;

  return (
    <aside className={styles.notice} aria-label="About this data">
      <div className={styles.summary}>
        <span className={styles.icon}>
          <Rewind size={18} aria-hidden="true" />
        </span>
        <div className={styles.text}>
          <div className={styles.titleRow}>
            <p className={styles.title}>
              {isSynthetic ? 'Synthetic replay' : 'Historical replay'}
              <span className={styles.badge}>Demo data</span>
            </p>
            {statusIndicator}
          </div>
          <p className={styles.description}>
            {`${dataDescription}, replayed at ${String(speedMultiplier)}× speed: every second covers ${String(replayedMinutesPerSecond)} minutes of trading. Source: ${providers.join(', ')}.`}
          </p>
        </div>
        <p className={styles.clock}>
          <span className={styles.clockLabel}>
            Market time
            {isPaused && <span className={styles.pausedBadge}>Paused</span>}
          </span>
          <time dateTime={marketTime} className={styles.clockValue}>
            {formatMarketDateTime(marketTime)}
          </time>
        </p>
      </div>
      {children}
    </aside>
  );
}
