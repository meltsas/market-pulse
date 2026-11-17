import { useState, useSyncExternalStore } from 'react';
import styles from './ThemeToggle.module.scss';

type Theme = 'light' | 'dark';

// Also read by the inline script in index.html, which applies the saved theme before first paint.
const THEME_STORAGE_KEY = 'market-pulse-theme';
const DARK_COLOR_SCHEME_QUERY = '(prefers-color-scheme: dark)';

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

function readSavedTheme(): Theme | null {
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(savedTheme) ? savedTheme : null;
  } catch {
    return null;
  }
}

function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage is unavailable (e.g. blocked site data), so the choice lasts only for this page load.
  }
}

function subscribeToSystemTheme(onSystemThemeChange: () => void) {
  const darkColorSchemeQuery = window.matchMedia(DARK_COLOR_SCHEME_QUERY);
  darkColorSchemeQuery.addEventListener('change', onSystemThemeChange);
  return () => {
    darkColorSchemeQuery.removeEventListener('change', onSystemThemeChange);
  };
}

function getSystemTheme(): Theme {
  return window.matchMedia(DARK_COLOR_SCHEME_QUERY).matches ? 'dark' : 'light';
}

export function ThemeToggle() {
  const systemTheme = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemTheme,
  );
  const [savedTheme, setSavedTheme] = useState(readSavedTheme);
  const isDarkTheme = (savedTheme ?? systemTheme) === 'dark';

  function toggleTheme() {
    const nextTheme: Theme = isDarkTheme ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextTheme;
    saveTheme(nextTheme);
    setSavedTheme(nextTheme);
  }

  return (
    <button
      type="button"
      className={styles.toggle}
      aria-pressed={isDarkTheme}
      onClick={toggleTheme}
    >
      Dark theme
    </button>
  );
}
