import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ConnectionStatus } from './marketStreamConnection.ts';

export interface MarketStreamState {
  connectionStatus: ConnectionStatus;
}

const initialState: MarketStreamState = { connectionStatus: 'connecting' };

export const marketStreamSlice = createSlice({
  name: 'marketStream',
  initialState,
  reducers: {
    connectionStatusChanged(
      state,
      { payload: connectionStatus }: PayloadAction<ConnectionStatus>,
    ) {
      state.connectionStatus = connectionStatus;
    },
  },
  selectors: {
    selectConnectionStatus: (state) => state.connectionStatus,
  },
});

export const { connectionStatusChanged } = marketStreamSlice.actions;
export const { selectConnectionStatus } = marketStreamSlice.selectors;
