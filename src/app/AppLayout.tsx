import { Link, NavLink, Outlet } from 'react-router';
import { ThemeToggle } from '../components/ThemeToggle.tsx';
import styles from './AppLayout.module.scss';
import { routePaths } from './routePaths.ts';

const MAIN_CONTENT_ID = 'main-content';

const navigationItems = [
  { path: routePaths.opportunities, label: 'Opportunities' },
  { path: routePaths.liveMonitor, label: 'Live Monitor' },
  { path: routePaths.watchlist, label: 'Watchlist' },
] as const;

export function AppLayout() {
  return (
    <div className={styles.layout}>
      <a className={styles.skipLink} href={`#${MAIN_CONTENT_ID}`}>
        Skip to main content
      </a>
      <header className={styles.header}>
        <Link to={routePaths.home} className={styles.brand}>
          Market Pulse
        </Link>
        <nav aria-label="Main" className={styles.nav}>
          <ul className={styles.navList}>
            {navigationItems.map(({ path, label }) => (
              <li key={path}>
                <NavLink to={path} className={styles.navLink}>
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.headerActions}>
          <ThemeToggle />
        </div>
      </header>
      <main id={MAIN_CONTENT_ID} className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
