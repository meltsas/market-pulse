import { Star } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/hooks.ts';
import styles from './WatchToggleButton.module.scss';
import { selectIsWatched, watchlistToggled } from './watchlistSlice.ts';

interface WatchToggleButtonProps {
  symbol: string;
  showLabel?: boolean;
}

export function WatchToggleButton({
  symbol,
  showLabel = false,
}: WatchToggleButtonProps) {
  const dispatch = useAppDispatch();
  const isWatched = useAppSelector((state) => selectIsWatched(state, symbol));
  const actionLabel = isWatched
    ? `Remove ${symbol} from watchlist`
    : `Add ${symbol} to watchlist`;

  return (
    <button
      type="button"
      className={styles.button}
      data-watched={isWatched}
      data-show-label={showLabel}
      aria-pressed={isWatched}
      aria-label={showLabel ? undefined : actionLabel}
      title={actionLabel}
      onClick={() => {
        dispatch(watchlistToggled(symbol));
      }}
    >
      <Star size={16} aria-hidden="true" />
      {showLabel && (isWatched ? 'Watching' : 'Add to watchlist')}
    </button>
  );
}
