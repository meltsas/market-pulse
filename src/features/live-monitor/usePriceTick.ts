import { useState } from 'react';

export type PriceTickDirection = 'up' | 'down' | 'unchanged';

interface PriceTick {
  price: number;
  timestamp: string;
  direction: PriceTickDirection;
}

function compareToPreviousPrice(price: number, previousPrice: number) {
  if (price > previousPrice) {
    return 'up';
  }
  return price < previousPrice ? 'down' : 'unchanged';
}

// Compares each new quote with the previous one this component rendered, to briefly highlight the change.
export function usePriceTick(price: number, timestamp: string) {
  const [latestTick, setLatestTick] = useState<PriceTick>({
    price,
    timestamp,
    direction: 'unchanged',
  });

  if (latestTick.timestamp !== timestamp) {
    const nextTick: PriceTick = {
      price,
      timestamp,
      direction: compareToPreviousPrice(price, latestTick.price),
    };
    setLatestTick(nextTick);
    return nextTick;
  }
  return latestTick;
}
