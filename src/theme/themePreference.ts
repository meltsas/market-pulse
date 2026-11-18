import { useSyncExternalStore } from 'react';

export type ResolvedTheme = 'light' | 'dark';
export type ThemePreference = 'system' | ResolvedTheme;

// Also read by the inline script in index.html, which applies the saved theme before first paint.
const THEME_STORAGE_KEY = 'market-pulse-theme';
const DARK_COLOR_SCHEME_QUERY = '(prefers-color-scheme: dark)';

const listeners = new Set<() => void>();
let currentPreference = readSavedThemePreference();

function isResolvedTheme(value: unknown): value is ResolvedTheme {
  return value === 'light' || value === 'dark';
}

function readSavedThemePreference(): ThemePreference {
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return isResolvedTheme(savedTheme) ? savedTheme : 'system';
  } catch {
    return 'system';
  }
}

function saveThemePreference(preference: ThemePreference) {
  try {
    if (preference === 'system') {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, preference);
    }
  } catch {
    // Storage is unavailable (e.g. blocked site data), so the choice lasts only for this page load.
  }
}

function applyThemePreference(preference: ThemePreference) {
  if (preference === 'system') {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = preference;
  }
}

export function setThemePreference(preference: ThemePreference) {
  currentPreference = preference;
  applyThemePreference(preference);
  saveThemePreference(preference);
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(onThemeChange: () => void) {
  const darkColorSchemeQuery = window.matchMedia(DARK_COLOR_SCHEME_QUERY);

  function handleStorageChange(event: StorageEvent) {
    if (event.key !== THEME_STORAGE_KEY) {
      return;
    }
    currentPreference = readSavedThemePreference();
    applyThemePreference(currentPreference);
    onThemeChange();
  }

  listeners.add(onThemeChange);
  darkColorSchemeQuery.addEventListener('change', onThemeChange);
  window.addEventListener('storage', handleStorageChange);
  return () => {
    listeners.delete(onThemeChange);
    darkColorSchemeQuery.removeEventListener('change', onThemeChange);
    window.removeEventListener('storage', handleStorageChange);
  };
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_COLOR_SCHEME_QUERY).matches ? 'dark' : 'light';
}

export function useThemePreference() {
  return useSyncExternalStore(subscribe, () => currentPreference);
}

export function useSystemTheme() {
  return useSyncExternalStore(subscribe, getSystemTheme);
}

export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(subscribe, () =>
    currentPreference === 'system' ? getSystemTheme() : currentPreference,
  );
}
