import { Check, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useId } from 'react';
import {
  setThemePreference,
  useSystemTheme,
  useThemePreference,
  type ThemePreference,
} from '../../theme/themePreference.ts';
import styles from './ThemePicker.module.scss';

interface ThemeOption {
  preference: ThemePreference;
  label: string;
  icon: LucideIcon;
}

const themeOptions: readonly ThemeOption[] = [
  { preference: 'system', label: 'System', icon: Monitor },
  { preference: 'light', label: 'Light', icon: Sun },
  { preference: 'dark', label: 'Dark', icon: Moon },
];

export function ThemePicker() {
  const selectedPreference = useThemePreference();
  const systemTheme = useSystemTheme();
  const idPrefix = useId();

  const hints: Record<ThemePreference, string> = {
    system: `Matches your device, currently ${systemTheme}`,
    light: 'Bright surfaces for well-lit rooms',
    dark: 'Dim surfaces that are easier on the eyes',
  };

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>Theme</legend>
      <div className={styles.options}>
        {themeOptions.map(({ preference, label, icon: Icon }) => {
          const labelId = `${idPrefix}-${preference}-label`;
          const hintId = `${idPrefix}-${preference}-hint`;
          return (
            <label key={preference} className={styles.option}>
              <input
                type="radio"
                name={`${idPrefix}-theme`}
                value={preference}
                checked={selectedPreference === preference}
                onChange={() => {
                  setThemePreference(preference);
                }}
                aria-labelledby={labelId}
                aria-describedby={hintId}
                className={styles.radio}
              />
              <span
                className={styles.preview}
                data-preview={preference}
                aria-hidden="true"
              >
                <span className={styles.previewSidebar} />
                <span className={styles.previewContent}>
                  <span className={styles.previewLine} />
                  <span className={styles.previewCard} />
                </span>
              </span>
              <span className={styles.optionText}>
                <span id={labelId} className={styles.optionLabel}>
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </span>
                <span id={hintId} className={styles.optionHint}>
                  {hints[preference]}
                </span>
              </span>
              <Check className={styles.check} size={16} aria-hidden="true" />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
