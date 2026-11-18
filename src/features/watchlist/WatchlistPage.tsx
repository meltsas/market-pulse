import { Star } from 'lucide-react';
import { EmptyState } from '../../components/EmptyState.tsx';
import { PageHeader } from '../../components/PageHeader.tsx';

export function WatchlistPage() {
  return (
    <>
      <PageHeader
        title="Watchlist"
        description="Instruments you have saved for research and live monitoring."
      />
      <EmptyState
        icon={Star}
        title="Watchlists are coming soon"
        description="You will be able to save instruments from Opportunity Radar and follow them in Live Monitor."
      />
    </>
  );
}
