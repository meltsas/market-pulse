import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../api/marketPulseApi.ts';
import { useAppDispatch } from '../../app/hooks.ts';
import type { MarketStreamEvent } from '../../contracts/marketStream.ts';
import {
  applyMarketStreamEvent,
  refetchLiveMarketData,
} from './liveMarketCache.ts';
import {
  connectToMarketStream,
  type ConnectionStatus,
} from './marketStreamConnection.ts';

const MARKET_STREAM_URL = `${API_BASE_URL}/market/stream`;

export function useMarketStream(): ConnectionStatus {
  const dispatch = useAppDispatch();
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('connecting');

  useEffect(() => {
    let isDisposed = false;
    let latestResyncId = 0;
    let isResyncing = false;
    let queuedEvents: MarketStreamEvent[] = [];

    // Cached data is refetched after the stream opens. Events arriving meanwhile wait, so the refetch cannot hide them.
    async function resync() {
      latestResyncId += 1;
      const resyncId = latestResyncId;
      isResyncing = true;
      await dispatch(refetchLiveMarketData());
      if (isDisposed || resyncId !== latestResyncId) {
        return;
      }
      isResyncing = false;
      const eventsToApply = queuedEvents;
      queuedEvents = [];
      for (const event of eventsToApply) {
        dispatch(applyMarketStreamEvent(event));
      }
    }

    const disconnect = connectToMarketStream(MARKET_STREAM_URL, {
      onStatusChange: setConnectionStatus,
      onOpen: () => {
        void resync();
      },
      onEvent: (event) => {
        if (
          event.type === 'replay.restarted' ||
          event.type === 'replay.changed'
        ) {
          void resync();
        } else if (isResyncing) {
          queuedEvents.push(event);
        } else {
          dispatch(applyMarketStreamEvent(event));
        }
      },
    });

    return () => {
      isDisposed = true;
      disconnect();
    };
  }, [dispatch]);

  return connectionStatus;
}
