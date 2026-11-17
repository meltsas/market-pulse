import { Navigate, type RouteObject } from 'react-router';
import { LiveMonitorPage } from '../features/live-monitor/LiveMonitorPage.tsx';
import { OpportunitiesPage } from '../features/opportunities/OpportunitiesPage.tsx';
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
      { path: routePaths.liveMonitor, element: <LiveMonitorPage /> },
      { path: routePaths.watchlist, element: <WatchlistPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
