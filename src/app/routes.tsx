import { Navigate, type RouteObject } from 'react-router';
import { LiveMonitorRoute } from '../features/live-monitor/LiveMonitorRoute.tsx';
import { OpportunitiesPage } from '../features/opportunities/OpportunitiesPage.tsx';
import { OpportunityDetailRoute } from '../features/opportunities/OpportunityDetailRoute.tsx';
import { SettingsPage } from '../features/settings/SettingsPage.tsx';
import { WatchlistPage } from '../features/watchlist/WatchlistPage.tsx';
import { AppLayout } from './AppLayout.tsx';
import { NotFoundPage } from './NotFoundPage.tsx';
import { routePaths } from './routePaths.ts';

export const routes: RouteObject[] = [
  {
    path: routePaths.home,
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to={routePaths.opportunities} replace />,
      },
      { path: routePaths.opportunities, element: <OpportunitiesPage /> },
      {
        path: `${routePaths.opportunities}/:symbol`,
        element: <OpportunityDetailRoute />,
      },
      {
        path: `${routePaths.liveMonitor}/:symbol?`,
        element: <LiveMonitorRoute />,
      },
      { path: routePaths.watchlist, element: <WatchlistPage /> },
      { path: routePaths.settings, element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
