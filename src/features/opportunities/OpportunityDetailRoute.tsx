import { lazy, Suspense } from 'react';

// Loaded on demand: the chart library is only needed on this page and in Live Monitor.
const OpportunityDetailPage = lazy(async () => {
  const { OpportunityDetailPage } = await import('./OpportunityDetailPage.tsx');
  return { default: OpportunityDetailPage };
});

export function OpportunityDetailRoute() {
  return (
    <Suspense>
      <OpportunityDetailPage />
    </Suspense>
  );
}
