import { lazy, Suspense } from 'react';

// Loaded on demand: the chart library is only needed on this page.
const LiveMonitorPage = lazy(async () => {
  const { LiveMonitorPage } = await import('./LiveMonitorPage.tsx');
  return { default: LiveMonitorPage };
});

export function LiveMonitorRoute() {
  return (
    <Suspense>
      <LiveMonitorPage />
    </Suspense>
  );
}
