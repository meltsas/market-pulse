import {
  AreaSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  CrosshairMode,
  HistogramSeries,
  isUTCTimestamp,
  LastPriceAnimationMode,
  LineStyle,
  TickMarkType,
  type AreaData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
  type WhitespaceData,
} from 'lightweight-charts';
import { RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { AnomalyDetectedEvent } from '../../contracts/anomalies.ts';
import type { Instrument, PricePoint } from '../../contracts/market.ts';
import {
  formatDayMonth,
  formatMonth,
  formatPercentChange,
  formatPrice,
  formatShortDateTime,
  formatTime,
  formatYear,
} from '../../formatting/marketFormat.ts';
import { useResolvedTheme } from '../../theme/themePreference.ts';
import styles from './PriceChart.module.scss';

export type PriceTrend = 'up' | 'down';

interface PriceChartProps {
  instrument: Instrument;
  pricePoints: readonly PricePoint[];
  anomalies: readonly AnomalyDetectedEvent[];
  previousClose: number;
  trend: PriceTrend;
}

interface ChartParts {
  chart: IChartApi;
  priceSeries: ISeriesApi<'Area'>;
  volumeSeries: ISeriesApi<'Histogram'>;
  markers: ISeriesMarkersPluginApi<Time>;
  renderedPoints: readonly PricePoint[];
}

const VOLUME_SCALE_ID = 'volume';
const PRICE_MARGINS_WITH_VOLUME = { top: 0.1, bottom: 0.28 };
const PRICE_MARGINS_WITHOUT_VOLUME = { top: 0.1, bottom: 0.08 };

// UTCTimestamp is a branded number of seconds; the library expects callers to brand converted values.
function toChartTime(timestamp: string) {
  return (Date.parse(timestamp) / 1000) as UTCTimestamp;
}

function toPriceData({ time, price }: PricePoint): AreaData {
  return { time: toChartTime(time), value: price };
}

function toVolumeData({
  time,
  volume,
}: PricePoint): HistogramData | WhitespaceData {
  return volume === null
    ? { time: toChartTime(time) }
    : { time: toChartTime(time), value: volume };
}

function toChartDate(time: Time) {
  return isUTCTimestamp(time) ? new Date(time * 1000) : null;
}

function formatTickMark(time: Time, tickMarkType: TickMarkType) {
  const date = toChartDate(time);
  if (!date) {
    return null;
  }
  switch (tickMarkType) {
    case TickMarkType.Year:
      return formatYear(date);
    case TickMarkType.Month:
      return formatMonth(date);
    case TickMarkType.DayOfMonth:
      return formatDayMonth(date);
    case TickMarkType.Time:
    case TickMarkType.TimeWithSeconds:
      return formatTime(date);
  }
}

function formatCrosshairTime(time: Time) {
  const date = toChartDate(time);
  return date ? formatShortDateTime(date.toISOString()) : '';
}

function readThemeColor(tokenName: string) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(tokenName)
    .trim();
}

function toMarker({
  occurredAt,
  anomaly,
}: AnomalyDetectedEvent): SeriesMarker<Time> {
  const time = toChartTime(occurredAt);
  if (anomaly.kind === 'relative-volume') {
    return {
      time,
      position: 'aboveBar',
      shape: 'circle',
      color: readThemeColor('--color-warning'),
      text: `Vol ${anomaly.relativeVolume.toFixed(1)}×`,
    };
  }
  const isFall = anomaly.changePercent < 0;
  return {
    time,
    position: isFall ? 'aboveBar' : 'belowBar',
    shape: isFall ? 'arrowDown' : 'arrowUp',
    color: readThemeColor(isFall ? '--color-negative' : '--color-positive'),
    text: formatPercentChange(anomaly.changePercent),
  };
}

