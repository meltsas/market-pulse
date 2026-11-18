import { Activity, Radar, RefreshCw, Star, WifiOff } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { marketPulseApi } from '../../api/marketPulseApi.ts';
import { useAppSelector } from '../../app/hooks.ts';
import { liveMonitorWatchlistPath, routePaths } from '../../app/routePaths.ts';
import buttonStyles from '../../components/Button.module.scss';
import { EmptyState } from '../../components/EmptyState.tsx';
import { PageHeader } from '../../components/PageHeader.tsx';
import { OPPORTUNITY_POLLING } from '../opportunities/opportunityPolling.ts';
import {
  DEFAULT_SORT,
  sortOpportunities,
  type OpportunitySort,
} from '../opportunities/opportunityQuery.ts';
import { OpportunityTable } from '../opportunities/OpportunityTable.tsx';
import { ReplayPanel } from '../replay/ReplayPanel.tsx';
import { ScreeningDisclaimer } from '../opportunities/ScreeningDisclaimer.tsx';
import styles from './WatchlistPage.module.scss';
import { selectWatchedSymbols } from './watchlistSlice.ts';

export function WatchlistPage() {
  const watchedSymbols = useAppSelector(selectWatchedSymbols);
  const [firstWatchedSymbol] = watchedSymbols;

  return (
    <>
      <PageHeader
        title="Watchlist"
        description="Instruments you have saved for research and live monitoring, with their latest screening."
        actions={
          firstWatchedSymbol && (
            <Link
              to={liveMonitorWatchlistPath(firstWatchedSymbol)}
              className={buttonStyles.primary}
            >
              <Activity size={16} aria-hidden="true" />
              Follow in Live Monitor
            </Link>
          )
        }
      />
      <ReplayPanel />
      {watchedSymbols.length === 0 ? (
        <EmptyState
          icon={Star}
          title="Your watchlist is empty"
          description="Use the star button in Opportunity Radar or Live Monitor to save instruments you want to follow."
        >
          <Link to={routePaths.opportunities} className={buttonStyles.primary}>
            <Radar size={16} aria-hidden="true" />
            Browse Opportunity Radar
          </Link>
        </EmptyState>
      ) : (
        <WatchedOpportunities watchedSymbols={watchedSymbols} />
      )}
    </>
  );
}

function WatchedOpportunities({
  watchedSymbols,
}: {
  watchedSymbols: readonly string[];
}) {
  const [sort, setSort] = useState<OpportunitySort>(DEFAULT_SORT);
  const { data, isError, refetch } = marketPulseApi.useGetOpportunitiesQuery(
    undefined,
    OPPORTUNITY_POLLING,
  );

  if (!data && isError) {
    return (
      <EmptyState
        icon={WifiOff}
        tone="warning"
        title="Screening results are unavailable"
        description="The demo API did not respond. Make sure the mock API is running (npm run dev), then try again."
      >
        <button
          type="button"
          className={buttonStyles.primary}
          onClick={() => {
            void refetch();
          }}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Try again
        </button>
      </EmptyState>
    );
  }
  if (!data) {
    return <div className={styles.skeleton} aria-busy="true" />;
  }

  const watchedOpportunities = data.opportunities.filter(({ symbol }) =>
    watchedSymbols.includes(symbol),
  );
  return (
    <div className={styles.content}>
      <OpportunityTable
        caption="Watched instruments"
        opportunities={sortOpportunities(watchedOpportunities, sort)}
        sort={sort}
        onSortChange={setSort}
      />
      <ScreeningDisclaimer />
    </div>
  );
}
