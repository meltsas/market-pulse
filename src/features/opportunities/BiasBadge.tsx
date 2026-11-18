import { Scale, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import type { Bias } from '../../contracts/opportunities.ts';
import styles from './BiasBadge.module.scss';
import { biasLabel } from './opportunityLabels.ts';

interface BiasBadgeProps {
  bias: Bias;
  size?: 'small' | 'large';
}

const biasIcon: Record<Bias, LucideIcon> = {
  long: TrendingUp,
  short: TrendingDown,
  mixed: Scale,
};

export function BiasBadge({ bias, size = 'small' }: BiasBadgeProps) {
  const Icon = biasIcon[bias];
  return (
    <span className={styles.badge} data-bias={bias} data-size={size}>
      <Icon size={size === 'large' ? 16 : 13} aria-hidden="true" />
      {biasLabel[bias]}
    </span>
  );
}
