import {
  ColorType,
  createChart,
  CrosshairMode,
  LineSeries,
  LineStyle,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type LineData,
  type WhitespaceData,
} from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import { applyChartTheme, readThemeColor } from '../../charts/chartTheme.ts';
import type { Instrument } from '../../contracts/market.ts';
import type { DailyHistory } from '../../contracts/opportunities.ts';
import { formatPrice } from '../../formatting/marketFormat.ts';
import { useResolvedTheme } from '../../theme/themePreference.ts';
import styles from './DailyPriceChart.module.scss';

type DailyBar = DailyHistory['bars'][number];

interface DailyPriceChartProps {
  instrument: Pick<Instrument, 'assetClass' | 'currency'>;
  bars: readonly DailyBar[];
  fiftyTwoWeekHigh: number;
}

interface ChartParts {
  chart: IChartApi;
  closeSeries: ISeriesApi<'Line'>;
  shortAverageSeries: ISeriesApi<'Line'>;
  longAverageSeries: ISeriesApi<'Line'>;
}

function toLineData(
  date: string,
  value: number | null,
): LineData | WhitespaceData {
  return value === null ? { time: date } : { time: date, value };
}

export function DailyPriceChart({
  instrument,
  bars,
  fiftyTwoWeekHigh,
}: DailyPriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartPartsRef = useRef<ChartParts | null>(null);
  const theme = useResolvedTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        fontFamily: getComputedStyle(container).fontFamily,
        fontSize: 12,
        attributionLogo: true,
      },
      localization: { dateFormat: 'dd MMM yyyy' },
      grid: { vertLines: { visible: false } },
      crosshair: { mode: CrosshairMode.Magnet },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.08 },
      },
      timeScale: {
        borderVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
        lockVisibleTimeRangeOnResize: true,
      },
    });
    const averageOptions = {
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    } as const;
    chartPartsRef.current = {
      chart,
      closeSeries: chart.addSeries(LineSeries, { lineWidth: 2 }),
      shortAverageSeries: chart.addSeries(LineSeries, averageOptions),
      longAverageSeries: chart.addSeries(LineSeries, {
        ...averageOptions,
        lineStyle: LineStyle.Dashed,
      }),
    };
    return () => {
      chartPartsRef.current = null;
      chart.remove();
    };
  }, []);

  useEffect(() => {
    chartPartsRef.current?.chart.applyOptions({
      localization: {
        priceFormatter: (price: number) => formatPrice(price, instrument),
      },
    });
  }, [instrument]);

  useEffect(() => {
    const chartParts = chartPartsRef.current;
    if (!chartParts) {
      return;
    }
    applyChartTheme(chartParts.chart);
    chartParts.closeSeries.applyOptions({
      color: readThemeColor('--color-accent'),
    });
    chartParts.shortAverageSeries.applyOptions({
      color: readThemeColor('--color-warning'),
    });
    chartParts.longAverageSeries.applyOptions({
      color: readThemeColor('--color-text-muted'),
    });
  }, [theme]);

  useEffect(() => {
    const chartParts = chartPartsRef.current;
    if (!chartParts) {
      return;
    }
    chartParts.closeSeries.setData(
      bars.map(({ date, close }) => ({ time: date, value: close })),
    );
    chartParts.shortAverageSeries.setData(
      bars.map(({ date, movingAverage50 }) =>
        toLineData(date, movingAverage50),
      ),
    );
    chartParts.longAverageSeries.setData(
      bars.map(({ date, movingAverage200 }) =>
        toLineData(date, movingAverage200),
      ),
    );
    chartParts.chart.timeScale().fitContent();
  }, [bars]);

  useEffect(() => {
    const chartParts = chartPartsRef.current;
    if (!chartParts) {
      return;
    }
    const highLine: IPriceLine = chartParts.closeSeries.createPriceLine({
      price: fiftyTwoWeekHigh,
      color: readThemeColor('--color-text-subtle'),
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      axisLabelVisible: true,
      title: '52w high',
    });
    return () => {
      if (chartPartsRef.current === chartParts) {
        chartParts.closeSeries.removePriceLine(highLine);
      }
    };
  }, [fiftyTwoWeekHigh, theme]);

  return (
    <div className={styles.chartArea}>
      <div ref={containerRef} className={styles.chart} />
      <ul className={styles.legend} aria-label="Chart lines">
        <li data-series="close">Daily close</li>
        <li data-series="short-average">50-day average</li>
        <li data-series="long-average">200-day average</li>
        <li data-series="high">52-week high</li>
      </ul>
    </div>
  );
}
