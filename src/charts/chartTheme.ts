import type { IChartApi } from 'lightweight-charts';

export function readThemeColor(tokenName: string) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(tokenName)
    .trim();
}

// Charts draw on canvas, so they read the current design tokens instead of inheriting CSS.
export function applyChartTheme(chart: IChartApi) {
  const crosshairLabelColor = readThemeColor('--color-text-muted');
  chart.applyOptions({
    layout: {
      textColor: readThemeColor('--color-text-subtle'),
      panes: { separatorColor: readThemeColor('--color-border') },
    },
    grid: { horzLines: { color: readThemeColor('--color-chart-grid') } },
    crosshair: {
      vertLine: { labelBackgroundColor: crosshairLabelColor },
      horzLine: { labelBackgroundColor: crosshairLabelColor },
    },
  });
}
