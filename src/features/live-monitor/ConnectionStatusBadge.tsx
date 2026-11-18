import styles from './ConnectionStatusBadge.module.scss';
import type { ConnectionStatus } from './marketStreamConnection.ts';

interface ConnectionStatusBadgeProps {
  connectionStatus: ConnectionStatus;
}

type StatusTone = 'neutral' | 'positive' | 'warning' | 'negative';

const statusPresentation: Record<
  ConnectionStatus,
  { label: string; tone: StatusTone }
> = {
  connecting: { label: 'Connecting', tone: 'neutral' },
  connected: { label: 'Live', tone: 'positive' },
  reconnecting: { label: 'Reconnecting', tone: 'warning' },
  disconnected: { label: 'Offline', tone: 'negative' },
};

export function ConnectionStatusBadge({
  connectionStatus,
}: ConnectionStatusBadgeProps) {
  const { label, tone } = statusPresentation[connectionStatus];

  return (
    <p className={styles.badge} data-tone={tone} role="status">
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.prefix}>Live updates: </span>
      {label}
    </p>
  );
}
