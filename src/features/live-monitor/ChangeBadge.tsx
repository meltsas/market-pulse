import { TrendingDown, TrendingUp } from 'lucide-react';
import { formatPercentChange } from '../../formatting/marketFormat.ts';
import styles from './ChangeBadge.module.scss';

interface ChangeBadgeProps {
  changePercent: number;
  size?: 'small' | 'large';
}

export function ChangeBadge({
  changePercent,
  size = 'small',
}: ChangeBadgeProps) {
  const isUp = changePercent >= 0;
  const Icon = isUp ? TrendingUp : TrendingDown;
  return (
    <span
      className={styles.badge}
      data-direction={isUp ? 'up' : 'down'}
      data-size={size}
    >
      <Icon size={size === 'large' ? 16 : 13} aria-hidden="true" />
      {formatPercentChange(changePercent)}
    </span>
  );
}
