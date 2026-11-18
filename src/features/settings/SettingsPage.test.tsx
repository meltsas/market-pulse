import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { setThemePreference } from '../../theme/themePreference.ts';
import { SettingsPage } from './SettingsPage.tsx';

describe('SettingsPage', () => {
  afterEach(() => {
    setThemePreference('system');
  });

  it('follows the system theme until a theme is chosen', () => {
    render(<SettingsPage />);

    expect(screen.getByRole('radio', { name: 'System' })).toBeChecked();
    expect(
      screen.getByRole('radio', { name: 'System' }),
    ).toHaveAccessibleDescription('Matches your device, currently light');
    expect(document.documentElement).not.toHaveAttribute('data-theme');
  });

  it('applies and remembers the chosen theme', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole('radio', { name: 'Dark' }));

    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem('market-pulse-theme')).toBe('dark');

    await user.click(screen.getByRole('radio', { name: 'System' }));

    expect(document.documentElement).not.toHaveAttribute('data-theme');
    expect(localStorage.getItem('market-pulse-theme')).toBeNull();
  });

  it('can be changed with the keyboard', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.tab();
    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });
});
