import { CalendarClock, RefreshCw, SearchX, WifiOff } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { marketPulseApi } from '../../api/marketPulseApi.ts';
import buttonStyles from '../../components/Button.module.scss';
import { EmptyState } from '../../components/EmptyState.tsx';
import { PageHeader } from '../../components/PageHeader.tsx';
import type { OpportunityList } from '../../contracts/opportunities.ts';
import {
  formatCalendarDate,
  formatMarketDateTime,
} from '../../formatting/marketFormat.ts';
import { ReplayPanel } from '../replay/ReplayPanel.tsx';
import styles from './OpportunitiesPage.module.scss';
import { OpportunityFilters } from './OpportunityFilters.tsx';
import { OPPORTUNITY_POLLING } from './opportunityPolling.ts';
import {
  filterOpportunities,
  readOpportunityQuery,
  sortOpportunities,
  writeOpportunityQuery,
  type OpportunityFilters as Filters,
  type OpportunitySort,
} from './opportunityQuery.ts';
import { OpportunityTable } from './OpportunityTable.tsx';
import { ScreeningDisclaimer } from './ScreeningDisclaimer.tsx';

export function OpportunitiesPage() {
  const { data, isError, refetch } = marketPulseApi.useGetOpportunitiesQuery(
    undefined,
    OPPORTUNITY_POLLING,
  );

  return (
    <>
      <PageHeader
        title="Opportunity Radar"
        description="Instruments worth a closer look, with the signals behind each result and their limitations."
      />
      <ReplayPanel>
        {data && <ScreeningNote opportunityList={data} />}
      </ReplayPanel>
      <OpportunityRadarContent
        opportunityList={data}
        isError={isError}
        onRetry={() => {
          void refetch();
        }}
      />
    </>
  );
}

function ScreeningNote({
  opportunityList,
}: {
  opportunityList: OpportunityList;
}) {
  const latestCloseDate = opportunityList.opportunities
    .map(({ freshness }) => freshness.lastCloseDate)
    .toSorted()
    .at(-1);
  return (
    <p className={styles.screeningNote}>
      <CalendarClock size={16} aria-hidden="true" />
      {`Screening ran ${formatMarketDateTime(opportunityList.asOf)} on completed daily closes${latestCloseDate ? ` up to ${formatCalendarDate(latestCloseDate)}` : ''}. It runs again when the replay passes midnight UTC.`}
    </p>
  );
}

interface OpportunityRadarContentProps {
  opportunityList: OpportunityList | undefined;
  isError: boolean;
  onRetry: () => void;
}

function OpportunityRadarContent({
  opportunityList: data,
  isError,
  onRetry,
}: OpportunityRadarContentProps) {
  if (data) {
    return <OpportunityResults opportunityList={data} />;
  }
  if (isError) {
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
          onClick={onRetry}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Try again
        </button>
      </EmptyState>
    );
  }
  return (
    <div className={styles.skeleton} aria-busy="true">
      <span className={styles.visuallyHidden}>Loading screening results…</span>
    </div>
  );
}

interface OpportunityResultsProps {
  opportunityList: OpportunityList;
}

function OpportunityResults({ opportunityList }: OpportunityResultsProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { filters, sort } = readOpportunityQuery(searchParams);
  const { opportunities } = opportunityList;
  const visibleOpportunities = sortOpportunities(
    filterOpportunities(opportunities, filters),
    sort,
  );
  function updateQuery(nextFilters: Filters, nextSort: OpportunitySort) {
    setSearchParams(writeOpportunityQuery(nextFilters, nextSort), {
      replace: true,
    });
  }

  return (
    <>
      <div className={styles.content}>
        <OpportunityFilters
          filters={filters}
          sort={sort}
          onFiltersChange={(nextFilters) => {
            updateQuery(nextFilters, sort);
          }}
          onSortChange={(nextSort) => {
            updateQuery(filters, nextSort);
          }}
        />
        <p className={styles.resultCount} aria-live="polite">
          {`Showing ${String(visibleOpportunities.length)} of ${String(opportunities.length)} instruments`}
        </p>
        {visibleOpportunities.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No instruments match these filters"
            description="Try another asset class or bias, or clear the search."
          >
            <button
              type="button"
              className={buttonStyles.secondary}
              onClick={() => {
                setSearchParams({}, { replace: true });
              }}
            >
              Clear filters
            </button>
          </EmptyState>
        ) : (
          <OpportunityTable
            caption="Screening results"
            opportunities={visibleOpportunities}
            sort={sort}
            onSortChange={(nextSort) => {
              updateQuery(filters, nextSort);
            }}
          />
        )}
        <ScreeningDisclaimer />
      </div>
    </>
  );
}