export function PriceChart({
  instrument,
  pricePoints,
  anomalies,
  previousClose,
  trend,
}: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartPartsRef = useRef<ChartParts | null>(null);
  const theme = useResolvedTheme();
  const [isViewAdjusted, setIsViewAdjusted] = useState(false);

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
      grid: { vertLines: { visible: false } },
      crosshair: { mode: CrosshairMode.Magnet },
      rightPriceScale: { borderVisible: false },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        // autoSize measures the container after the first render; keep the fitted range when it does.
        lockVisibleTimeRangeOnResize: true,
        tickMarkFormatter: formatTickMark,
      },
    });
    const priceSeries = chart.addSeries(AreaSeries, {
      lineWidth: 2,
      lastPriceAnimation: LastPriceAnimationMode.OnDataUpdate,
      crosshairMarkerRadius: 4,
    });
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: VOLUME_SCALE_ID,
      priceFormat: { type: 'volume' },
      priceLineVisible: false,
      lastValueVisible: false,
    });
    chart
      .priceScale(VOLUME_SCALE_ID)
      .applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } });

    chartPartsRef.current = {
      chart,
      priceSeries,
      volumeSeries,
      markers: createSeriesMarkers(priceSeries),
      renderedPoints: [],
    };

    // Scrolling, zooming, and dragging are the only ways a viewer moves away from the default view.
    function markViewAdjusted() {
      setIsViewAdjusted(true);
    }
    function handlePointerMove(event: PointerEvent) {
      if (event.buttons !== 0) {
        markViewAdjusted();
      }
    }
    container.addEventListener('wheel', markViewAdjusted, { passive: true });
    container.addEventListener('pointermove', handlePointerMove);

    return () => {
      container.removeEventListener('wheel', markViewAdjusted);
      container.removeEventListener('pointermove', handlePointerMove);
      chartPartsRef.current = null;
      chart.remove();
    };
  }, []);

  useEffect(() => {
    chartPartsRef.current?.chart.applyOptions({
      localization: {
        timeFormatter: formatCrosshairTime,
        priceFormatter: (price: number) => formatPrice(price, instrument),
      },
    });
  }, [instrument]);

  useEffect(() => {
    const chartParts = chartPartsRef.current;
    if (!chartParts) {
      return;
    }
    const trendColor = readThemeColor(
      trend === 'up' ? '--color-positive' : '--color-negative',
    );
    const crosshairLabelColor = readThemeColor('--color-text-muted');
    chartParts.chart.applyOptions({
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
    chartParts.priceSeries.applyOptions({
      lineColor: trendColor,
      topColor: readThemeColor(
        trend === 'up'
          ? '--color-chart-positive-fill'
          : '--color-chart-negative-fill',
      ),
      bottomColor: 'transparent',
      crosshairMarkerBackgroundColor: trendColor,
    });
    chartParts.volumeSeries.applyOptions({
      color: readThemeColor('--color-chart-volume'),
    });
  }, [theme, trend]);

  useEffect(() => {
    const chartParts = chartPartsRef.current;
    if (!chartParts) {
      return;
    }
    const { renderedPoints, priceSeries, volumeSeries } = chartParts;
    const lastRenderedPoint = renderedPoints.at(-1);
    const isAppend =
      lastRenderedPoint !== undefined &&
      pricePoints.length > renderedPoints.length &&
      pricePoints[renderedPoints.length - 1]?.time === lastRenderedPoint.time;

    if (isAppend) {
      for (const pricePoint of pricePoints.slice(renderedPoints.length)) {
        priceSeries.update(toPriceData(pricePoint));
        volumeSeries.update(toVolumeData(pricePoint));
      }
    } else {
      priceSeries.setData(pricePoints.map(toPriceData));
      volumeSeries.setData(pricePoints.map(toVolumeData));
      chartParts.chart.timeScale().fitContent();
    }
    chartParts.renderedPoints = pricePoints;

    const hasVolume = pricePoints.some(({ volume }) => volume !== null);
    priceSeries.priceScale().applyOptions({
      scaleMargins: hasVolume
        ? PRICE_MARGINS_WITH_VOLUME
        : PRICE_MARGINS_WITHOUT_VOLUME,
    });
  }, [pricePoints]);

  useEffect(() => {
    const chartParts = chartPartsRef.current;
    if (!chartParts) {
      return;
    }
    const chartedTimes = new Set(pricePoints.map(({ time }) => time));
    chartParts.markers.setMarkers(
      anomalies
        .filter(({ occurredAt }) => chartedTimes.has(occurredAt))
        .map(toMarker),
    );
  }, [anomalies, pricePoints, theme]);

  useEffect(() => {
    const chartParts = chartPartsRef.current;
    if (!chartParts) {
      return;
    }
    const previousCloseLine = chartParts.priceSeries.createPriceLine({
      price: previousClose,
      color: readThemeColor('--color-text-subtle'),
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'Prev close',
    });
    return () => {
      if (chartPartsRef.current === chartParts) {
        chartParts.priceSeries.removePriceLine(previousCloseLine);
      }
    };
  }, [previousClose, theme]);

  function resetView() {
    const chartParts = chartPartsRef.current;
    if (!chartParts) {
      return;
    }
    chartParts.chart.timeScale().fitContent();
    chartParts.priceSeries.priceScale().applyOptions({ autoScale: true });
    setIsViewAdjusted(false);
  }

  return (
    <div className={styles.chartFrame}>
      <div ref={containerRef} className={styles.chart} />
      {isViewAdjusted && (
        <button
          type="button"
          className={styles.resetButton}
          onClick={resetView}
        >
          <RotateCcw size={14} aria-hidden="true" />
          Reset view
        </button>
      )}
    </div>
  );
}
