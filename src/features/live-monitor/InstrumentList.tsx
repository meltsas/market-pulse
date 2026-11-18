import { Link } from 'react-router';
import { marketPulseApi } from '../../api/marketPulseApi.ts';
import { liveMonitorInstrumentPath } from '../../app/routePaths.ts';
import type { AssetClass, Quote } from '../../contracts/market.ts';
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

export function InstrumentList({ selectedSymbol }: InstrumentListProps) {
  const { quotes } = marketPulseApi.endpoints.getMarketSnapshot.useQueryState(
    undefined,
    {
      selectFromResult: ({ data }) => ({
        quotes: data?.quotes ?? EMPTY_QUOTES,
      }),
    },
  );

  return (
    <nav aria-labelledby="markets-heading" className={styles.panel}>
      <h2 id="markets-heading" className={styles.heading}>
        Markets
      </h2>
      {assetClassGroups.map(({ assetClass, label }) => {
        const groupQuotes = quotes.filter(
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
                    to={liveMonitorInstrumentPath(quote.symbol)}
                    className={styles.row}
                    aria-current={
                      quote.symbol === selectedSymbol ? 'page' : undefined
                    }
                  >
                    <span className={styles.identity}>
                      <span className={styles.symbol}>{quote.symbol}</span>
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
