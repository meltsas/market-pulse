import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { opportunityDetailPath } from '../../app/routePaths.ts';
import type { Opportunity } from '../../contracts/opportunities.ts';
import {
  formatPrice,
  formatRatio,
  formatSignedMetricPercent,
  formatSignedPoints,
} from '../../formatting/marketFormat.ts';
import { WatchToggleButton } from '../watchlist/WatchToggleButton.tsx';
import { BiasBadge } from './BiasBadge.tsx';
import { sortKeyLabel } from './opportunityLabels.ts';
import type {
  OpportunitySort,
  OpportunitySortKey,
} from './opportunityQuery.ts';
import styles from './OpportunityTable.module.scss';

interface OpportunityTableProps {
  caption: string;
  opportunities: readonly Opportunity[];
  sort: OpportunitySort;
  onSortChange: (sort: OpportunitySort) => void;
}

type Tone = 'positive' | 'negative' | 'warning' | 'neutral';

const DRAWDOWN_WARNING_PERCENT = 20;

const metricColumns: readonly OpportunitySortKey[] = [
  'price',
  'trend',
  'relativeStrength',
  'drawdown',
  'revenueGrowth',
  'priceToEarnings',
];

function toneOf(value: number): Tone {
  if (value > 0) {
    return 'positive';
  }
  return value < 0 ? 'negative' : 'neutral';
}

function MissingValue() {
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className={styles.visuallyHidden}>Not available</span>
    </>
  );
}

function MetricValue({ children, tone }: { children: ReactNode; tone: Tone }) {
  return (
    <span className={styles.metric} data-tone={tone}>
      {children}
    </span>
  );
}

function renderMetric(opportunity: Opportunity, column: OpportunitySortKey) {
  const { metrics, freshness } = opportunity;
  switch (column) {
    case 'price':
      return formatPrice(opportunity.price, opportunity);
    case 'trend':
      return metrics.priceVs200DayAveragePercent === null ? (
        <MissingValue />
      ) : (
        <MetricValue tone={toneOf(metrics.priceVs200DayAveragePercent)}>
          {formatSignedMetricPercent(metrics.priceVs200DayAveragePercent)}
        </MetricValue>
      );
    case 'relativeStrength':
      return metrics.relativeStrengthPoints === null ? (
        <MissingValue />
      ) : (
        <MetricValue tone={toneOf(metrics.relativeStrengthPoints)}>
          {formatSignedPoints(metrics.relativeStrengthPoints)}
        </MetricValue>
      );
    case 'drawdown':
      return (
        <MetricValue
          tone={
            metrics.drawdownFromHighPercent >= DRAWDOWN_WARNING_PERCENT
              ? 'warning'
              : 'neutral'
          }
        >
          {formatSignedMetricPercent(-metrics.drawdownFromHighPercent)}
        </MetricValue>
      );
    case 'revenueGrowth':
      return metrics.revenueGrowthPercent === null ? (
        <MissingValue />
      ) : (
        <MetricValue tone={toneOf(metrics.revenueGrowthPercent)}>
          {formatSignedMetricPercent(metrics.revenueGrowthPercent)}
        </MetricValue>
      );
    case 'priceToEarnings':
      if (metrics.priceToEarnings !== null) {
        return formatRatio(metrics.priceToEarnings);
      }
      return freshness.earningsFiscalYearEnd === null ? (
        <MissingValue />
      ) : (
        <MetricValue tone="negative">Loss</MetricValue>
      );
    case 'instrument':
    case 'bias':
      return null;
  }
}

interface SortableHeaderProps {
  column: OpportunitySortKey;
  sort: OpportunitySort;
  onSortChange: (sort: OpportunitySort) => void;
  isNumeric?: boolean;
}

function nextSortOrder(column: OpportunitySortKey, sort: OpportunitySort) {
  if (sort.key === column) {
    return sort.order === 'desc' ? 'asc' : 'desc';
  }
  // Names read best A to Z; for metrics the largest values are usually the interesting ones.
  return column === 'instrument' ? 'asc' : 'desc';
}

function SortableHeader({
  column,
  sort,
  onSortChange,
  isNumeric = false,
}: SortableHeaderProps) {
  const isActive = sort.key === column;
  let SortIcon = ArrowUpDown;
  if (isActive) {
    SortIcon = sort.order === 'asc' ? ArrowUp : ArrowDown;
  }
  let ariaSort: 'ascending' | 'descending' | undefined;
  if (isActive) {
    ariaSort = sort.order === 'asc' ? 'ascending' : 'descending';
  }

  return (
    <th
      scope="col"
      className={isNumeric ? styles.numericHeader : undefined}
      aria-sort={ariaSort}
    >
      <button
        type="button"
        className={styles.sortButton}
        data-active={isActive}
        onClick={() => {
          onSortChange({ key: column, order: nextSortOrder(column, sort) });
        }}
      >
        {sortKeyLabel[column]}
        <SortIcon size={14} aria-hidden="true" />
      </button>
    </th>
  );
}

export function OpportunityTable({
  caption,
  opportunities,
  sort,
  onSortChange,
}: OpportunityTableProps) {
  return (
    <div className={styles.tableFrame}>
      <table className={styles.table}>
        <caption className={styles.visuallyHidden}>{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className={styles.watchHeader}>
              <span className={styles.visuallyHidden}>Watchlist</span>
            </th>
            <SortableHeader
              column="instrument"
              sort={sort}
              onSortChange={onSortChange}
            />
            <SortableHeader
              column="bias"
              sort={sort}
              onSortChange={onSortChange}
            />
            {metricColumns.map((column) => (
              <SortableHeader
                key={column}
                column={column}
                sort={sort}
                onSortChange={onSortChange}
                isNumeric
              />
            ))}
            <th scope="col" className={styles.openHeader}>
              <span className={styles.visuallyHidden}>Details</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {opportunities.map((opportunity) => (
            <tr key={opportunity.symbol} className={styles.row}>
              <td className={styles.watchCell}>
                <WatchToggleButton symbol={opportunity.symbol} />
              </td>
              <th scope="row" className={styles.instrumentCell}>
                <Link
                  to={opportunityDetailPath(opportunity.symbol)}
                  className={styles.instrumentLink}
                >
                  <span className={styles.symbol}>{opportunity.symbol}</span>{' '}
                  <span className={styles.name}>{opportunity.name}</span>
                </Link>
              </th>
              <td className={styles.biasCell} data-label={sortKeyLabel.bias}>
                <BiasBadge bias={opportunity.bias} />
              </td>
              {metricColumns.map((column) => (
                <td
                  key={column}
                  className={styles.metricCell}
                  data-label={sortKeyLabel[column]}
                >
                  {renderMetric(opportunity, column)}
                </td>
              ))}
              <td className={styles.openCell} aria-hidden="true">
                <ChevronRight size={16} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
