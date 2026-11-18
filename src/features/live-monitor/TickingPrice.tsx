import type { Quote } from '../../contracts/market.ts';
import { formatPrice } from '../../formatting/marketFormat.ts';
import styles from './TickingPrice.module.scss';
import { usePriceTick } from './usePriceTick.ts';

interface TickingPriceProps {
  quote: Quote;
  className?: string;
}

export function TickingPrice({ quote, className }: TickingPriceProps) {
  const { direction, timestamp } = usePriceTick(quote.price, quote.timestamp);
  return (
    <span
      // A new key restarts the highlight animation for every new quote.
      key={timestamp}
      className={[styles.price, className].join(' ')}
      data-tick={direction}
    >
      {formatPrice(quote.price, quote)}
    </span>
  );
}
