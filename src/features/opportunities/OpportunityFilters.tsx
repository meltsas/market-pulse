import { Search } from 'lucide-react';
import { SegmentedControl } from '../../components/SegmentedControl.tsx';
import {
  assetClassFilterLabel,
  biasFilterLabel,
  sortKeyLabel,
} from './opportunityLabels.ts';
import styles from './OpportunityFilters.module.scss';
import {
  assetClassFilters,
  biasFilters,
  opportunitySortKeys,
  type OpportunityFilters as Filters,
  type OpportunitySort,
  type SortOrder,
} from './opportunityQuery.ts';

interface OpportunityFiltersProps {
  filters: Filters;
  sort: OpportunitySort;
  onFiltersChange: (filters: Filters) => void;
  onSortChange: (sort: OpportunitySort) => void;
}

const sortOrderLabel: Record<SortOrder, string> = {
  desc: 'high to low',
  asc: 'low to high',
};

export function OpportunityFilters({
  filters,
  sort,
  onFiltersChange,
  onSortChange,
}: OpportunityFiltersProps) {
  return (
    <div className={styles.toolbar}>
      <label className={styles.search}>
        <Search size={16} aria-hidden="true" className={styles.searchIcon} />
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Search by name or symbol"
          aria-label="Search instruments"
          value={filters.searchText}
          onChange={(event) => {
            onFiltersChange({ ...filters, searchText: event.target.value });
          }}
        />
      </label>
      <SegmentedControl
        name="asset-class-filter"
        legend="Asset class"
        options={assetClassFilters}
        value={filters.assetClass}
        getLabel={(assetClass) => assetClassFilterLabel[assetClass]}
        onChange={(assetClass) => {
          onFiltersChange({ ...filters, assetClass });
        }}
      />
      <SegmentedControl
        name="bias-filter"
        legend="Bias"
        options={biasFilters}
        value={filters.bias}
        getLabel={(bias) => biasFilterLabel[bias]}
        onChange={(bias) => {
          onFiltersChange({ ...filters, bias });
        }}
      />
      <label className={styles.sortSelect}>
        <span className={styles.sortLabel}>Sort by</span>
        <select
          value={`${sort.key}:${sort.order}`}
          onChange={(event) => {
            const [key, order] = event.target.value.split(':');
            const sortOption = opportunitySortKeys.find(
              (sortKey) => sortKey === key,
            );
            if (sortOption && (order === 'asc' || order === 'desc')) {
              onSortChange({ key: sortOption, order });
            }
          }}
        >
          {opportunitySortKeys.flatMap((key) =>
            (['desc', 'asc'] as const).map((order) => (
              <option key={`${key}:${order}`} value={`${key}:${order}`}>
                {`${sortKeyLabel[key]}, ${sortOrderLabel[order]}`}
              </option>
            )),
          )}
        </select>
      </label>
    </div>
  );
}
