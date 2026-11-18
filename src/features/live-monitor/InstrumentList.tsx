import { Link, useSearchParams } from 'react-router';
import { marketPulseApi } from '../../api/marketPulseApi.ts';
import { useAppSelector } from '../../app/hooks.ts';
import {
  LIVE_MONITOR_WATCHLIST_SEARCH,
  liveMonitorInstrumentPath,
  routePaths,
} from '../../app/routePaths.ts';
import type { AssetClass, Quote } from '../../contracts/market.ts';
import { selectWatchedSymbols } from '../watchlist/watchlistSlice.ts';
import { ChangeBadge } from './ChangeBadge.tsx';
import styles from './InstrumentList.module.scss';
import { TickingPrice } from './TickingPrice.tsx';

interface InstrumentListProps {
  selectedSymbol: string;
}

const assetClassGroups: readonly { assetClass: AssetClass; label: string }[] = [
  { assetClass: 'index', label: 'Indices' },
  { assetClass: 'stock', label: 'Stocks' },
  { assetClass: 'crypto', label: 'Crypto' },
  { assetClass: 'currency', label: 'Currencies' },
];

const EMPTY_QUOTES: readonly Quote[] = [];
const LIST_SEARCH_PARAM = 'list';
const WATCHLIST_VIEW = 'watchlist';

export function InstrumentList({ selectedSymbol }: InstrumentListProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const watchedSymbols = useAppSelector(selectWatchedSymbols);
  const { quotes } = marketPulseApi.endpoints.getMarketSnapshot.useQueryState(
    undefined,
    {
      selectFromResult: ({ data }) => ({
        quotes: data?.quotes ?? EMPTY_QUOTES,
      }),
    },
  );
  // The chosen list is part of the URL, so it survives switching instruments and reloads.
  const isWatchlistView =
    searchParams.get(LIST_SEARCH_PARAM) === WATCHLIST_VIEW;
  const visibleQuotes = isWatchlistView
    ? quotes.filter(({ symbol }) => watchedSymbols.includes(symbol))
    : quotes;

  function showWatchlist(shouldShowWatchlist: boolean) {
    setSearchParams(
      shouldShowWatchlist ? { [LIST_SEARCH_PARAM]: WATCHLIST_VIEW } : {},
      { replace: true },
    );
  }

  return (
    <nav aria-labelledby="markets-heading" className={styles.panel}>
      <div className={styles.header}>
        <h2 id="markets-heading" className={styles.heading}>
          Markets
        </h2>
        <div className={styles.viewToggle} role="group" aria-label="Show">
          <button
            type="button"
            aria-pressed={!isWatchlistView}
            onClick={() => {
              showWatchlist(false);
            }}
          >
            All
          </button>
          <button
            type="button"
            aria-pressed={isWatchlistView}
            onClick={() => {
              showWatchlist(true);
            }}
          >
            {`Watchlist (${String(watchedSymbols.length)})`}
          </button>
        </div>
      </div>
      {isWatchlistView && visibleQuotes.length === 0 && (
        <p className={styles.emptyWatchlist}>
          Your watchlist is empty. Use the star next to an instrument name, or{' '}
          <Link to={routePaths.opportunities}>browse Opportunity Radar</Link>.
        </p>
      )}
      {assetClassGroups.map(({ assetClass, label }) => {
        const groupQuotes = visibleQuotes.filter(
          (quote) => quote.assetClass === assetClass,
        );
        if (groupQuotes.length === 0) {
          return null;
        }
        const groupHeadingId = `instrument-group-${assetClass}`;
        return (
          <section key={assetClass} aria-labelledby={groupHeadingId}>
            <h3 id={groupHeadingId} className={styles.groupHeading}>
              {label}
            </h3>
            <ul className={styles.list}>
              {groupQuotes.map((quote) => (
                <li key={quote.symbol}>
                  <Link
                    to={{
                      pathname: liveMonitorInstrumentPath(quote.symbol),
                      search: isWatchlistView
                        ? LIVE_MONITOR_WATCHLIST_SEARCH
                        : '',
                    }}
                    className={styles.row}
                    aria-current={
                      quote.symbol === selectedSymbol ? 'page' : undefined
                    }
                  >
                    <span className={styles.identity}>
                      <span className={styles.symbol}>{quote.symbol}</span>{' '}
                      <span className={styles.name}>{quote.name}</span>
                    </span>
                    <span className={styles.quote}>
                      <TickingPrice quote={quote} className={styles.price} />
                      <ChangeBadge changePercent={quote.changePercent} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </nav>
  );
}
