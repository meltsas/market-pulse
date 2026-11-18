import { Activity, Radar, Settings, Star } from 'lucide-react';
import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router';
import styles from './AppLayout.module.scss';
import { routePaths } from './routePaths.ts';

const MAIN_CONTENT_ID = 'main-content';
const ICON_SIZE = 18;

const navigationItems = [
  { path: routePaths.opportunities, label: 'Opportunities', icon: Radar },
  { path: routePaths.liveMonitor, label: 'Live Monitor', icon: Activity },
  { path: routePaths.watchlist, label: 'Watchlist', icon: Star },
] as const;

export function AppLayout() {
  return (
    <div className={styles.layout}>
      <a className={styles.skipLink} href={`#${MAIN_CONTENT_ID}`}>
        Skip to main content
      </a>
      <header className={styles.header}>
        <Link to={routePaths.home} className={styles.brand}>
          <img
            src="/favicon.svg"
            alt=""
            width={28}
            height={28}
            className={styles.brandMark}
          />
          Market Pulse
        </Link>
        <nav aria-label="Main" className={styles.nav}>
          <ul className={styles.navList}>
            {navigationItems.map(({ path, label, icon: Icon }) => (
              <li key={path}>
                <NavLink to={path} className={styles.navLink}>
                  <Icon
                    size={ICON_SIZE}
                    aria-hidden="true"
                    className={styles.navIcon}
                  />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <NavLink to={routePaths.settings} className={styles.settingsLink}>
          <Settings size={ICON_SIZE} aria-hidden="true" />
          <span className={styles.settingsLabel}>Settings</span>
        </NavLink>
      </header>
      <main id={MAIN_CONTENT_ID} className={styles.main}>
        <Outlet />
      </main>
      <ScrollRestoration />
    </div>
  );
}
