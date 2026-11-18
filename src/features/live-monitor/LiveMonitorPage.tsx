import { RefreshCw, Unplug, WifiOff } from 'lucide-react';
import { useParams } from 'react-router';
import { marketPulseApi } from '../../api/marketPulseApi.ts';
import { useAppDispatch, useAppSelector } from '../../app/hooks.ts';
import buttonStyles from '../../components/Button.module.scss';
import { EmptyState } from '../../components/EmptyState.tsx';
import { PageHeader } from '../../components/PageHeader.tsx';
import { AnomalyFeed } from './AnomalyFeed.tsx';
import { InstrumentDetail } from './InstrumentDetail.tsx';
import { InstrumentList } from './InstrumentList.tsx';
import { refetchCachedMarketData } from '../market-stream/liveMarketCache.ts';
import type { ConnectionStatus } from '../market-stream/marketStreamConnection.ts';
import { selectConnectionStatus } from '../market-stream/marketStreamSlice.ts';
import { ReplayPanel } from '../replay/ReplayPanel.tsx';
import styles from './LiveMonitorPage.module.scss';
import { DEFAULT_SYMBOL } from './liveMonitorDefaults.ts';

const { getMarketSnapshot, getAnomalies, getPriceHistory } =
  marketPulseApi.endpoints;

export function LiveMonitorPage() {
  const { symbol } = useParams();
  const selectedSymbol = symbol ?? DEFAULT_SYMBOL;
  const connectionStatus = useAppSelector(selectConnectionStatus);
  // On first load, waiting for the stream means no event can slip between a REST response and the subscription.
  const skip = connectionStatus === 'connecting';
  getMarketSnapshot.useQuerySubscription(undefined, { skip });
  getAnomalies.useQuerySubscription(undefined, { skip });
  getPriceHistory.useQuerySubscription(selectedSymbol, { skip });

  return (
    <>
      <PageHeader
        title="Live Market Monitor"
        description="Follow selected instruments and spot unusual price or volume activity as it happens."
      />
      <ReplayPanel />
      <LiveMonitorContent
        selectedSymbol={selectedSymbol}
        hasSelectedSymbol={symbol !== undefined}
        connectionStatus={connectionStatus}
      />
    </>
  );
}

interface LiveMonitorContentProps {
  selectedSymbol: string;
  hasSelectedSymbol: boolean;
  connectionStatus: ConnectionStatus;
}

function LiveMonitorContent({
  selectedSymbol,
  hasSelectedSymbol,
  connectionStatus,
}: LiveMonitorContentProps) {
  const dispatch = useAppDispatch();
  const { hasSnapshot, isSnapshotUnavailable } =
    getMarketSnapshot.useQueryState(undefined, {
      selectFromResult: ({ data, isError }) => ({
        hasSnapshot: data !== undefined,
        isSnapshotUnavailable: isError && data === undefined,
      }),
    });

  if (isSnapshotUnavailable) {
    return (
      <EmptyState
        icon={WifiOff}
        tone="warning"
        title="Market data is unavailable"
        description="The demo API did not respond. Make sure the mock API is running (npm run dev), then try again."
      >
        <button
          type="button"
          className={buttonStyles.primary}
          onClick={() => {
            void dispatch(refetchCachedMarketData());
          }}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Try again
        </button>
      </EmptyState>
    );
  }

  if (!hasSnapshot) {
    return <LiveMonitorSkeleton />;
  }

  const isUpdatePaused =
    connectionStatus === 'reconnecting' || connectionStatus === 'disconnected';

  return (
    <>
      {isUpdatePaused && (
        <div className={styles.streamAlert} role="alert">
          <Unplug size={18} aria-hidden="true" />
          <p>
            <strong>Live updates are paused.</strong> Showing the last data
            received. Market Pulse reconnects automatically and catches up once
            the stream is back.
          </p>
        </div>
      )}
      <div
        className={styles.workspace}
        data-view={hasSelectedSymbol ? 'detail' : 'overview'}
      >
        <div className={styles.listArea}>
          <InstrumentList selectedSymbol={selectedSymbol} />
        </div>
        <div className={styles.detailArea}>
          <InstrumentDetail selectedSymbol={selectedSymbol} />
        </div>
        <div className={styles.feedArea}>
          <AnomalyFeed selectedSymbol={selectedSymbol} />
        </div>
      </div>
    </>
  );
}

function LiveMonitorSkeleton() {
  return (
    <div className={styles.workspace} data-view="overview" aria-busy="true">
      <p className={styles.loadingText}>Loading market data…</p>
      <div className={[styles.listArea, styles.skeletonPanel].join(' ')} />
      <div className={[styles.detailArea, styles.skeletonPanel].join(' ')} />
    </div>
  );
}
