import type { ReactNode } from 'react';
import { marketPulseApi } from '../../api/marketPulseApi.ts';
import { useAppSelector } from '../../app/hooks.ts';
import { DemoDataNotice } from '../../components/DemoDataNotice.tsx';
import { selectConnectionStatus } from '../market-stream/marketStreamSlice.ts';
import { ConnectionStatusBadge } from './ConnectionStatusBadge.tsx';
import styles from './ReplayPanel.module.scss';
import { ReplayControls } from './ReplayControls.tsx';

interface ReplayPanelProps {
  children?: ReactNode;
}

// Polling only matters while the live stream is down; otherwise stream events keep the status current.
const REPLAY_STATUS_POLLING = {
  pollingInterval: 30_000,
  skipPollingIfUnfocused: true,
} as const;

export function ReplayPanel({ children }: ReplayPanelProps) {
  const { data: replayStatus } = marketPulseApi.useGetReplayStatusQuery(
    undefined,
    REPLAY_STATUS_POLLING,
  );
  const connectionStatus = useAppSelector(selectConnectionStatus);

  if (!replayStatus) {
    return <div className={styles.placeholder} aria-hidden="true" />;
  }

  return (
    <DemoDataNotice
      dataSource={replayStatus.dataSource}
      marketTime={replayStatus.asOf}
      statusIndicator={
        <ConnectionStatusBadge connectionStatus={connectionStatus} />
      }
    >
      <ReplayControls
        dataSource={replayStatus.dataSource}
        marketTime={replayStatus.asOf}
        isDisabled={connectionStatus !== 'connected'}
      />
      {children}
    </DemoDataNotice>
  );
}
