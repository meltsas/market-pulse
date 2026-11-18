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
  children?: ReactNode;
}

const SECONDS_PER_MINUTE = 60;

export function DemoDataNotice({
  dataSource,
  marketTime,
  children,
}: DemoDataNoticeProps) {
  const { replayStart, replayEnd, speedMultiplier, isPaused, providers } =
    dataSource;
  const replayedMinutesPerSecond = speedMultiplier / SECONDS_PER_MINUTE;

  return (
    <aside className={styles.notice} aria-label="About this data">
      <div className={styles.summary}>
        <span className={styles.icon}>
          <Rewind size={18} aria-hidden="true" />
        </span>
        <div className={styles.text}>
          <p className={styles.title}>
            Historical replay
            <span className={styles.badge}>Demo data</span>
          </p>
          <p className={styles.description}>
            {`Recorded market data from ${formatReplayWindow(replayStart, replayEnd)}, replayed at ${String(speedMultiplier)}× speed: every second covers ${String(replayedMinutesPerSecond)} minutes of trading. Source: ${providers.join(', ')}.`}
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
